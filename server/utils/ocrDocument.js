/**
 * ocrDocument.js — สแกนเอกสารทั่วไปด้วย Gemini Vision
 *
 * รองรับ:
 *   deed          — โฉนดที่ดิน / น.ส.3 / น.ส.4 (ดึงข้อมูลทรัพย์)
 *   id_card       — บัตรประชาชน (ดึงชื่อ, เลขบัตร, ที่อยู่)
 *   house_reg     — ทะเบียนบ้าน (ดึงที่อยู่, บ้านเลขที่)
 *   salary_slip   — สลิปเงินเดือน (ดึงรายได้, นายจ้าง, อาชีพ)
 *   bank_stmt     — statement ธนาคาร (ดึงรายรับ, ยอดเฉลี่ย)
 *   other         — เอกสารอื่น (ดึงข้อมูลที่เกี่ยวข้องได้)
 *   unknown       — รูปที่ไม่ใช่เอกสาร (คืน null)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || null;
}

// ============================================================
// ลบคำนำหน้าออก (ใช้ร่วมกับ ocrDeed.js)
// ============================================================
function stripPrefix(val, type) {
  if (!val || typeof val !== 'string') return val;
  var s = val.trim();
  if (type === 'province') s = s.replace(/^จังหวัด/, '').replace(/^จ\./, '').trim();
  else if (type === 'amphoe') s = s.replace(/^อำเภอ/, '').replace(/^เขต/, '').replace(/^อ\./, '').trim();
  else if (type === 'tambon') s = s.replace(/^ตำบล/, '').replace(/^แขวง/, '').replace(/^ต\./, '').trim();
  return s || val;
}

// ============================================================
// Gemini — สแกนเอกสารทั่วไป
// ============================================================
function scanDocumentWithGemini(imagePath, callback) {
  const apiKey = getGeminiKey();
  if (!apiKey) return callback(new Error('No GEMINI_API_KEY'), null);

  let imageBase64, mimeType;
  try {
    const buf = fs.readFileSync(imagePath);
    imageBase64 = buf.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
    mimeType = mimeMap[ext] || 'image/jpeg';
  } catch (e) {
    return callback(e, null);
  }

  const prompt = `คุณเป็นผู้เชี่ยวชาญอ่านเอกสารราชการและเอกสารทางการเงินของไทย

กรุณาอ่านรูปภาพนี้และดึงข้อมูลที่พบออกมา ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

ขั้นตอน:
1. ระบุประเภทเอกสารก่อนใน "doc_type":
   - "deed"        = โฉนดที่ดิน, น.ส.3, น.ส.3ก, น.ส.4, น.ส.4จ, เอกสารสิทธิ์ที่ดิน
   - "id_card"     = บัตรประจำตัวประชาชน, บัตร ปชช.
   - "house_reg"   = ทะเบียนบ้าน, ท.ร.14
   - "salary_slip" = สลิปเงินเดือน, ใบรับรองเงินเดือน, payslip
   - "bank_stmt"   = statement ธนาคาร, บัญชีเดินสะพัด
   - "other"       = เอกสารราชการหรือทางการอื่น
   - "unknown"     = รูปถ่ายบุคคล, ของกิน, วิวทิวทัศน์ หรือไม่ใช่เอกสาร

2. ดึงข้อมูลตามประเภทเอกสาร ถ้าไม่พบให้ใส่ null

{
  "doc_type": "deed | id_card | house_reg | salary_slip | bank_stmt | other | unknown",

  "=== ข้อมูลเจ้าของ / ลูกค้า ===": null,
  "full_name": "ชื่อ-นามสกุลเต็ม (ไม่มีคำนำหน้า เช่น นาย/นาง/นางสาว)",
  "id_number": "เลขประจำตัวประชาชน 13 หลัก (ตัวเลขล้วน ไม่มีขีด)",
  "date_of_birth": "วันเกิด รูปแบบ YYYY-MM-DD",
  "occupation": "อาชีพ",
  "employer": "ชื่อบริษัท/นายจ้าง",
  "monthly_income": "รายได้ต่อเดือน (ตัวเลขล้วน ไม่มีบาทหรือ comma) เช่น 35000",

  "=== ที่อยู่ ===": null,
  "house_number": "บ้านเลขที่",
  "village": "ชื่อหมู่บ้าน",
  "tambon": "ตำบล/แขวง (ไม่มีคำว่าตำบล/แขวง)",
  "amphoe": "อำเภอ/เขต (ไม่มีคำว่าอำเภอ/เขต)",
  "province": "จังหวัด (ไม่มีคำว่าจังหวัด)",

  "=== ข้อมูลโฉนด (เฉพาะ deed) ===": null,
  "deed_number": "เลขที่โฉนด / น.ส. / เลขเอกสาร",
  "deed_type": "ประเภท เช่น โฉนดที่ดิน หรือ น.ส.4จ",
  "land_area": "เนื้อที่ เช่น 2 ไร่ 1 งาน 50 ตารางวา",
  "volume": "เล่มที่",
  "page": "หน้า",
  "parcel_number": "เลขที่ดิน",

  "=== ธนาคาร (เฉพาะ bank_stmt) ===": null,
  "bank_name": "ชื่อธนาคาร",
  "account_number": "เลขที่บัญชี (ตัวเลขล้วน)"
}

กฎสำคัญ:
- ตัดคำนำหน้าชื่อออก (นาย/นาง/นางสาว/ดร./พ.ต.ท. ฯลฯ) ให้เหลือแค่ ชื่อ+นามสกุล
- เลขบัตรประชาชน: ตัวเลข 13 ตัว ไม่มีขีด
- รายได้: ตัวเลขเท่านั้น ไม่มี , หรือ บาท
- ถ้าเป็น unknown ให้ตอบแค่ {"doc_type": "unknown"} ไม่ต้องมีฟิลด์อื่น`;

  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
        { text: prompt }
      ]
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
    }
  });

  const model  = 'gemini-2.5-flash';
  const reqOpt = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };

  const req = https.request(reqOpt, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          console.log('[OCR-Doc] Gemini error:', parsed.error.message);
          return callback(new Error(parsed.error.message), null);
        }

        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) return callback(new Error('Empty Gemini response'), null);

        let docJson;
        try {
          const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          docJson = JSON.parse(cleaned);
        } catch (e) {
          console.log('[OCR-Doc] JSON parse error:', e.message);
          return callback(new Error('Cannot parse Gemini JSON'), null);
        }

        // ไม่ใช่เอกสาร → คืน null
        if (!docJson.doc_type || docJson.doc_type === 'unknown') {
          console.log('[OCR-Doc] Unknown/non-document image');
          return callback(null, null);
        }

        // ลบ key comment (=== ... ===) และค่า null
        const clean = {};
        Object.keys(docJson).forEach(k => {
          if (k.startsWith('===')) return;
          if (docJson[k] !== null && docJson[k] !== '' && docJson[k] !== 'null') {
            clean[k] = docJson[k];
          }
        });

        // Normalize location prefixes
        if (clean.province) clean.province = stripPrefix(clean.province, 'province');
        if (clean.amphoe)   clean.amphoe   = stripPrefix(clean.amphoe,   'amphoe');
        if (clean.tambon)   clean.tambon   = stripPrefix(clean.tambon,   'tambon');

        // Normalize full_name — ตัดคำนำหน้าออก
        if (clean.full_name) {
          clean.full_name = clean.full_name
            .replace(/^(นาย|นาง|นางสาว|น\.ส\.|ดร\.|ผศ\.|รศ\.|ศ\.|พ\.ต\.|พ\.ท\.|พ\.อ\.)\s*/u, '')
            .trim();
        }

        // Normalize monthly_income — เอาแต่ตัวเลข
        if (clean.monthly_income) {
          const num = String(clean.monthly_income).replace(/[^0-9]/g, '');
          clean.monthly_income = num || null;
          if (!clean.monthly_income) delete clean.monthly_income;
        }

        // Normalize id_number — เอาแต่ตัวเลข
        if (clean.id_number) {
          clean.id_number = String(clean.id_number).replace(/[^0-9]/g, '');
          if (clean.id_number.length !== 13) delete clean.id_number; // ไม่ครบ 13 หลัก → ทิ้ง
        }

        console.log('[OCR-Doc] doc_type:', clean.doc_type, '| fields:', Object.keys(clean).filter(k => k !== 'doc_type').join(', '));
        callback(null, clean);

      } catch (e) {
        callback(e, null);
      }
    });
  });

  req.on('error', (e) => {
    console.log('[OCR-Doc] Request error:', e.message);
    callback(e, null);
  });
  req.write(body);
  req.end();
}

