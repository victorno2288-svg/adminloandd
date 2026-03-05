const db = require('../config/db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { notifyStatusChange } = require('./notificationController')

// ========== Helper: ไม่จำเป็นต้องมี case — ทำงานกับ loan_request_id โดยตรง ==========

// ===== multer setup สำหรับ credit table upload =====
const creditTableStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/credit_tables')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, 'credit_' + Date.now() + ext)
  }
})
const uploadCreditTable = multer({ storage: creditTableStorage, limits: { fileSize: 25 * 1024 * 1024 } })

// ========== สถิติฝ่ายอนุมัติวงเงิน (นับจาก loan_requests) ==========
exports.getStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM loan_requests lr LEFT JOIN approval_transactions at2 ON at2.loan_request_id = lr.id WHERE at2.id IS NULL OR at2.approval_status = 'pending') AS pending_count,
      (SELECT COUNT(*) FROM approval_transactions WHERE approval_status = 'approved') AS approved_count,
      (SELECT COUNT(*) FROM approval_transactions WHERE approval_status = 'cancelled') AS cancelled_count,
      (SELECT COUNT(*) FROM loan_requests) AS total_count
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getStats error:', err)
      return res.json({ success: true, stats: { pending_count: 0, approved_count: 0, cancelled_count: 0, total_count: 0 } })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== รายการลูกหนี้สำหรับฝ่ายอนุมัติวงเงิน (FROM loan_requests เป็นหลัก) ==========
exports.getApprovalCases = (req, res) => {
  const { status, date } = req.query

  let sql = `
    SELECT
      lr.id AS loan_request_id,
      lr.debtor_code, lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.property_address, lr.location_url,
      lr.images, lr.appraisal_images,
      c.id AS case_id, c.case_code, c.status AS case_status,
      lr.appraisal_result, lr.appraisal_type, lr.approved_amount,
      lr.appraisal_date, lr.appraisal_fee, lr.payment_status,
      lr.slip_image, lr.appraisal_book_image,
      lr.updated_at,
      a.full_name AS agent_name,
      at2.id AS approval_id, at2.approval_type, at2.approved_credit,
      at2.interest_per_year, at2.interest_per_month, at2.operation_fee,
      at2.land_tax_estimate, at2.advance_interest, at2.is_cancelled,
      at2.approval_status, at2.recorded_by, at2.recorded_at,
      at2.credit_table_file,
      at2.created_at AS approval_created_at, at2.updated_at AS approval_updated_at
    FROM loan_requests lr
    LEFT JOIN cases c ON c.loan_request_id = lr.id
    LEFT JOIN agents a ON a.id = lr.agent_id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = lr.id
    WHERE 1=1
  `

  const params = []
  if (status) {
    if (status === 'pending') {
      sql += ' AND (at2.approval_status = ? OR at2.id IS NULL)'
      params.push(status)
    } else {
      sql += ' AND at2.approval_status = ?'
      params.push(status)
    }
  }
  if (date) {
    sql += ' AND (DATE(at2.updated_at) = ? OR DATE(lr.created_at) = ?)'
    params.push(date, date)
  }

  sql += ' ORDER BY lr.id DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getApprovalCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== ดึงข้อมูลเดี่ยว (สำหรับหน้าแก้ไขฝ่ายอนุมัติ) — query จาก loan_requests เป็นหลัก ==========
exports.getApprovalDetail = (req, res) => {
  const { caseId: loanRequestId } = req.params

  // ตรวจสอบว่ามี approval_transaction สำหรับ loan_request_id นี้หรือยัง
  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) {
      console.error('getApprovalDetail check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    if (!existing || existing.length === 0) {
      // ยังไม่มี → สร้าง approval_transaction ใหม่ด้วย loan_request_id (ไม่จำเป็นต้องมี case)
      db.query(
        'INSERT INTO approval_transactions (loan_request_id, approval_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [loanRequestId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('getApprovalDetail insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          fetchApprovalDetail(loanRequestId, res)
        }
      )
    } else {
      fetchApprovalDetail(loanRequestId, res)
    }
  })
}

