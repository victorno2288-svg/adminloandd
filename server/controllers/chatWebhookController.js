const db = require('../config/db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { scanDeedImage, downloadAndScanDeed } = require('../utils/ocrDeed');
const { scanDocumentWithGemini, downloadAndScanDocument, buildDocNote } = require('../utils/ocrDocument');
const { notifyStatusChange } = require('./notificationController');

// ============================================================
// OCR DEED HELPERS
// ============================================================

/**
 * แปลงข้อความประเภทโฉนดจาก Gemini → code ที่ใช้ในฐานข้อมูล
 * Gemini อาจตอบ: "โฉนดที่ดิน", "น.ส.4จ", "น.ส.3ก", "ส.ป.ก." ฯลฯ
 */
function mapDeedType(textFromGemini) {
  if (!textFromGemini) return null;
  const t = textFromGemini.toLowerCase().replace(/\s/g, '');
  if (t.includes('น.ส.4ก') || t.includes('นส.4ก') || t.includes('ns4k')) return 'ns4k';
  if (t.includes('น.ส.4') || t.includes('นส.4')  || t.includes('ns4')
    || t.includes('โฉนด') || t.includes('chanote'))                       return 'chanote';
  if (t.includes('น.ส.3ก') || t.includes('นส.3ก') || t.includes('ns3k')) return 'ns3k';
  if (t.includes('น.ส.3') || t.includes('นส.3')  || t.includes('ns3'))   return 'ns3';
  if (t.includes('ส.ป.ก') || t.includes('สปก')   || t.includes('spk'))   return 'spk';
  return null; // ไม่รู้จัก → ไม่อัพเดท
}

/**
 * อัพเดทข้อมูลโฉนดลงใน loan_requests + chat_conversations
 * แล้ว emit deed_ocr_result (พร้อม updated_fields) กลับ admin
 * ใช้ COALESCE เพื่อไม่ทับข้อมูลที่มีอยู่แล้ว
 */
function applyDeedDataToLoanRequest(conv, deedData, io, platform, callback) {
  const label = platform === 'facebook' ? 'Facebook' : 'LINE';

  // --- อัพเดท chat_conversations ---
  const convUpdates = [];
  const convParams  = [];
  if (deedData.province) {
    convUpdates.push('location_hint = COALESCE(location_hint, ?)');
    convParams.push(deedData.province);
  }
  if (convUpdates.length > 0) {
    convParams.push(conv.id);
    db.query(`UPDATE chat_conversations SET ${convUpdates.join(', ')} WHERE id = ?`, convParams, () => {});
  }

  // --- อัพเดท loan_requests ถ้ามีอยู่แล้ว ---
  if (!conv.loan_request_id) {
    // ยังไม่มี loan_request → emit โดยไม่มี loan_request_id
    if (io && deedData.admin_note) {
      io.to('admin_room').emit('deed_ocr_result', {
        conversation_id: conv.id,
        loan_request_id: null,
        deed_data: deedData,
        updated_fields: {},
        message: `🔍 OCR สแกนโฉนด (${label}): ${deedData.admin_note}`
      });
    }
    console.log(`[OCR] conversation #${conv.id} ยังไม่มี loan_request — บันทึกเฉพาะ conversation`);
    if (callback) callback();
    return;
  }

  // สร้าง SET clause อัพเดทเฉพาะฟิลด์ที่ OCR อ่านได้
  const lrUpdates = [];
  const lrParams  = [];
  const updatedFields = {}; // track ว่าอัพเดทฟิลด์อะไรบ้าง (ส่งกลับ frontend)

  const trySet = (col, val) => {
    if (!val) return;
    lrUpdates.push(`${col} = COALESCE(${col}, ?)`);
    lrParams.push(val);
    updatedFields[col] = val;
  };

  trySet('province',    deedData.province);
  trySet('district',    deedData.amphoe);       // อำเภอ
  trySet('subdistrict', deedData.tambon);       // ตำบล
  trySet('deed_number', deedData.deed_number);
  trySet('land_area',   deedData.land_area);

  // deed_type ต้อง map text → code ก่อน
  const deedTypeCode = mapDeedType(deedData.deed_type);
  if (deedTypeCode) {
    lrUpdates.push('deed_type = COALESCE(deed_type, ?)');
    lrParams.push(deedTypeCode);
    updatedFields.deed_type = deedTypeCode;
  }

  // เพิ่ม admin_note เป็น append (ไม่ใช้ COALESCE เพราะต้อง concat)
  if (deedData.admin_note) {
    lrUpdates.push("admin_note = CONCAT(COALESCE(admin_note,''), ?)");
    lrParams.push('\n' + deedData.admin_note);
  }

  if (lrUpdates.length === 0) {
    if (callback) callback();
    return;
  }

  lrParams.push(conv.loan_request_id);
  db.query(
    `UPDATE loan_requests SET ${lrUpdates.join(', ')} WHERE id = ?`,
    lrParams,
    (err) => {
      if (err) console.log('[OCR] loan_request update error:', err.message);
      else console.log(`[OCR] อัพเดท loan_request #${conv.loan_request_id} สำเร็จ:`, JSON.stringify(updatedFields));

      // emit กลับ admin พร้อม updated_fields เพื่อ frontend อัพเดท UI ได้ทันที
      if (io && deedData.admin_note) {
        io.to('admin_room').emit('deed_ocr_result', {
          conversation_id: conv.id,
          loan_request_id: conv.loan_request_id,
          deed_data: deedData,
          updated_fields: updatedFields,
          message: `🔍 OCR สแกนโฉนด (${label}): ${deedData.admin_note}`
        });
      }
      if (callback) callback();
    }
  );
}

// ============================================================
// applyDocumentDataToLoanRequest — อัพเดทข้อมูลลูกหนี้จากเอกสารทั่วไป
// (บัตรประชาชน, ทะเบียนบ้าน, สลิปเงินเดือน, statement ฯลฯ)
// ============================================================
function applyDocumentDataToLoanRequest(conv, docData, io, label) {
  if (!conv || !docData || !conv.loan_request_id) return;

  const lrUpdates = [];
  const lrParams  = [];
  const updatedFields = {};

  const trySet = (col, val) => {
    if (!val) return;
    lrUpdates.push(`${col} = COALESCE(${col}, ?)`);
    lrParams.push(val);
    updatedFields[col] = val;
  };

  // ข้อมูลลูกหนี้
  trySet('contact_name',   docData.full_name);
  trySet('occupation',     docData.occupation);
  trySet('monthly_income', docData.monthly_income);
  // ที่อยู่
  trySet('province',       docData.province);
  trySet('district',       docData.amphoe);
  trySet('subdistrict',    docData.tambon);
  // ข้อมูลโฉนด (ถ้า doc_type === 'deed')
  trySet('deed_number',    docData.deed_number);
  trySet('land_area',      docData.land_area);

  const deedTypeCode = mapDeedType(docData.deed_type);
  if (deedTypeCode) {
    lrUpdates.push('deed_type = COALESCE(deed_type, ?)');
    lrParams.push(deedTypeCode);
    updatedFields.deed_type = deedTypeCode;
  }

  // append admin_note
  const note = buildDocNote(docData);
  if (note) {
    lrUpdates.push("admin_note = CONCAT(COALESCE(admin_note,''), ?)");
    lrParams.push('\n' + note);
  }

  if (lrUpdates.length === 0) return;

  lrParams.push(conv.loan_request_id);
  db.query(
    `UPDATE loan_requests SET ${lrUpdates.join(', ')} WHERE id = ?`,
    lrParams,
    (err) => {
      if (err) console.log('[OCR-Doc] loan_request update error:', err.message);
      else console.log(`[OCR-Doc] อัพเดท loan_request #${conv.loan_request_id}:`, JSON.stringify(updatedFields));

      if (io) {
        io.to('admin_room').emit('document_ocr_result', {
          conversation_id:  conv.id,
          loan_request_id:  conv.loan_request_id,
          doc_type:         docData.doc_type,
          doc_data:         docData,
          updated_fields:   updatedFields,
          message:          `🔍 OCR สแกนเอกสาร (${label}): ${note || docData.doc_type}`
        });
      }
    }
  );
}

// ========== Helper: สร้างรหัส sequential (reuse logic จาก salesController) ==========
function generateSequentialCode(table, column, prefix, digits, callback) {
  const sql = `SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`;
  db.query(sql, [prefix + '%'], (err, rows) => {
    if (err) return callback(err, null);
    let nextNum = 1;
    if (rows.length > 0 && rows[0][column]) {
      const current = rows[0][column].replace(prefix, '');
      const num = parseInt(current, 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const code = prefix + String(nextNum).padStart(digits, '0');
    callback(null, code);
  });
}

// ============================================
// Helper: Auto-create loan_request จากข้อมูลแชท
// เมื่อมี customer_name + customer_phone ครบ → สร้างลูกหนี้อัตโนมัติ
// ============================================
function autoCreateLoanRequest(conversationId, io) {
  // 1) ดึงข้อมูล conversation
  db.query('SELECT * FROM chat_conversations WHERE id = ?', [conversationId], (err, rows) => {
    if (err || rows.length === 0) return;
    const conv = rows[0];

    // 2) ตรวจเงื่อนไข
    if (conv.loan_request_id) return; // สร้างแล้ว
    if (!conv.customer_name || !conv.customer_phone) return; // ข้อมูลยังไม่ครบ

    // 3) ตรวจ duplicate — เช็คเบอร์โทรซ้ำใน loan_requests
    db.query('SELECT id, debtor_code FROM loan_requests WHERE contact_phone = ? LIMIT 1', [conv.customer_phone], (errDup, dupRows) => {
      if (errDup) return console.log('autoCreateLoanRequest duplicate check error:', errDup.message);

      if (dupRows && dupRows.length > 0) {
        // มีลูกหนี้อยู่แล้ว → เชื่อม loan_request_id โดยไม่สร้างใหม่
        const existingId = dupRows[0].id;
        db.query('UPDATE chat_conversations SET loan_request_id = ? WHERE id = ?', [existingId, conversationId], () => {});
        console.log(`🔗 Linked conv #${conversationId} → existing loan_request #${existingId} (${dupRows[0].debtor_code})`);
        if (io) {
          io.to('admin_room').emit('loan_request_linked', {
            conversation_id: conversationId,
            loan_request_id: existingId,
            debtor_code: dupRows[0].debtor_code,
            message: `ลูกค้าจากแชทเชื่อมกับลูกหนี้ ${dupRows[0].debtor_code} ที่มีอยู่แล้ว`
          });
        }
        return;
      }

      // 4) สร้าง debtor_code ใหม่
      generateSequentialCode('loan_requests', 'debtor_code', 'LDD', 4, (errCode, debtor_code) => {
        if (errCode) return console.log('autoCreateLoanRequest code gen error:', errCode.message);

        // 5) Map ข้อมูลจาก conversation → loan_requests
        const source = conv.platform === 'line' ? 'LINE แชท' : conv.platform === 'facebook' ? 'Facebook แชท' : 'แชท';
        const preferred_contact = conv.platform || 'phone';

        // Map province จาก location_hint
        let province = conv.location_hint || null;
        // กทม → กรุงเทพมหานคร, โคราช → นครราชสีมา
        if (province === 'กทม' || province === 'กรุงเทพ') province = 'กรุงเทพมหานคร';
        if (province === 'โคราช') province = 'นครราชสีมา';
        if (province === 'อยุธยา') province = 'พระนครศรีอยุธยา';

        // Build admin_note จากข้อมูลเพิ่มเติม
        const notes = ['สร้างอัตโนมัติจากแชท ' + source];
        if (conv.customer_email) notes.push('อีเมล: ' + conv.customer_email);
        if (conv.agent_name) notes.push('นายหน้า: ' + conv.agent_name + (conv.agent_phone ? ' ' + conv.agent_phone : ''));
        const admin_note = notes.join(' | ');

        // ค้นหา agent_id จากเบอร์นายหน้าที่ตรวจจับได้
        const findAgentAndInsert = (resolvedAgentId) => {
          const sql = `
            INSERT INTO loan_requests
              (debtor_code, source, contact_name, contact_phone, contact_email,
               preferred_contact, property_type, loan_type_detail,
               deed_type, estimated_value, province,
               has_obligation, occupation, monthly_income,
               desired_amount, obligation_amount, contract_years,
               admin_note, agent_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
          `;
          const params = [
            debtor_code, source,
            conv.customer_name, conv.customer_phone, conv.customer_email || null,
            preferred_contact,
            conv.property_type || null, conv.loan_type_detail || null,
            conv.deed_type || null, conv.estimated_value || null, province,
            conv.has_obligation || null, conv.occupation || null, conv.monthly_income || null,
            conv.desired_amount || null, conv.obligation_amount || null, conv.contract_years || null,
            admin_note, resolvedAgentId || null
          ];

          db.query(sql, params, (errInsert, result) => {
            if (errInsert) {
              console.log('autoCreateLoanRequest INSERT error:', errInsert.message);
              return;
            }

            const loanRequestId = result.insertId;

            // 6) เชื่อม chat_conversations.loan_request_id
            db.query('UPDATE chat_conversations SET loan_request_id = ? WHERE id = ?', [loanRequestId, conversationId], () => {});

            console.log(`✅ Auto-created loan_request #${loanRequestId} (${debtor_code}) จากแชท conv #${conversationId}` + (resolvedAgentId ? ` นายหน้า #${resolvedAgentId}` : ''));

            // 7) แจ้ง socket + notification ทุกฝ่าย
            if (io) {
              io.to('admin_room').emit('loan_request_created', {
                conversation_id: conversationId,
                loan_request_id: loanRequestId,
                debtor_code: debtor_code,
                customer_name: conv.customer_name,
                source: source,
                message: `ลูกหนี้ใหม่ ${debtor_code} สร้างอัตโนมัติจาก${source}`
              });
            }

            // 8) แจ้งเตือนทุกฝ่ายผ่าน notification system
            notifyStatusChange(loanRequestId, null, null, 'new_from_chat', io, null,
              (resolvedAgentId ? '(ผ่านนายหน้า)' : ''));
          });
        };

        // ถ้ามีเบอร์นายหน้า → ค้นหาในตาราง agents ก่อน
        if (conv.agent_phone) {
          db.query('SELECT id FROM agents WHERE phone = ? LIMIT 1', [conv.agent_phone], (errA, agentRows) => {
            const agentId = (agentRows && agentRows.length > 0) ? agentRows[0].id : null;
            findAgentAndInsert(agentId);
          });
        } else {
          findAgentAndInsert(null);
        }
      });
    });
  });
}

// ============================================
// Helper: อัพเดท loan_request ด้วยข้อมูลใหม่จากแชท
// เมื่อลูกค้าส่งข้อมูลเพิ่มมา (จังหวัด, ประเภททรัพย์, วงเงิน ฯลฯ)
// จะอัพเดทเฉพาะฟิลด์ที่ยังว่างอยู่ใน loan_request (ไม่ overwrite ข้อมูลที่ฝ่ายขายแก้ไขแล้ว)
// ============================================
function updateLoanRequestFromChat(conversationId, extracted, io) {
  if (!extracted || Object.keys(extracted).length === 0) return;

  // ดึง conversation เพื่อหา loan_request_id
  db.query('SELECT loan_request_id, location_hint FROM chat_conversations WHERE id = ?', [conversationId], (err, rows) => {
    if (err || rows.length === 0 || !rows[0].loan_request_id) return;

    const loanRequestId = rows[0].loan_request_id;

    // Map extracted chat data → loan_request fields
    // ใช้ COALESCE pattern: อัพเดทเฉพาะฟิลด์ที่ยังเป็น NULL ใน loan_request
    const updates = [];
    const params = [];

    // ชื่อจริงจากข้อความ → overwrite ชื่อ LINE display name ใน loan_request ด้วย
    if (extracted.customer_name) {
      updates.push('contact_name = ?');
      params.push(extracted.customer_name);
    }
    if (extracted.property_type) {
      updates.push('property_type = COALESCE(property_type, ?)');
      params.push(extracted.property_type);
    }
    if (extracted.deed_type) {
      updates.push('deed_type = COALESCE(deed_type, ?)');
      params.push(extracted.deed_type);
    }
    if (extracted.loan_type_detail) {
      updates.push('loan_type_detail = COALESCE(loan_type_detail, ?)');
      params.push(extracted.loan_type_detail);
    }
    if (extracted.estimated_value) {
      updates.push('estimated_value = COALESCE(estimated_value, ?)');
      params.push(extracted.estimated_value);
    }
    if (extracted.has_obligation) {
      updates.push('has_obligation = COALESCE(has_obligation, ?)');
      params.push(extracted.has_obligation);
    }
    if (extracted.phone) {
      updates.push('contact_phone = COALESCE(contact_phone, ?)');
      params.push(extracted.phone);
    }
    if (extracted.email) {
      updates.push('contact_email = COALESCE(contact_email, ?)');
      params.push(extracted.email);
    }

    // ข้อมูลผู้กู้ ตาม SOP ข้อ 2.1.6
    if (extracted.occupation) {
      updates.push('occupation = COALESCE(occupation, ?)');
      params.push(extracted.occupation);
    }
    if (extracted.monthly_income) {
      updates.push('monthly_income = COALESCE(monthly_income, ?)');
      params.push(extracted.monthly_income);
    }
    if (extracted.desired_amount) {
      updates.push('desired_amount = COALESCE(desired_amount, ?)');
      params.push(extracted.desired_amount);
    }
    if (extracted.obligation_amount) {
      updates.push('obligation_amount = COALESCE(obligation_amount, ?)');
      params.push(extracted.obligation_amount);
    }
    if (extracted.contract_years) {
      updates.push('contract_years = COALESCE(contract_years, ?)');
      params.push(extracted.contract_years);
    }

    // location_hint → province (ใช้ค่าล่าสุดจาก conversation)
    const locationHint = extracted.location_hint || rows[0].location_hint;
    if (locationHint) {
      let province = locationHint;
      if (province === 'กทม' || province === 'กรุงเทพ') province = 'กรุงเทพมหานคร';
      if (province === 'โคราช') province = 'นครราชสีมา';
      if (province === 'อยุธยา') province = 'พระนครศรีอยุธยา';
      updates.push('province = COALESCE(province, ?)');
      params.push(province);
    }

    if (updates.length === 0) return; // ไม่มีอะไรให้อัพเดท

    params.push(loanRequestId);
    const sql = `UPDATE loan_requests SET ${updates.join(', ')} WHERE id = ?`;

    db.query(sql, params, (errUpdate) => {
      if (errUpdate) {
        console.log('updateLoanRequestFromChat error:', errUpdate.message);
        return;
      }
      console.log(`📝 Updated loan_request #${loanRequestId} จากแชท conv #${conversationId} (${updates.length} fields)`);

      // แจ้ง socket ว่าข้อมูลลูกหนี้อัพเดท
      if (io) {
        io.to('admin_room').emit('loan_request_updated', {
          conversation_id: conversationId,
          loan_request_id: loanRequestId,
          updated_fields: updates.length,
          message: `อัพเดทข้อมูลลูกหนี้จากแชทอัตโนมัติ (${updates.length} รายการ)`
        });
      }
    });
  });
}

// ============================================
// Helper: ดึง platform credentials จาก DB
// ============================================
function getPlatformConfig(platform, callback) {
  db.query(
    'SELECT * FROM chat_platforms WHERE platform_name = ? AND is_active = 1 LIMIT 1',
    [platform],
    (err, rows) => {
      if (err || rows.length === 0) return callback(err || new Error('Platform not configured'));
      callback(null, rows[0]);
    }
  );
}

// ============================================
// Helper: Parse ข้อมูลลูกค้าจากข้อความ
// รวม SOP keyword detection ตาม SOP ฝ่ายขาย LOANDD (ฉบับสมบูรณ์)
// ============================================
function extractCustomerInfo(text) {
  if (!text) return {};
  // ข้ามข้อความ system เช่น [รูปภาพ] [วิดีโอ] [สติกเกอร์]
  if (/^\[.+\]$/.test(text.trim())) return {};
  const info = {};

  // --- เบอร์โทรไทย ---
  const phoneMatch = text.match(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch) info.phone = phoneMatch[0].replace(/[-.\s]/g, '');

  // --- อีเมล ---
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) info.email = emailMatch[0];

  // ============================================================
  // ประเภทอสังหาริมทรัพย์ (SOP หมวด 1: ทรัพย์ที่รับพิจารณา)
  // รับ: บ้านเดี่ยว, ทาวน์เฮ้าส์/ทาวน์โฮม, คอนโด, อาคารพาณิชย์, ที่ดินเปล่า
  // ไม่รับ: ที่สวน/ไร่/นา, ที่ตาบอด, เกษตรกรรม, พื้นที่น้ำ/บ่อ
  // ============================================================
  const lowerText = text.toLowerCase();

  // ทรัพย์ที่ "ไม่รับ" ตาม SOP → flag ineligible_property เพื่อแจ้งเตือนเซลล์
  if (/ที่สวน|สวน(?:ยาง|ปาล์ม|มะพร้าว|ไม้ยืนต้น)|ที่ไร่|ไร่(?:อ้อย|ข้าวโพด|มันสำปะหลัง)|ที่นา|นาข้าว|ที่เกษตร|เกษตรกรรม|ที่ดินเกษตร|พื้นที่การเกษตร|บ่อปลา|บ่อกุ้ง|บ่อน้ำ|ที่ดินในเขตชลประทาน|ที่ตาบอด|ที่ดินตาบอด|ออกถนนไม่ได้|ไม่มีถนนเข้า/.test(text)) {
    info.ineligible_property = true;
    info.ineligible_reason = 'ทรัพย์ไม่ผ่านเกณฑ์ SOP (ที่เกษตร/ตาบอด/บ่อ)';
  }

  if (/บ้านเดี่ยว|บ้านเดียว|house|single\s*house|detached/.test(text)) {
    info.property_type = 'บ้านเดี่ยว';
  } else if (/ทาวน์เฮ้าส์|ทาวน์เฮาส์|ทาวน์โฮม|townhouse|town\s*home|ทาวน์/.test(lowerText)) {
    info.property_type = 'ทาวน์เฮ้าส์';
  } else if (/บ้านแฝด|semi.?detached|twin\s*house/.test(lowerText)) {
    info.property_type = 'บ้านแฝด';
  } else if (/คอนโด|ห้องชุด|condo|condominium/.test(lowerText)) {
    info.property_type = 'คอนโด';
  } else if (/อาคารพาณิชย์|ตึกแถว|shophouse|อาคารสำนักงาน|ออฟฟิศ|อาคารชุด/.test(text)) {
    info.property_type = 'อาคารพาณิชย์';
  } else if (/ที่ดินเปล่า|ที่ดิน(?!เกษตร|ใน)|land(?!\s*farm)/.test(text)) {
    info.property_type = 'ที่ดินเปล่า';
  } else if (/บ้านพัก|วิลล่า|villa|resort/.test(lowerText)) {
    info.property_type = 'บ้านเดี่ยว'; // จัดเป็นบ้านเดี่ยว
  } else if (/หมู่บ้าน|หอพัก|อพาร์ทเม้นท์|อพาร์ตเมนต์|apartment/.test(lowerText)) {
    info.property_type = 'หมู่บ้าน/หอพัก';
  }

  // ============================================================
  // ประเภทเอกสารสิทธิ์ (SOP หมวด 1: เอกสารที่รับ/ไม่รับ)
  // รับ: โฉนด (น.ส.4จ), น.ส.4ก
  // ไม่รับ: น.ส.3, น.ส.3ก, ส.ป.ก., สค.1
  // ============================================================
  if (/น\.ส\.4ก|นส\.?4ก|นส4ก|ns4k|น\.ส\.4 ก/.test(text)) {
    info.deed_type = 'ns4k';
  } else if (/โฉนด|ครุฑแดง|น\.ส\.4จ|นส\.?4จ|นส4จ|นส\.?4(?!ก)|น\.ส\.4(?!ก)|chanote/.test(text)) {
    info.deed_type = 'chanote';
  } else if (/น\.ส\.3ก|นส\.?3ก|นส3ก|ns3k/.test(text)) {
    info.deed_type = 'ns3k';
    if (!info.ineligible_property) {
      info.ineligible_property = true;
      info.ineligible_reason = 'น.ส.3ก ไม่ผ่านเกณฑ์ SOP';
    }
  } else if (/น\.ส\.3(?!ก)|นส\.?3(?!ก)|นส3(?!ก)|ns3(?!k)/.test(text)) {
    info.deed_type = 'ns3';
    if (!info.ineligible_property) {
      info.ineligible_property = true;
      info.ineligible_reason = 'น.ส.3 ไม่ผ่านเกณฑ์ SOP';
    }
  } else if (/สปก|spk|ส\.ป\.ก\.?|ที่ดินสปก/.test(text)) {
    info.deed_type = 'spk';
    if (!info.ineligible_property) {
      info.ineligible_property = true;
      info.ineligible_reason = 'ส.ป.ก. ไม่ผ่านเกณฑ์ SOP';
    }
  } else if (/สค\.?1|ภบท\.?5|ใบจอง|ที่ดินมือเปล่า/.test(text)) {
    info.deed_type = 'other';
    if (!info.ineligible_property) {
      info.ineligible_property = true;
      info.ineligible_reason = 'เอกสารสิทธิ์ไม่ผ่านเกณฑ์ SOP';
    }
  }

  // ============================================================
  // ประเภทสินเชื่อ (SOP หมวด 2: ขายฝาก LTV 50-60%, จำนอง LTV 30-40%)
  // ============================================================
  if (/ขายฝาก|selling[\s-]?pledge|ขายฝากที่ดิน|ขายฝากบ้าน/.test(text)) {
    info.loan_type_detail = 'selling_pledge';
  } else if (/จำนอง|mortgage|จำนองบ้าน|จำนองที่ดิน|จำนองคอนโด/.test(text)) {
    info.loan_type_detail = 'mortgage';
  } else if (/รีไฟแนนซ์|refinance|refin|ไฟแนนซ์|refi/.test(lowerText)) {
    info.loan_type_detail = 'mortgage'; // รีไฟแนนซ์ → จำนอง
    info.is_refinance = true;
  }

  // ตรวจ intent "ต้องการกู้/สอบถาม" → ใช้แยก lead quality
  if (/ต้องการกู้|ต้องการเงิน|ต้องการวงเงิน|ขอสินเชื่อ|สนใจสินเชื่อ|ต้องการสินเชื่อ|อยากกู้|กู้เงิน|ขอกู้/.test(text)) {
    info.intent = 'loan_inquiry';
  } else if (/ดอกเบี้ยเท่าไหร่|ดอกเบี้ยกี่|อัตราดอกเบี้ย|ดอก(?:เบี้ย)?เท่าไร|interest rate/.test(lowerText)) {
    info.intent = 'ask_interest';
  } else if (/ค่าธรรมเนียม|ค่าใช้จ่าย|ค่าโอน|ค่าจดจำนอง|ค่าดำเนินการ|ค่าประเมิน|fee/.test(lowerText)) {
    info.intent = 'ask_fee';
  } else if (/ต่อสัญญา|ต่ออายุสัญญา|ต่ออายุ|ขยายสัญญา|ขยายระยะเวลา/.test(text)) {
    info.intent = 'contract_renewal';
  } else if (/ประเมิน(?:ราคา)?|appraise|appraisal|ราคาประเมิน|ราคาทรัพย์|มูลค่าทรัพย์/.test(lowerText)) {
    info.intent = 'ask_appraisal';
  }

  // ============================================================
  // อาชีพ (SOP ข้อ 2.1.6: ข้อมูลผู้กู้ — อาชีพและรายได้ต่อเดือน)
  // ============================================================
  const OCCUPATIONS = /พนักงานบริษัท|พนักงานเอกชน|พนักงาน|ข้าราชการ|รับราชการ|กรมทาง|ทหาร|ตำรวจ|ครู|อาจารย์|หมอ|แพทย์|พยาบาล|วิศวกร|นักบัญชี|ทนายความ|ทนาย|สถาปนิก|โปรแกรมเมอร์|นักพัฒนา|ค้าขาย|ขายของ|แม่ค้า|พ่อค้า|ธุรกิจส่วนตัว|ฟรีแลนซ์|freelance|เกษตรกร|ชาวนา|ชาวไร่|ชาวสวน|รับจ้าง|รับจ้างทั่วไป|เจ้าของกิจการ|เจ้าของธุรกิจ|ประกอบธุรกิจ|ส่วนตัว|ทำงานบริษัท|พนง\.|ลูกจ้าง|รัฐวิสาหกิจ|ช่างยนต์|ช่างไฟ|ช่างประปา|ช่างซ่อม|ช่างก่อสร้าง|ช่าง|คนขับ|ขับรถ|ไรเดอร์|rider|grab|แกร็บ|วินมอเตอร์ไซค์|นายหน้าอสังหา|นายหน้าอสังหาริมทรัพย์|นักลงทุน|investor|เกษียณ|เกษียณอายุ/gi;
  const occupationMatch = text.match(OCCUPATIONS);
  if (occupationMatch) {
    const occLine = text.split(/[\n\r]+/).find(l => OCCUPATIONS.test(l));
    info.occupation = occLine ? occLine.trim() : occupationMatch[0];
  }

  // ============================================================
  // รายได้ต่อเดือน (SOP ข้อ 2.1.6)
  // รูปแบบ: เงินเดือน 30,000 / รายได้ประมาณ 50000 บาท / เดือนละ 25,000
  // ============================================================
  const incomeMatch = text.match(/(?:เงินเดือน|รายได้|income|เดือนละ|ได้เดือนละ|salary|คอม(?:มิชชั่น)?เดือน|รายรับ|รายได้ต่อเดือน)[+\s]*(?:ประมาณ\s*)?(\d[\d,]*)\s*(?:บาท)?/i);
  if (incomeMatch) {
    info.monthly_income = parseFloat(incomeMatch[1].replace(/,/g, ''));
  } else {
    const incomeMatch2 = text.match(/(\d[\d,]+)\s*(?:บาท)?\s*(?:ต่อเดือน|\/เดือน|per.?month)/i);
    if (incomeMatch2) {
      info.monthly_income = parseFloat(incomeMatch2[1].replace(/,/g, ''));
    }
  }

  // ============================================================
  // วงเงินที่ต้องการ (SOP ข้อ 2.1.6: วัตถุประสงค์)
  // รูปแบบ: ต้องการ 3 ล้าน / ขอวงเงิน 1,500,000 บาท / อยากได้ 5 แสน
  // ============================================================
  const desiredMatch = text.match(/(?:ต้องการ(?:วงเงิน)?|อยากได้|ขอ(?:วงเงิน)?|วงเงิน(?:ที่ต้องการ)?|ต้องการกู้|ขอกู้|กู้)\s*(?:ประมาณ\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:บาท|ล้าน|แสน)/i);
  if (desiredMatch) {
    let val = parseFloat(desiredMatch[1].replace(/,/g, ''));
    if (/ล้าน/.test(desiredMatch[0])) val *= 1000000;
    else if (/แสน/.test(desiredMatch[0])) val *= 100000;
    info.desired_amount = val;
  }

  // ============================================================
  // ราคาประเมิน / มูลค่าทรัพย์ (SOP: ราคาทรัพย์)
  // รูปแบบ: 1,500,000 บาท / 1.5 ล้าน / ราคาประเมิน 3 ล้าน
  // ============================================================
  if (!info.desired_amount || !(/ต้องการ|อยากได้|ขอ|วงเงิน|กู้/.test(text))) {
    // ดักจับ "ราคาประเมิน X ล้าน" / "ราคาทรัพย์ X บาท" ก่อน
    const appraisalMatch = text.match(/(?:ราคาประเมิน|ราคาทรัพย์|ราคา(?:บ้าน|ที่ดิน|คอนโด)|มูลค่า(?:ทรัพย์|ที่ดิน)?|ประเมินได้)\s*(?:ประมาณ\s*)?(\d+(?:\.\d+)?)\s*(?:ล้าน|แสน|บาท)/i);
    if (appraisalMatch) {
      let apVal = parseFloat(appraisalMatch[1].replace(/,/g, ''));
      if (/ล้าน/.test(appraisalMatch[0])) apVal *= 1000000;
      else if (/แสน/.test(appraisalMatch[0])) apVal *= 100000;
      info.estimated_value = apVal;
    } else {
      const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*ล้าน/);
      const thousandMatch = text.match(/(\d+(?:\.\d+)?)\s*แสน/);
      const rawMatch = text.match(/(\d[\d,]{4,})\s*บาท/);
      if (millionMatch) {
        let val = parseFloat(millionMatch[1]) * 1000000;
        if (thousandMatch) val += parseFloat(thousandMatch[1]) * 100000;
        if (!info.desired_amount) info.estimated_value = val;
      } else if (thousandMatch) {
        if (!info.desired_amount) info.estimated_value = parseFloat(thousandMatch[1]) * 100000;
      } else if (rawMatch) {
        const num = parseFloat(rawMatch[1].replace(/,/g, ''));
        if (num >= 100000 && !info.desired_amount) info.estimated_value = num;
      }
    }
  }

  // ============================================================
  // ตรวจจับนายหน้า/ตัวแทน (SOP: บทบาทนายหน้าในกระบวนการ)
  // Keywords: นายหน้า, ตัวแทน, โบรกเกอร์, ส่งลูกค้า, ฝากถาม ฯลฯ
  // ============================================================
  const AGENT_PATTERN = /(?:ผม|หนู|ดิฉัน|ฉัน|เรา)?(?:เป็น|คือ)?\s*(?:นายหน้า|ตัวแทน|โบรก(?:เกอร์)?|broker|agent|มิดเดิ้ลแมน|middle\s*man|นายหน้าอสังหา|ตัวแทนขาย)|(?:แนะนำ|ส่ง|พา|พามา|แนะนำมา|ส่งมาให้|นำ)(?:ลูกค้า|ลูกหนี้|แขก)|(?:ฝากถาม|ฝากสอบถาม|ถามแทน|ติดต่อแทน|แทนลูกค้า|แทนเจ้าของ|มาแทน|ฝากเคส|ส่งเคส)|(?:ลูกค้าของ|ลูกค้าผม|ลูกค้าหนู|ลูกค้าดิฉัน|เคสนี้|เคสลูกค้า)/gi;

  if (AGENT_PATTERN.test(text)) {
    info.is_agent = true;

    const agentNameMatch = text.match(/(?:ผม|หนู|ดิฉัน|ฉัน|ชื่อ)\s+([ก-๙a-zA-Z]{2,}(?:\s+[ก-๙a-zA-Z]{2,})?)/);
    if (agentNameMatch) info.agent_name = agentNameMatch[1].trim();

    const agentPhoneLine = text.split(/[\n\r]+/).find(l =>
      /(?:เบอร์|โทร|ติดต่อ|ผม|หนู|ดิฉัน|ตัวแทน|นายหน้า)/i.test(l) &&
      /(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(l)
    );
    if (agentPhoneLine) {
      const agentPhoneMatch = agentPhoneLine.match(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
      if (agentPhoneMatch) info.agent_phone = agentPhoneMatch[0].replace(/[-.\s]/g, '');
    }

    const allPhones = [...text.matchAll(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g)]
      .map(m => m[0].replace(/[-.\s]/g, ''));
    if (allPhones.length >= 2 && !info.agent_phone) {
      info.agent_phone = allPhones[0];
      info.phone = allPhones[1];
    }
  }

  // ============================================================
  // ภาระหนี้ / ยอดสินเชื่อคงเหลือ (SOP ข้อ 2.1.6)
  // Keywords: ติดจำนอง, ยอดค้าง, ผ่อนอยู่, ภาระสินเชื่อ ฯลฯ
  // ============================================================
  if (/ติดจำนอง|มีภาระ|ยังค้าง|ค้างอยู่|ผ่อนอยู่|ยอดหนี้|หนี้เดิม|ปิดหนี้|ภาระสินเชื่อ|ยอดค้างชำระ|หนี้คงเหลือ|ยังเหลืออยู่|ค้างจ่าย|ยังผ่อน|กำลังผ่อน|ติดสินเชื่อ|สินเชื่อคงค้าง/.test(text)) {
    info.has_obligation = 'yes';
    const debtMatch = text.match(/(?:หนี้|ภาระ|ค้าง|ผ่อน|ยอด|สินเชื่อ(?:คงเหลือ)?)[^\d]*(\d[\d,]{3,})\s*(?:บาท)?/i);
    if (debtMatch) {
      info.obligation_amount = parseFloat(debtMatch[1].replace(/,/g, ''));
    }
  } else if (/ไม่มีภาระ|ไม่ติด|ปลดภาระ|ชำระหมดแล้ว|หมดภาระ|ไม่มีหนี้|ปลอดภาระ|ไม่มีสินเชื่อ/.test(text)) {
    info.has_obligation = 'no';
  }

  // ============================================================
  // ระยะเวลาสัญญา (SOP ข้อ 2.1.6: ระยะเวลาที่ต้องการ)
  // รูปแบบ: 3 ปี / สัญญา 2 ปี / 6 เดือน
  // ============================================================
  const durationYearMatch = text.match(/(?:สัญญา|ระยะเวลา|ระยะ|กู้)?\s*(\d+)\s*(?:ปี|year)/i);
  if (durationYearMatch) {
    info.contract_years = parseInt(durationYearMatch[1]);
  } else {
    // แปลงเดือน → ปี (6 เดือน = 0.5 ปี, 18 เดือน = 1.5 ปี)
    const durationMonthMatch = text.match(/(\d+)\s*(?:เดือน|month)/i);
    if (durationMonthMatch) {
      info.contract_years = Math.round((parseInt(durationMonthMatch[1]) / 12) * 10) / 10;
    }
  }

  // --- จังหวัด (parse 77 จังหวัด + ปริมณฑล) ---
  const PROVINCES = [
    'กรุงเทพ','กทม','กรุงเทพมหานคร','นนทบุรี','ปทุมธานี','สมุทรปราการ','สมุทรสาคร',
    'นครปฐม','อยุธยา','พระนครศรีอยุธยา','สระบุรี','ชลบุรี','ระยอง','จันทบุรี','ตราด',
    'ฉะเชิงเทรา','ปราจีนบุรี','นครนายก','สระแก้ว','เชียงใหม่','เชียงราย','ลำปาง','ลำพูน',
    'แม่ฮ่องสอน','พะเยา','น่าน','แพร่','อุตรดิตถ์','ตาก','สุโขทัย','กำแพงเพชร','พิษณุโลก',
    'เพชรบูรณ์','พิจิตร','นครสวรรค์','อุทัยธานี','ชัยนาท','สิงห์บุรี','อ่างทอง','ลพบุรี',
    'นครราชสีมา','โคราช','ชัยภูมิ','บุรีรัมย์','สุรินทร์','ศรีสะเกษ','อุบลราชธานี','ยโสธร',
    'อำนาจเจริญ','มุกดาหาร','นครพนม','สกลนคร','กาฬสินธุ์','ขอนแก่น','มหาสารคาม','ร้อยเอ็ด',
    'เลย','หนองบัวลำภู','หนองคาย','อุดรธานี','บึงกาฬ','นราธิวาส','ปัตตานี','ยะลา','สงขลา',
    'สตูล','ตรัง','พัทลุง','นครศรีธรรมราช','กระบี่','ภูเก็ต','พังงา','ระนอง','ชุมพร',
    'สุราษฎร์ธานี','ประจวบคีรีขันธ์','เพชรบุรี','ราชบุรี','สุพรรณบุรี','กาญจนบุรี'
  ];
  for (const prov of PROVINCES) {
    if (text.includes(prov)) {
      info.location_hint = prov;
      break;
    }
  }

  // --- ดึงชื่อลูกค้าจากข้อความ ---
  // ข้อความมักมาในรูปแบบ:
  //   ชื่อ นามสกุล
  //   เบอร์โทร
  //   จำนอง/ขายฝาก
  // หรือ: "ชื่อ นามสกุล 09xxxxxxxx จำนอง"
  // วิธี: ตัดส่วนที่เป็นเบอร์โทร/keyword/อาชีพ ออก แล้วเหลือชื่อ
  const KNOWN_KEYWORDS = /ขายฝาก|จำนอง|mortgage|refinance|selling.?pledge|บ้านเดี่ยว|บ้านเดียว|บ้านแฝด|บ้านพัก|ทาวน์เฮ้าส์|ทาวน์เฮาส์|ทาวน์โฮม|คอนโด|ห้องชุด|อาคารพาณิชย์|ตึกแถว|ที่ดินเปล่า|ที่ดิน|ที่สวน|ที่ไร่|ที่นา|ที่ตาบอด|โฉนด|ครุฑแดง|สปก|น\.ส\.4|น\.ส\.3|ติดจำนอง|มีภาระ|ภาระสินเชื่อ|ไม่มีภาระ|ไม่ติด|สนใจ|ต้องการ|อยากได้|ต้องการกู้|อยากกู้|ขอกู้|กู้เงิน|ดอกเบี้ย|ค่าธรรมเนียม|ราคาประเมิน|ราคาทรัพย์|ต่อสัญญา|รีไฟแนนซ์|ล้าน|แสน|บาท|house|single|condo|townhouse|land|shophouse|villa|หมู่บ้าน|หอพัก|อพาร์ทเม้นท์|ห้องนอน|ห้องน้ำ|ห้องครัว|ชั้น|ตารางเมตร|ตร\.ม|ไร่|งาน|ตารางวา|วา|เนื้อที่|เดือน|year|month/gi;

  // กรองคำทักทาย/คำทั่วไปที่ไม่ใช่ชื่อ
  // ✅ รองรับทศนิยม เช่น 5.7 ปี, 1.5 ปี
  const GREETINGS = /^(สวัสดี|สวัสดีครับ|สวัสดีค่ะ|สวัสดีคะ|หวัดดี|ดีครับ|ดีค่ะ|ดีคะ|hello|hi|hey|ขอบคุณ|ขอบคุณครับ|ขอบคุณค่ะ|ครับ|ค่ะ|คะ|ok|โอเค|ได้ครับ|ได้ค่ะ|ตกลง|ช่วยด้วย|ต้องการ|สนใจ|อยากได้|ได้|ไม่|ใช่|ไม่ใช่|ถูกต้อง|ครึ่งปี.*|.*ปีครับ|.*ปีค่ะ|\d+(?:\.\d+)?\s*ปี.*|\d+\s*เดือน.*|สอบถาม|สอบถามครับ|สอบถามค่ะ|ขอสอบถาม|มีข้อสงสัย|อยากทราบ|ขอทราบ|ต้องการทราบ|รบกวนสอบถาม)$/i;

  // 🚫 คำที่เป็นอาชีพ/รายได้/หนี้ — ห้ามเอาไปเป็นชื่อ
  const OCCUPATION_KEYWORDS = /พนักงานบริษัท|พนักงานเอกชน|พนักงาน|ข้าราชการ|รับราชการ|กรมทาง|ทหาร|ตำรวจ|ครู|อาจารย์|หมอ|แพทย์|พยาบาล|วิศวกร|นักบัญชี|ทนายความ|ทนาย|สถาปนิก|โปรแกรมเมอร์|นักพัฒนา|ค้าขาย|ขายของ|แม่ค้า|พ่อค้า|ธุรกิจส่วนตัว|ฟรีแลนซ์|freelance|เกษตรกร|ชาวนา|ชาวไร่|ชาวสวน|รับจ้าง|รับจ้างทั่วไป|เจ้าของกิจการ|เจ้าของธุรกิจ|ประกอบธุรกิจ|ส่วนตัว|ทำงานบริษัท|พนง\.|ลูกจ้าง|รัฐวิสาหกิจ|ช่างยนต์|ช่างไฟ|ช่างประปา|ช่างซ่อม|ช่างก่อสร้าง|ช่าง|คนขับ|ขับรถ|ไรเดอร์|rider|grab|แกร็บ|วินมอเตอร์ไซค์|นายหน้าอสังหา|นักลงทุน|investor|เกษียณ|เงินเดือน|รายได้|คอมเดือน|คอมมิชชั่น|ปิดหนี้|ผ่อน|หนี้เดิม|ภาระสินเชื่อ|ยอดค้าง|สินเชื่อ/gi;

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length >= 2) {
    // ลองดูทีละบรรทัด → บรรทัดที่ไม่ใช่เบอร์ ไม่ใช่ keyword ไม่ใช่อาชีพ ไม่ใช่ตัวเลขล้วนๆ = ชื่อ
    for (const line of lines) {
      // ข้ามบรรทัดที่มีคำเกี่ยวกับอาชีพ/รายได้
      if (OCCUPATION_KEYWORDS.test(line)) { OCCUPATION_KEYWORDS.lastIndex = 0; continue; }
      OCCUPATION_KEYWORDS.lastIndex = 0;
      // ข้ามบรรทัดที่เป็น numbered list เช่น "1.", "2.", "5. 7 ปี"
      if (/^\d+[.)]\s/.test(line)) continue;
      // ข้ามบรรทัดที่เป็น duration เช่น "3 ปี", "68 เดือน", "5.7 ปี", "1.5 ปีครับ"
      if (/^\d+(?:\.\d+)?\s*(?:ปี|เดือน|year|month)/i.test(line.trim())) continue;
      // ข้ามบรรทัดที่มีตัวเลขเยอะ (วงเงิน/รายได้/เบอร์โทร)
      const digitCount = (line.match(/\d/g) || []).length;
      if (digitCount >= 6) continue; // บรรทัดที่มีตัวเลข >= 6 ตัว → ไม่ใช่ชื่อ

      const cleaned = line.replace(KNOWN_KEYWORDS, '').replace(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '').replace(/\d+/g, '').trim();
      // ถ้าเหลือข้อความภาษาไทย/อังกฤษ >= 2 ตัวอักษร → น่าจะเป็นชื่อ
      if (cleaned.length >= 2 && /[\u0E00-\u0E7Fa-zA-Z]/.test(cleaned) && !GREETINGS.test(cleaned)) {
        let namePart = line
          .replace(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '')
          .replace(KNOWN_KEYWORDS, '')
          .replace(new RegExp(PROVINCES.join('|'), 'g'), '') // ตัดชื่อจังหวัดออก
          .replace(/\s{2,}/g, ' ')
          .trim();
        // ชื่อจริงต้องขึ้นต้นด้วยตัวอักษร ไม่ใช่ตัวเลข
        if (/^\d/.test(namePart)) { continue; }
        info.customer_name = namePart;
        if (info.customer_name.length >= 2 && !GREETINGS.test(info.customer_name)) break;
        else delete info.customer_name;
      }
    }
  } else if (lines.length === 1) {
    // ข้ามถ้าทั้งบรรทัดเป็นอาชีพ/รายได้
    if (!OCCUPATION_KEYWORDS.test(text)) {
      OCCUPATION_KEYWORDS.lastIndex = 0;
      let remaining = text;
      remaining = remaining.replace(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '');
      remaining = remaining.replace(KNOWN_KEYWORDS, '');
      remaining = remaining.replace(new RegExp(PROVINCES.join('|'), 'g'), '');
      remaining = remaining.replace(/\d[\d,.]*\s*/g, '');
      remaining = remaining.replace(/\s{2,}/g, ' ').trim();
      if (remaining.length >= 2 && /[\u0E00-\u0E7Fa-zA-Z]/.test(remaining) && !GREETINGS.test(remaining) && !/^\d/.test(remaining)) {
        info.customer_name = remaining;
      }
    }
    OCCUPATION_KEYWORDS.lastIndex = 0;
  }

  return info;
}

// ============================================
// Helper: Auto-assign เซลล์แบบ Round-Robin (วนรอบจริง)
// เคส1→คนที่1, เคส2→คนที่2, เคส3→คนที่3, เคส4→กลับมาคนที่1
// ข้ามเซลล์ที่ถูกลบหรือ inactive
// ============================================
function autoAssignSales(conversationId, io) {
  // 1) ดึงเซลล์ทุกคนที่ active เรียงตาม id ASC (ลำดับคงที่)
  db.query(
    "SELECT id, username, full_name, nickname FROM admin_users WHERE department = 'sales' AND status = 'active' ORDER BY id ASC",
    (err, salesUsers) => {
      if (err || salesUsers.length === 0) {
        console.log('Auto-assign: ไม่พบเซลล์ที่ active', err ? err.message : '');
        return;
      }

      // 2) ดึง assigned_to ของ conversation ล่าสุดที่ถูก assign (ไม่นับ NULL)
      db.query(
        "SELECT assigned_to FROM chat_conversations WHERE assigned_to IS NOT NULL ORDER BY id DESC LIMIT 1",
        (err2, lastRows) => {
          if (err2) return console.log('Auto-assign query error:', err2.message);

          var lastAssignedId = (lastRows.length > 0) ? lastRows[0].assigned_to : null;

          // 3) หาตำแหน่งของคนล่าสุด แล้ววนไปคนถัดไป
          var lastIndex = -1;
          if (lastAssignedId) {
            for (var i = 0; i < salesUsers.length; i++) {
              if (salesUsers[i].id === lastAssignedId) {
                lastIndex = i;
                break;
              }
            }
          }

          var nextIndex = (lastIndex + 1) % salesUsers.length;
          var salesUser = salesUsers[nextIndex];

          db.query(
            'UPDATE chat_conversations SET assigned_to = ? WHERE id = ?',
            [salesUser.id, conversationId],
            (err3) => {
              if (err3) return console.log('Auto-assign error:', err3.message);

              console.log('🎯 Round-Robin chat assign: conv #' + conversationId + ' → ' + (salesUser.full_name || salesUser.username) + ' (id=' + salesUser.id + ')');

              // แจ้งเตือนเซลล์ที่ถูก assign ผ่าน socket
              if (io) {
                io.to('user_' + salesUser.id).emit('assigned_to_you', {
                  conversation_id: conversationId,
                  message: 'คุณได้รับลูกค้าใหม่'
                });
              }
            }
          );
        }
      );
    }
  );
}

// ============================================
// Helper: ดึง LINE Profile (ชื่อ + รูป)
// ============================================
function getLineProfile(userId, callback) {
  getPlatformConfig('line', (err, config) => {
    if (err || !config) return callback(null); // ถ้าดึง config ไม่ได้ก็ข้ามไป

    const https = require('https');
    const url = `https://api.line.me/v2/bot/profile/${userId}`;
    const options = {
      headers: { 'Authorization': `Bearer ${config.access_token}` }
    };

    https.get(url, options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const profile = JSON.parse(data);
          if (profile.displayName) {
            console.log(`📷 LINE Profile: ${profile.displayName} (${userId.substring(0, 10)}...)`);
            return callback({
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl || null,
              statusMessage: profile.statusMessage || null
            });
          }
        } catch (e) {}
        callback(null);
      });
    }).on('error', () => callback(null));
  });
}