// ============================================================
// Download จาก URL แล้วสแกน (สำหรับ Facebook)
// ============================================================
function downloadAndScanDocument(imageUrl, callback) {
  if (!imageUrl) return callback(null, null);

  const tmpFile = path.join(os.tmpdir(), 'doc_ocr_' + Date.now() + '.jpg');
  const file    = fs.createWriteStream(tmpFile);

  const doCleanup = () => {
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
  };

  const request = imageUrl.startsWith('https') ? https : require('http');
  request.get(imageUrl, (res) => {
    if (res.statusCode !== 200) {
      file.close(); doCleanup();
      return callback(new Error('Download failed: ' + res.statusCode), null);
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        scanDocumentWithGemini(tmpFile, (err, docData) => {
          doCleanup();
          callback(err, docData);
        });
      });
    });
  }).on('error', (e) => {
    file.close(); doCleanup();
    callback(e, null);
  });
}

// ============================================================
// สร้าง admin_note จากข้อมูลเอกสาร (สำหรับ append ใน DB)
// ============================================================
function buildDocNote(docData) {
  if (!docData || !docData.doc_type) return null;
  const d = docData;
  const parts = [];
  const labels = {
    deed: '📄 โฉนดที่ดิน', id_card: '🪪 บัตรประชาชน',
    house_reg: '🏠 ทะเบียนบ้าน', salary_slip: '💵 สลิปเงินเดือน',
    bank_stmt: '🏦 Statement', other: '📋 เอกสาร'
  };
  parts.push(labels[d.doc_type] || d.doc_type);
  if (d.full_name)       parts.push(`ชื่อ: ${d.full_name}`);
  if (d.id_number)       parts.push(`เลขบัตร: ${d.id_number}`);
  if (d.employer)        parts.push(`นายจ้าง: ${d.employer}`);
  if (d.monthly_income)  parts.push(`รายได้: ${Number(d.monthly_income).toLocaleString()} บาท/เดือน`);
  if (d.deed_number)     parts.push(`โฉนด: ${d.deed_number}`);
  if (d.land_area)       parts.push(`เนื้อที่: ${d.land_area}`);
  if (d.tambon || d.amphoe || d.province) {
    const loc = [d.tambon && `ต.${d.tambon}`, d.amphoe && `อ.${d.amphoe}`, d.province && `จ.${d.province}`].filter(Boolean).join(' ');
    parts.push(loc);
  }
  return `[OCR] ${parts.join(' | ')}`;
}

module.exports = { scanDocumentWithGemini, downloadAndScanDocument, buildDocNote };
