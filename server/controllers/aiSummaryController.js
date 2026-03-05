// ============================================================
// AI Summary Controller — เรียก Gemini API + ดึงข้อมูลจาก DB
// ต้องตั้ง GEMINI_API_KEY ใน .env ของ server
// รับ key ฟรีที่ https://aistudio.google.com/apikey
// ============================================================
const db = require('../config/db');
const https = require('https');

const GEMINI_MODEL = 'gemini-2.5-flash'; // confirmed available (from ListModels)

// ============================================================
// Helper: ดึงข้อมูลสรุปจาก DB ทั้งหมดที่ Claude ต้องการ
// ============================================================
function fetchSummaryData(callback) {
  const data = {};

  // 1. สถิติเคสตามสถานะ (จาก cases ซึ่งเป็น source of truth)
  db.query(
    `SELECT status, COUNT(*) as count FROM cases GROUP BY status ORDER BY count DESC`,
    (err, caseStats) => {
      if (err) return callback(err);
      data.caseStats = caseStats;

      // 2. รายได้/วงเงินรวม (จาก cases JOIN loan_requests เพื่อได้ loan_amount)
      db.query(
        `SELECT
          COUNT(*) as total_cases,
          SUM(lr.loan_amount) as total_loan_amount,
          SUM(CASE WHEN c.status = 'completed' THEN lr.loan_amount ELSE 0 END) as completed_loan_amount,
          SUM(CASE WHEN c.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
          SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_count
        FROM cases c
        LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id`,
        (err2, summary) => {
          if (err2) return callback(err2);
          data.summary = summary[0] || {};

          // 3. เคสเดือนนี้
          db.query(
            `SELECT COUNT(*) as this_month, lr.loan_type,
              SUM(lr.loan_amount) as month_loan_amount
             FROM cases c
             LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
             WHERE MONTH(c.created_at) = MONTH(NOW()) AND YEAR(c.created_at) = YEAR(NOW())
             GROUP BY lr.loan_type`,
            (err3, thisMonth) => {
              if (err3) return callback(err3);
              data.thisMonth = thisMonth;

              // 4. เคสค้างในแต่ละฝ่าย (จาก cases ซึ่งถูก sync อัตโนมัติ)
              db.query(
                `SELECT
                  SUM(CASE WHEN status IN ('new','contacting','incomplete') THEN 1 ELSE 0 END) as pending_sales,
                  SUM(CASE WHEN status IN ('awaiting_appraisal_fee','appraisal_scheduled') THEN 1 ELSE 0 END) as pending_appraisal,
                  SUM(CASE WHEN status = 'pending_approve' THEN 1 ELSE 0 END) as pending_approval,
                  SUM(CASE WHEN status = 'credit_approved' THEN 1 ELSE 0 END) as credit_approved,
                  SUM(CASE WHEN status = 'pending_auction' THEN 1 ELSE 0 END) as pending_auction,
                  SUM(CASE WHEN status = 'auction_completed' THEN 1 ELSE 0 END) as auction_completed,
                  SUM(CASE WHEN status = 'preparing_docs' THEN 1 ELSE 0 END) as issuing,
                  SUM(CASE WHEN status IN ('legal_scheduled','legal_completed') THEN 1 ELSE 0 END) as legal
                FROM cases WHERE status NOT IN ('completed','cancelled')`,
                (err4, pipeline) => {
                  if (err4) return callback(err4);
                  data.pipeline = pipeline[0] || {};

                  // 5. ผลการประเมิน (จาก cases.appraisal_result)
                  db.query(
                    `SELECT COUNT(*) as total_appraisals,
                      SUM(CASE WHEN appraisal_result = 'passed' THEN 1 ELSE 0 END) as pass_count,
                      SUM(CASE WHEN appraisal_result = 'not_passed' THEN 1 ELSE 0 END) as fail_count
                     FROM cases WHERE appraisal_result IS NOT NULL`,
                    (err5, appraisals) => {
                      data.appraisals = (!err5 && appraisals) ? appraisals[0] : null;

                      // 6. แชทล่าสุด
                      db.query(
                        `SELECT COUNT(*) as total_chats,
                          SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread_chats
                         FROM chat_conversations`,
                        (err6, chats) => {
                          data.chats = (!err6 && chats) ? chats[0] : null;

                          // 7. รายรับจริงจาก debtor_accounting (ค่าธรรมเนียมที่เก็บได้จริง)
                          db.query(
                            `SELECT
                              COALESCE(SUM(appraisal_amount), 0) as total_appraisal_fee,
                              COALESCE(SUM(bag_fee_amount), 0) as total_bag_fee,
                              COALESCE(SUM(contract_sale_amount), 0) as total_contract_fee,
                              COALESCE(SUM(redemption_amount), 0) as total_redemption_fee,
                              COALESCE(SUM(additional_service_amount), 0) as total_additional_fee,
                              COALESCE(SUM(
                                COALESCE(appraisal_amount,0) +
                                COALESCE(bag_fee_amount,0) +
                                COALESCE(contract_sale_amount,0) +
                                COALESCE(redemption_amount,0) +
                                COALESCE(additional_service_amount,0)
                              ), 0) as grand_total_fee
                             FROM debtor_accounting`,
                            (err7, feeAll) => {
                              data.feeAll = (!err7 && feeAll) ? feeAll[0] : null;

                              // 8. รายรับเดือนนี้จาก debtor_accounting (JOIN cases เพื่อกรองเดือน)
                              db.query(
                                `SELECT
                                  COALESCE(SUM(da.appraisal_amount), 0) as appraisal_fee,
                                  COALESCE(SUM(da.bag_fee_amount), 0) as bag_fee,
                                  COALESCE(SUM(da.contract_sale_amount), 0) as contract_fee,
                                  COALESCE(SUM(da.redemption_amount), 0) as redemption_fee,
                                  COALESCE(SUM(da.additional_service_amount), 0) as additional_fee,
                                  COALESCE(SUM(
                                    COALESCE(da.appraisal_amount,0) +
                                    COALESCE(da.bag_fee_amount,0) +
                                    COALESCE(da.contract_sale_amount,0) +
                                    COALESCE(da.redemption_amount,0) +
                                    COALESCE(da.additional_service_amount,0)
                                  ), 0) as total_fee_this_month
                                 FROM debtor_accounting da
                                 JOIN cases c ON da.case_id = c.id
                                 WHERE MONTH(c.created_at) = MONTH(NOW())
                                   AND YEAR(c.created_at) = YEAR(NOW())`,
                                (err8, feeMonth) => {
                                  data.feeMonth = (!err8 && feeMonth) ? feeMonth[0] : null;
                                  callback(null, data);
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}

// ============================================================
// Helper: เรียก Gemini API
// ============================================================
function callGemini(systemPrompt, userMessage, callback) {
  // อ่าน key ตอน runtime (หลัง dotenv โหลดแล้ว)
  const apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return callback(new Error('GEMINI_API_KEY_MISSING'));
  }

  const body = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.4
    }
  });

  const path = `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) return callback(new Error(parsed.error.message || 'Gemini API error'));
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        callback(null, text);
      } catch (e) {
        callback(new Error('Parse Gemini response failed: ' + e.message));
      }
    });
  });

  req.on('error', callback);
  req.write(body);
  req.end();
}

// ============================================================
// POST /api/admin/ai-summary/ask
// Body: { question: string }
// ============================================================
exports.askSummary = (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: 'กรุณาพิมพ์คำถาม' });
  }

  // ดึงข้อมูลจาก DB ก่อน แล้วค่อยส่งให้ Claude
  fetchSummaryData((err, data) => {
    if (err) {
      console.log('AI Summary DB error:', err.message);
      return res.status(500).json({ success: false, message: 'ดึงข้อมูลจาก DB ไม่ได้: ' + err.message });
    }

    // สร้าง system prompt พร้อมข้อมูลจริงจาก DB
    const fmt = (n) => Number(n || 0).toLocaleString('th-TH');
    const systemPrompt = `คุณคือผู้ช่วย AI สำหรับบริษัท LOANDD ที่ให้บริการสินเชื่อจำนองและขายฝากอสังหาริมทรัพย์ในประเทศไทย

⚠️ ข้อสำคัญ: "วงเงิน" หมายถึงวงเงินกู้ที่อนุมัติให้ลูกค้า ไม่ใช่รายรับของบริษัท
รายรับจริงของบริษัทคือ "ค่าธรรมเนียม" ต่างๆ (ค่าประเมิน ค่าถุง ค่าสัญญา ค่าไถ่ถอน ฯลฯ)

ข้อมูลปัจจุบันจากระบบ (ข้อมูลจริง ณ วันนี้):

📊 ภาพรวมทั้งหมด:
- เคสทั้งหมด: ${data.summary.total_cases || 0} เคส
- วงเงินกู้รวม (ไม่ใช่รายรับ): ${fmt(data.summary.total_loan_amount)} บาท
- เคสเสร็จสมบูรณ์: ${data.summary.completed_count || 0} เคส (วงเงิน ${fmt(data.summary.completed_loan_amount)} บาท)
- เคสยกเลิก: ${data.summary.cancelled_count || 0} เคส

💰 รายรับจริงของบริษัท (ค่าธรรมเนียมรวมทุกเคส):
${data.feeAll ? `- ค่าประเมิน: ${fmt(data.feeAll.total_appraisal_fee)} บาท
- ค่าถุง: ${fmt(data.feeAll.total_bag_fee)} บาท
- ค่าสัญญาขาย: ${fmt(data.feeAll.total_contract_fee)} บาท
- ค่าไถ่ถอน: ${fmt(data.feeAll.total_redemption_fee)} บาท
- ค่าบริการเพิ่มเติม: ${fmt(data.feeAll.total_additional_fee)} บาท
- รายรับรวมทั้งหมด: ${fmt(data.feeAll.grand_total_fee)} บาท` : '- ยังไม่มีข้อมูลค่าธรรมเนียม'}

📅 เดือนนี้ (เคสที่สร้างในเดือนปัจจุบัน):
${(data.thisMonth || []).map(r => `- ${r.loan_type || 'ไม่ระบุ'}: ${r.this_month} เคส วงเงิน ${fmt(r.month_loan_amount)} บาท`).join('\n') || '- ยังไม่มีข้อมูล'}

💰 รายรับค่าธรรมเนียมเดือนนี้:
${data.feeMonth ? `- ค่าประเมิน: ${fmt(data.feeMonth.appraisal_fee)} บาท
- ค่าถุง: ${fmt(data.feeMonth.bag_fee)} บาท
- ค่าสัญญา: ${fmt(data.feeMonth.contract_fee)} บาท
- ค่าไถ่ถอน: ${fmt(data.feeMonth.redemption_fee)} บาท
- ค่าบริการเพิ่มเติม: ${fmt(data.feeMonth.additional_fee)} บาท
- รายรับรวมเดือนนี้: ${fmt(data.feeMonth.total_fee_this_month)} บาท` : '- ยังไม่มีข้อมูล'}

🔄 Pipeline เคสค้างในแต่ละฝ่าย:
- ฝ่ายขาย (ติดต่อ/ไม่ครบ): ${data.pipeline.pending_sales || 0} เคส
- ฝ่ายประเมิน (รอประเมิน): ${data.pipeline.pending_appraisal || 0} เคส
- ฝ่ายอนุมัติวงเงิน: ${data.pipeline.pending_approval || 0} เคส
- อนุมัติแล้ว รอประมูล: ${data.pipeline.credit_approved || 0} เคส
- รอประมูล: ${data.pipeline.pending_auction || 0} เคส
- ประมูลเสร็จสิ้น (รอออกสัญญา): ${data.pipeline.auction_completed || 0} เคส
- ฝ่ายออกสัญญา: ${data.pipeline.issuing || 0} เคส
- ฝ่ายนิติกรรม: ${data.pipeline.legal || 0} เคส

📝 สถานะเคสแบบละเอียด:
${(data.caseStats || []).map(s => `- ${s.status}: ${s.count} เคส`).join('\n')}

${data.appraisals ? `🏠 การประเมิน: ทั้งหมด ${data.appraisals.total_appraisals} ราย ผ่าน ${data.appraisals.pass_count} ไม่ผ่าน ${data.appraisals.fail_count}` : ''}
${data.chats ? `💬 แชท: ทั้งหมด ${data.chats.total_chats} conversation ยังไม่อ่าน ${data.chats.unread_chats}` : ''}

กรุณาตอบคำถามเป็นภาษาไทย ตรงประเด็น ใช้ตัวเลขจริงจากข้อมูลข้างต้น
- ถ้าถามเรื่อง "เงินที่ได้" หรือ "รายรับ" ให้ตอบด้วยค่าธรรมเนียมจริง ไม่ใช่วงเงินกู้
- ถ้าถามเรื่อง "วงเงิน" หรือ "ยอดกู้" ให้ตอบด้วยวงเงินกู้
- ถ้าไม่มีข้อมูลก็บอกตรงๆ ไม่ต้องคาดเดา`;

    callGemini(systemPrompt, question.trim(), (err2, answer) => {
      if (err2) {
        const isKey = err2.message === 'GEMINI_API_KEY_MISSING';
        const msg = isKey
          ? 'GEMINI_API_KEY_MISSING'
          : err2.message;
        return res.status(500).json({ success: false, message: msg });
      }
      res.json({ success: true, answer, data_snapshot: data.summary });
    });
  });
};

// ============================================================
// GET /api/admin/ai-summary/snapshot — ดูข้อมูล DB เฉยๆ
// ============================================================
exports.getSnapshot = (req, res) => {
  fetchSummaryData((err, data) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data });
  });
};