// ============================================
// Helper: ดึง Facebook Profile (ชื่อ + รูป)
// ============================================
function getFacebookProfile(senderId, callback) {
  getPlatformConfig('facebook', (err, config) => {
    if (err || !config) return callback(null);

    const https = require('https');
    const url = `https://graph.facebook.com/v19.0/${senderId}?fields=name,profile_pic&access_token=${config.access_token}`;

    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const profile = JSON.parse(data);
          if (profile.name) {
            console.log(`📷 FB Profile: ${profile.name} (${senderId})`);
            return callback({
              displayName: profile.name,
              pictureUrl: profile.profile_pic || null
            });
          }
        } catch (e) {}
        callback(null);
      });
    }).on('error', () => callback(null));
  });
}

// ============================================
// Helper: ดาวน์โหลดไฟล์จาก LINE แล้วเซฟลง disk
// เพราะ LINE Content API ต้องใช้ Bearer token + มีวันหมดอายุ
// ============================================
function downloadLineContent(messageId, callback) {
  getPlatformConfig('line', (err, config) => {
    if (err || !config) return callback(null);

    const https = require('https');
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const options = {
      headers: { 'Authorization': `Bearer ${config.access_token}` }
    };

    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        console.log(`LINE content download failed: ${response.statusCode} for message ${messageId}`);
        return callback(null);
      }

      // กำหนดนามสกุลไฟล์จาก content-type
      const contentType = response.headers['content-type'] || '';
      let ext = '.jpg';
      if (contentType.includes('png')) ext = '.png';
      else if (contentType.includes('gif')) ext = '.gif';
      else if (contentType.includes('mp4')) ext = '.mp4';
      else if (contentType.includes('webp')) ext = '.webp';
      else if (contentType.includes('pdf')) ext = '.pdf';
      else if (contentType.includes('audio')) ext = '.m4a';
      else if (contentType.includes('octet-stream')) ext = '.bin';

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      const dir = path.join(__dirname, '..', 'uploads', 'chat');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filename = `${messageId}${ext}`;
      const filepath = path.join(dir, filename);
      const fileStream = fs.createWriteStream(filepath);

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        const publicUrl = `/uploads/chat/${filename}`;
        console.log(`📥 LINE content saved: ${publicUrl}`);
        callback(publicUrl);
      });

      fileStream.on('error', (err2) => {
        console.log('LINE content save error:', err2.message);
        // ลบไฟล์ที่เขียนไม่สมบูรณ์
        try { fs.unlinkSync(filepath); } catch (e) {}
        callback(null);
      });

    }).on('error', (err2) => {
      console.log('LINE content download error:', err2.message);
      callback(null);
    });
  });
}