// ดึงข้อมูลจาก loan_requests เป็นหลัก (ไม่จำเป็นต้องมี case)
function fetchApprovalDetail(loanRequestId, res) {
  const sql = `
    SELECT
      lr.id AS loan_request_id,
      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.loan_type_detail, lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.additional_details,
      lr.property_address, lr.location_url,
      lr.deed_number, lr.deed_type, lr.land_area, lr.building_area, lr.has_obligation, lr.obligation_count,
      lr.interest_rate, lr.desired_amount, lr.occupation,
      lr.monthly_income, lr.loan_purpose, lr.contract_years, lr.net_desired_amount,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.appraisal_type, lr.appraisal_result, lr.appraisal_date, lr.appraisal_fee,
      lr.slip_image, lr.appraisal_book_image, lr.appraisal_note,
      lr.appraisal_recorded_by, lr.appraisal_recorded_at,
      a.full_name AS agent_name,
      c.id AS case_id, c.case_code, c.status AS case_status,
      at2.id AS approval_id, at2.approval_type,
      at2.approved_credit, at2.interest_per_year, at2.interest_per_month,
      at2.operation_fee, at2.land_tax_estimate, at2.advance_interest,
      at2.is_cancelled, at2.approval_status, at2.recorded_by, at2.recorded_at,
      at2.approval_date, at2.credit_table_file,
      at2.created_at AS approval_created_at, at2.updated_at AS approval_updated_at,
      lr.outside_result, lr.outside_reason, lr.outside_recorded_at,
      lr.inside_result, lr.inside_reason, lr.inside_recorded_at,
      lr.check_price_value, lr.check_price_detail, lr.check_price_recorded_at
    FROM loan_requests lr
    LEFT JOIN cases c ON c.loan_request_id = lr.id
    LEFT JOIN agents a ON a.id = lr.agent_id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = lr.id
    WHERE lr.id = ?
  `
  db.query(sql, [loanRequestId], (err, results) => {
    if (err) {
      console.error('fetchApprovalDetail error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })
    res.json({ success: true, caseData: results[0] })
  })
}

// ========== อัพเดทข้อมูลอนุมัติวงเงิน (ทำงานกับ loan_request_id โดยตรง ไม่ต้องมีเคส) ==========
exports.updateApproval = (req, res) => {
  const { caseId: loanRequestId } = req.params
  const body = req.body || {}
  const {
    approval_type, approved_credit, interest_per_year, interest_per_month,
    operation_fee, land_tax_estimate, advance_interest, is_cancelled,
    approval_status, recorded_by, recorded_at, approval_date
  } = body

  const buildAndExecuteUpdate = () => {
    const fields = []
    const values = []

    if (approval_type !== undefined) { fields.push('approval_type=?'); values.push(approval_type || null) }
    if (approved_credit !== undefined) { fields.push('approved_credit=?'); values.push(approved_credit || null) }
    if (interest_per_year !== undefined) { fields.push('interest_per_year=?'); values.push(interest_per_year || null) }
    if (interest_per_month !== undefined) { fields.push('interest_per_month=?'); values.push(interest_per_month || null) }
    if (operation_fee !== undefined) { fields.push('operation_fee=?'); values.push(operation_fee || null) }
    if (land_tax_estimate !== undefined) { fields.push('land_tax_estimate=?'); values.push(land_tax_estimate || null) }
    if (advance_interest !== undefined) { fields.push('advance_interest=?'); values.push(advance_interest || null) }
    if (is_cancelled !== undefined) { fields.push('is_cancelled=?'); values.push(is_cancelled ? 1 : 0) }
    if (approval_status !== undefined) { fields.push('approval_status=?'); values.push(approval_status || 'pending') }
    if (recorded_by !== undefined) { fields.push('recorded_by=?'); values.push(recorded_by || null) }
    if (recorded_at !== undefined) { fields.push('recorded_at=?'); values.push(recorded_at || null) }
    if (approval_date !== undefined) { fields.push('approval_date=?'); values.push(approval_date || null) }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

    fields.push('updated_at=NOW()')
    values.push(loanRequestId)
    const sql = `UPDATE approval_transactions SET ${fields.join(', ')} WHERE loan_request_id=?`
    db.query(sql, values, (err) => {
      if (err) {
        console.error('updateApproval error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ===== auto-sync cases.status ตาม workflow (ถ้ามี case) =====
      let newCaseStatus = null
      if (is_cancelled == 1 || is_cancelled === true) {
        newCaseStatus = 'cancelled'
      } else if (approval_status === 'approved') {
        newCaseStatus = 'credit_approved'
      } else if (approval_status === 'pending') {
        newCaseStatus = 'pending_approve'
      }

      if (newCaseStatus) {
        db.query('UPDATE cases SET status = ? WHERE loan_request_id = ?', [newCaseStatus, loanRequestId], (err2) => {
          if (err2) console.error('sync cases.status error:', err2)

          // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
          const io = req.app.get('io')
          const userId = req.user ? req.user.id : null
          db.query('SELECT id FROM cases WHERE loan_request_id = ?', [loanRequestId], (err3, caseRows) => {
            const cId = (caseRows && caseRows.length > 0) ? caseRows[0].id : null
            const extraInfo = approved_credit ? (approved_credit + ' บาท') : ''
            notifyStatusChange(parseInt(loanRequestId), cId, null, newCaseStatus, io, userId, extraInfo)
          })

          res.json({ success: true, message: 'อัพเดทข้อมูลอนุมัติวงเงินสำเร็จ' })
        })
      } else {
        res.json({ success: true, message: 'อัพเดทข้อมูลอนุมัติวงเงินสำเร็จ' })
      }
    })
  }

  // ตรวจสอบว่ามี approval_transaction สำหรับ loan_request_id นี้หรือยัง
  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) {
      console.error('updateApproval check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (!existing || existing.length === 0) {
      // สร้างใหม่ — ไม่ต้องมี case_id
      db.query(
        'INSERT INTO approval_transactions (loan_request_id, approval_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [loanRequestId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('updateApproval insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          buildAndExecuteUpdate()
        }
      )
    } else {
      buildAndExecuteUpdate()
    }
  })
}

// ========== ลบไฟล์ตารางวงเงิน (ใช้ loan_request_id โดยตรง) ==========
exports.deleteCreditTable = (req, res) => {
  const { caseId: loanRequestId } = req.params
  db.query(
    'UPDATE approval_transactions SET credit_table_file = NULL, updated_at = NOW() WHERE loan_request_id = ?',
    [loanRequestId],
    (err) => {
      if (err) {
        console.error('deleteCreditTable error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'ลบไฟล์ตารางวงเงินสำเร็จ' })
    }
  )
}

// ========== อัพโหลดตารางวงเงิน (ใช้ loan_request_id โดยตรง ไม่ต้องมีเคส) ==========
exports.uploadCreditTableMiddleware = uploadCreditTable.single('credit_table_file')

exports.uploadCreditTable = (req, res) => {
  const { caseId: loanRequestId } = req.params
  if (!req.file) return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่อัพโหลด' })

  const filePath = '/uploads/credit_tables/' + req.file.filename

  // ตรวจสอบว่ามี approval_transaction สำหรับ loan_request_id นี้หรือยัง
  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })

    if (!existing || existing.length === 0) {
      // สร้างใหม่พร้อม credit_table_file — ไม่ต้องมี case_id
      db.query(
        'INSERT INTO approval_transactions (loan_request_id, credit_table_file, approval_status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [loanRequestId, filePath, 'pending'],
        (errInsert) => {
          if (errInsert) return res.status(500).json({ success: false, message: 'Server Error' })
          res.json({ success: true, file_path: filePath, message: 'อัพโหลดตารางวงเงินสำเร็จ' })
        }
      )
    } else {
      db.query(
        'UPDATE approval_transactions SET credit_table_file = ?, updated_at = NOW() WHERE loan_request_id = ?',
        [filePath, loanRequestId],
        (err) => {
          if (err) {
            console.error('uploadCreditTable error:', err)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          res.json({ success: true, file_path: filePath, message: 'อัพโหลดตารางวงเงินสำเร็จ' })
        }
      )
    }
  })
}