// ============================================
// Helper: หาหรือสร้าง conversation
// รองรับ avatar ด้วย
// ============================================
function findOrCreateConversation(platform, platformConvId, customerName, customerId, customerAvatar, io, callback) {
  db.query(
    'SELECT * FROM chat_conversations WHERE platform = ? AND platform_conversation_id = ?',
    [platform, platformConvId],
    (err, rows) => {
      if (err) return callback(err);

      if (rows.length > 0) {
        const conv = rows[0];
        // อัพเดทชื่อ + avatar ถ้ายังไม่มี
        const updates = [];
        const params = [];
        if (customerName && !conv.customer_name) {
          updates.push('customer_name = ?');
          params.push(customerName);
        }
        if (customerAvatar && !conv.customer_avatar) {
          updates.push('customer_avatar = ?');
          params.push(customerAvatar);
        }
        if (updates.length > 0) {
          params.push(conv.id);
          db.query(`UPDATE chat_conversations SET ${updates.join(', ')} WHERE id = ?`, params, () => {});
          // อัพเดท object ด้วยเพื่อส่งกลับ
          if (customerName && !conv.customer_name) conv.customer_name = customerName;
          if (customerAvatar && !conv.customer_avatar) conv.customer_avatar = customerAvatar;
        }
        return callback(null, conv);
      }

      // สร้างใหม่ — พร้อมชื่อ + avatar ทันที
      db.query(
        `INSERT INTO chat_conversations (platform, platform_conversation_id, customer_name, customer_platform_id, customer_avatar, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'unread', NOW())`,
        [platform, platformConvId, customerName, customerId, customerAvatar],
        (err2, result) => {
          if (err2) return callback(err2);

          const newConvId = result.insertId;

          // 🎯 Auto-assign เซลล์แบบ round-robin
          autoAssignSales(newConvId, io);

          callback(null, { id: newConvId, platform, platform_conversation_id: platformConvId, customer_name: customerName, customer_avatar: customerAvatar });
        }
      );
    }
  );
}

// ============================================
// Helper: บันทึกข้อความ
// ============================================
function saveMessage(conversationId, msgData, io, callback) {
  // ตรวจว่ามีข้อความนี้อยู่แล้วไหม (ป้องกัน duplicate)
  if (msgData.platform_message_id) {
    db.query(
      'SELECT id FROM chat_messages WHERE platform_message_id = ?',
      [msgData.platform_message_id],
      (err, existing) => {
        if (!err && existing.length > 0) return callback(null, existing[0]); // ข้ามถ้ามีแล้ว
        insertMessage(conversationId, msgData, io, callback);
      }
    );
  } else {
    insertMessage(conversationId, msgData, io, callback);
  }
}

function insertMessage(conversationId, msgData, io, callback) {
  db.query(
    `INSERT INTO chat_messages (conversation_id, platform_message_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      conversationId,
      msgData.platform_message_id || null,
      msgData.sender_type || 'customer',
      msgData.sender_name || '',
      msgData.message_text || '',
      msgData.message_type || 'text',
      msgData.attachment_url || null
    ],
    (err, result) => {
      if (err) return callback(err);

      // อัพเดท conversation + auto-capture SOP keyword data
      // ข้ามถ้าไม่ใช่ข้อความจริง (รูป วิดีโอ สติกเกอร์ ฯลฯ)
      const isTextMsg = !msgData.message_type || msgData.message_type === 'text';
      const extracted = isTextMsg ? extractCustomerInfo(msgData.message_text) : {};
      let updateSql = `UPDATE chat_conversations SET status = 'unread', last_message_text = ?, last_message_at = NOW()`;
      const updateParams = [msgData.message_text || ''];

      // ข้อมูลพื้นฐาน — ชื่อจากข้อความจะ overwrite ชื่อ LINE display name
      // เพราะลูกค้าบอกชื่อจริงมาเอง ย่อมสำคัญกว่า display name
      if (extracted.customer_name) {
        updateSql += ', customer_name = ?';
        updateParams.push(extracted.customer_name);
      }
      if (extracted.phone) {
        updateSql += ', customer_phone = COALESCE(customer_phone, ?)';
        updateParams.push(extracted.phone);
      }
      if (extracted.email) {
        updateSql += ', customer_email = COALESCE(customer_email, ?)';
        updateParams.push(extracted.email);
      }

      // ข้อมูล SOP — ใช้ COALESCE ป้องกัน overwrite ข้อมูลที่มีอยู่แล้ว
      if (extracted.property_type) {
        updateSql += ', property_type = COALESCE(property_type, ?)';
        updateParams.push(extracted.property_type);
      }
      if (extracted.deed_type) {
        updateSql += ', deed_type = COALESCE(deed_type, ?)';
        updateParams.push(extracted.deed_type);
      }
      if (extracted.loan_type_detail) {
        updateSql += ', loan_type_detail = COALESCE(loan_type_detail, ?)';
        updateParams.push(extracted.loan_type_detail);
      }
      if (extracted.estimated_value) {
        updateSql += ', estimated_value = COALESCE(estimated_value, ?)';
        updateParams.push(extracted.estimated_value);
      }
      if (extracted.location_hint) {
        updateSql += ', location_hint = COALESCE(location_hint, ?)';
        updateParams.push(extracted.location_hint);
      }
      if (extracted.has_obligation) {
        updateSql += ', has_obligation = COALESCE(has_obligation, ?)';
        updateParams.push(extracted.has_obligation);
      }

      // ข้อมูลผู้กู้ ตาม SOP ข้อ 2.1.6
      if (extracted.occupation) {
        updateSql += ', occupation = COALESCE(occupation, ?)';
        updateParams.push(extracted.occupation);
      }
      if (extracted.monthly_income) {
        updateSql += ', monthly_income = COALESCE(monthly_income, ?)';
        updateParams.push(extracted.monthly_income);
      }
      if (extracted.desired_amount) {
        updateSql += ', desired_amount = COALESCE(desired_amount, ?)';
        updateParams.push(extracted.desired_amount);
      }
      if (extracted.obligation_amount) {
        updateSql += ', obligation_amount = COALESCE(obligation_amount, ?)';
        updateParams.push(extracted.obligation_amount);
      }
      if (extracted.contract_years) {
        updateSql += ', contract_years = COALESCE(contract_years, ?)';
        updateParams.push(extracted.contract_years);
      }

      // ข้อมูลนายหน้า (ถ้าผู้ส่งข้อความเป็นนายหน้า)
      if (extracted.is_agent) {
        updateSql += ', is_agent = 1';
        if (extracted.agent_name) {
          updateSql += ', agent_name = COALESCE(agent_name, ?)';
          updateParams.push(extracted.agent_name);
        }
        if (extracted.agent_phone) {
          updateSql += ', agent_phone = COALESCE(agent_phone, ?)';
          updateParams.push(extracted.agent_phone);
        }
      }

      // SOP Screening: ทรัพย์ไม่ผ่านเกณฑ์ → flag เพื่อแจ้งเตือนเซลล์
      if (extracted.ineligible_property) {
        updateSql += ', ineligible_property = 1';
        if (extracted.ineligible_reason) {
          updateSql += ', ineligible_reason = COALESCE(ineligible_reason, ?)';
          updateParams.push(extracted.ineligible_reason);
        }
      }
      // Intent ของลูกค้า (loan_inquiry / ask_interest / ask_fee / contract_renewal / ask_appraisal)
      if (extracted.intent) {
        updateSql += ', intent_type = ?'; // อัพเดทล่าสุดเสมอ (intent เปลี่ยนได้)
        updateParams.push(extracted.intent);
      }
      if (extracted.is_refinance) {
        updateSql += ', is_refinance = 1';
      }

      updateSql += ' WHERE id = ?';
      updateParams.push(conversationId);

      db.query(updateSql, updateParams, () => {
        // 🔥 Emit real-time event ไปหา frontend
        if (io) {
          const messageData = {
            conversation_id: conversationId,
            message: {
              id: result.insertId,
              conversation_id: conversationId,
              sender_type: msgData.sender_type || 'customer',
              sender_name: msgData.sender_name || '',
              message_text: msgData.message_text || '',
              message_type: msgData.message_type || 'text',
              attachment_url: msgData.attachment_url || null
            }
          };

          // ⚠️ แจ้งเตือนเซลล์ทันทีถ้าทรัพย์ไม่ผ่านเกณฑ์ SOP
          if (extracted.ineligible_property) {
            io.to('admin_room').emit('ineligible_property_detected', {
              conversation_id: conversationId,
              reason: extracted.ineligible_reason || 'ทรัพย์ไม่ผ่านเกณฑ์ SOP',
              deed_type: extracted.deed_type || null,
              property_type: extracted.property_type || null,
              message: `⚠️ ${extracted.ineligible_reason || 'ทรัพย์ไม่ผ่านเกณฑ์ SOP'}`
            });
          }

          // ส่งข้อความไปเฉพาะ room ของ conversation นั้น (แอดมินที่เปิดดูอยู่)
          io.to('conv_' + conversationId).emit('new_message', messageData);

          // ดึงชื่อลูกค้า + platform จาก conversation แล้ว emit ให้ครบ
          db.query(
            'SELECT customer_name, platform, customer_avatar FROM chat_conversations WHERE id = ?',
            [conversationId],
            (errConv, convRows) => {
              var convInfo = (convRows && convRows[0]) || {};
              // ส่ง notification ไป room กลาง (อัพเดท conversation list ของทุกแอดมิน)
              io.to('admin_room').emit('conversation_updated', {
                conversation_id: conversationId,
                customer_name: convInfo.customer_name || msgData.sender_name || '',
                platform: convInfo.platform || '',
                customer_avatar: convInfo.customer_avatar || '',
                last_message: msgData.message_text || '',
                sender_type: msgData.sender_type || 'customer'
              });
            }
          );
        }

        // 🎯 Auto-create หรือ Auto-update loan_request
        // เฉพาะข้อความจากลูกค้าเท่านั้น (ไม่ใช่แอดมินตอบกลับ)
        if (msgData.sender_type === 'customer' || !msgData.sender_type) {
          db.query(
            'SELECT loan_request_id, customer_name, customer_phone FROM chat_conversations WHERE id = ?',
            [conversationId],
            (errChk, chkRows) => {
              if (!errChk && chkRows.length > 0) {
                const c = chkRows[0];
                if (!c.loan_request_id && c.customer_name && c.customer_phone) {
                  // ยังไม่มี loan_request → สร้างใหม่
                  autoCreateLoanRequest(conversationId, io);
                } else if (c.loan_request_id) {
                  // มี loan_request_id → ตรวจว่ายังอยู่ในฐานข้อมูลจริงไหม
                  db.query('SELECT id FROM loan_requests WHERE id = ?', [c.loan_request_id], (errLr, lrRows) => {
                    if (!errLr && lrRows && lrRows.length > 0) {
                      // ยังอยู่จริง → อัพเดทข้อมูลเพิ่มเติม (ถ้ามี)
                      if (Object.keys(extracted).length > 0) {
                        updateLoanRequestFromChat(conversationId, extracted, io);
                      }
                    } else {
                      // ถูกลบไปแล้ว! → ตัด link เดิม แล้วสร้างใหม่อัตโนมัติ
                      console.log('[AUTO-RECOVERY] loan_request id=' + c.loan_request_id + ' ถูกลบไปแล้ว → สร้างใหม่ให้ conversation id=' + conversationId);
                      db.query('UPDATE chat_conversations SET loan_request_id = NULL WHERE id = ?', [conversationId], () => {
                        if (c.customer_name && c.customer_phone) {
                          autoCreateLoanRequest(conversationId, io);
                        }
                      });
                    }
                  });
                }
              }
            }
          );
        }

        callback(null, { id: result.insertId });
      });
    }
  );
}

// ============================================
// FACEBOOK WEBHOOK
// ============================================

// GET — Facebook webhook verification
exports.verifyFacebookWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // verify token ที่ตั้งไว้ตอน setup webhook
  if (mode === 'subscribe' && token === 'LOANDD_FB_VERIFY_TOKEN') {
    console.log('Facebook webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
};

// POST — Facebook webhook events
exports.handleFacebookWebhook = (req, res) => {
  const body = req.body;
  const io = req.app.get('io');

  // ตอบ 200 ทันที (Facebook ต้องการ response ภายใน 20 วินาที)
  res.sendStatus(200);

  if (body.object !== 'page') return;

  (body.entry || []).forEach(entry => {
    const pageId = entry.id;

    // Messaging events (inbox)
    (entry.messaging || []).forEach(event => {
      if (event.message) {
        handleFacebookMessage(pageId, event, io);
      }
    });

    // Changes events (comments)
    (entry.changes || []).forEach(change => {
      if (change.field === 'feed' && change.value?.item === 'comment') {
        handleFacebookComment(pageId, change.value, io);
      }
    });
  });
};

function handleFacebookMessage(pageId, event, io) {
  const senderId = event.sender?.id;
  const message = event.message;

  if (!senderId || senderId === pageId) return; // ข้ามข้อความจากเพจเอง
  if (message?.is_echo) return; // ข้ามข้อความ echo

  const msgText  = message?.text || '';
  const msgType  = message?.attachments ? (message.attachments[0]?.type || 'file') : 'text';
  const attachUrl = message?.attachments ? message.attachments[0]?.payload?.url : null;

  // ดึง Facebook Profile ก่อน แล้วค่อยสร้าง conversation
  getFacebookProfile(senderId, (profile) => {
    const displayName = profile?.displayName || null;
    const pictureUrl  = profile?.pictureUrl || null;

    findOrCreateConversation('facebook', senderId, displayName, senderId, pictureUrl, io, (err, conv) => {
      if (err) return console.log('FB webhook - find conv error:', err.message);

      saveMessage(conv.id, {
        platform_message_id: message?.mid || null,
        sender_type: 'customer',
        sender_name: displayName || '',
        message_text: msgText,
        message_type: ['image', 'sticker', 'video', 'file', 'audio'].includes(msgType) ? msgType : 'text',
        attachment_url: attachUrl
      }, io, (err3) => {
        if (err3) console.log('FB webhook - save msg error:', err3.message);
      });

      // 🔍 รูปภาพจาก Facebook → สแกนด้วย Gemini (รองรับทุกประเภทเอกสาร)
      if (msgType === 'image' && attachUrl) {
        console.log('[OCR] Facebook image detected, running general document OCR...');
        downloadAndScanDocument(attachUrl, (err2, docData) => {
          if (err2 || !docData) return;
          if (docData.doc_type === 'deed') {
            // โฉนด → ใช้ deed-specific flow (มี Tesseract fallback + ข้อมูลครบกว่า)
            downloadAndScanDeed(attachUrl, (err3, deedData) => {
              if (!err3 && deedData) applyDeedDataToLoanRequest(conv, deedData, io, 'facebook');
            });
          } else {
            // เอกสารอื่น (บัตรประชาชน, สลิป, ทะเบียนบ้าน ฯลฯ)
            applyDocumentDataToLoanRequest(conv, docData, io, 'facebook');
          }
        });
      }
    });
  });
}

function handleFacebookComment(pageId, comment, io) {
  // Comment on page post
  const senderId = comment.from?.id;
  const senderName = comment.from?.name;
  const msgText = comment.message || '';

  if (!senderId || senderId === pageId) return;

  findOrCreateConversation('facebook', `comment_${senderId}`, senderName, senderId, null, io, (err, conv) => {
    if (err) return console.log('FB comment webhook error:', err.message);

    saveMessage(conv.id, {
      platform_message_id: comment.comment_id,
      sender_type: 'customer',
      sender_name: senderName,
      message_text: `[Comment] ${msgText}`,
      message_type: 'text'
    }, io, () => {});
  });
}

// ============================================
// LINE WEBHOOK
// ============================================

// GET — LINE webhook verify (ตอบ 200)
exports.verifyLineWebhook = (req, res) => {
  res.sendStatus(200);
};

// POST — LINE webhook events
exports.handleLineWebhook = (req, res) => {
  // ตอบ 200 ทันที
  res.sendStatus(200);

  const io = req.app.get('io');
  const events = req.body?.events || [];

  events.forEach(event => {
    if (event.type === 'message') {
      handleLineMessage(event, io);
    } else if (event.type === 'follow') {
      handleLineFollow(event, io);
    }
  });
};

function handleLineMessage(event, io) {
  const userId = event.source?.userId;
  if (!userId) return;

  const message = event.message || {};
  let msgText = '';
  let msgType = 'text';
  let attachUrl = null;

  switch (message.type) {
    case 'text':
      msgText = message.text || '';
      break;
    case 'image':
      msgType = 'image';
      msgText = '[รูปภาพ]';
      // จะดาวน์โหลดจาก LINE แล้วเซฟลง disk ทีหลัง (ใน callback)
      attachUrl = null; // ตั้งค่าทีหลังหลังดาวน์โหลดเสร็จ
      break;
    case 'video':
      msgType = 'video';
      msgText = '[วิดีโอ]';
      attachUrl = null;
      break;
    case 'sticker':
      msgType = 'sticker';
      msgText = `[สติกเกอร์]`;
      attachUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${message.stickerId}/iPhone/sticker.png`;
      break;
    case 'location':
      msgType = 'location';
      msgText = `[ตำแหน่ง] ${message.title || ''} ${message.address || ''}`.trim();
      break;
    case 'file':
      msgType = 'file';
      msgText = `[ไฟล์] ${message.fileName || ''}`;
      break;
    default:
      msgText = `[${message.type || 'unknown'}]`;
  }

  // ✅ ดึง LINE Profile ก่อน แล้วค่อยสร้าง conversation (ให้ชื่อ+รูปพร้อมทันที)
  getLineProfile(userId, (profile) => {
    const displayName = profile?.displayName || null;
    const pictureUrl = profile?.pictureUrl || null;

    // ถ้าเป็นรูป/วิดีโอ → ดาวน์โหลดจาก LINE แล้วเซฟลง disk ก่อน
    const needsDownload = (msgType === 'image' || msgType === 'video' || msgType === 'file') && message.id;

    const doSave = (finalAttachUrl) => {
      findOrCreateConversation('line', userId, displayName, userId, pictureUrl, io, (err, conv) => {
        if (err) return console.log('LINE webhook - find conv error:', err.message);

        saveMessage(conv.id, {
          platform_message_id: message.id || null,
          sender_type: 'customer',
          sender_name: displayName || '',
          message_text: msgText,
          message_type: msgType,
          attachment_url: finalAttachUrl
        }, io, (err3) => {
          if (err3) console.log('LINE webhook - save msg error:', err3.message);
        });
      });
    };

    if (needsDownload) {
      downloadLineContent(message.id, (localUrl) => {
        doSave(localUrl);

        // 🔍 รูปภาพจาก LINE → สแกนด้วย Gemini (รองรับทุกประเภทเอกสาร)
        if (msgType === 'image' && localUrl) {
          const serverRoot   = path.join(__dirname, '..', 'public');
          const absolutePath = path.join(serverRoot, localUrl);

          scanDocumentWithGemini(absolutePath, (err, docData) => {
            if (err || !docData) return;

            // ดึง conv ใหม่เพื่อให้ได้ loan_request_id ล่าสุด
            findOrCreateConversation('line', userId, null, userId, null, io, (err2, conv) => {
              if (err2 || !conv) return;

              if (docData.doc_type === 'deed') {
                // โฉนด → ใช้ deed-specific flow (มี Tesseract fallback)
                scanDeedImage(absolutePath, (err3, deedData) => {
                  if (!err3 && deedData) applyDeedDataToLoanRequest(conv, deedData, io, 'line');
                });
              } else {
                // เอกสารอื่น (บัตรประชาชน, สลิป, ทะเบียนบ้าน ฯลฯ)
                applyDocumentDataToLoanRequest(conv, docData, io, 'line');
              }
            });
          });
        }
      });
    } else {
      doSave(attachUrl);
    }
  });
}

function handleLineFollow(event, io) {
  const userId = event.source?.userId;
  if (!userId) return;

  // ✅ ดึง LINE Profile ก่อน แล้วค่อยสร้าง conversation
  getLineProfile(userId, (profile) => {
    const displayName = profile?.displayName || null;
    const pictureUrl = profile?.pictureUrl || null;

    findOrCreateConversation('line', userId, displayName, userId, pictureUrl, io, (err, conv) => {
      if (err) return console.log('LINE follow error:', err.message);

      saveMessage(conv.id, {
        sender_type: 'customer',
        sender_name: displayName || '',
        message_text: '[ผู้ใช้เริ่มติดตาม]',
        message_type: 'text'
      }, io, () => {});
    });
  });
}

// Export functions เพื่อให้ chatController เรียกใช้ได้
exports.autoCreateLoanRequest = autoCreateLoanRequest;
exports.updateLoanRequestFromChat = updateLoanRequestFromChat;