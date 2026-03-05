const db = require('../config/db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// ======================================================================
// ================ History การประมูลนายทุน =============================
// ======================================================================

// ดึงรายการประมูลทั้งหมด LEFT JOIN cases + loan_requests (จังหวัดอยู่ใน loan_requests)
exports.getAuctionHistory = (req, res) => {
  const sql = `
    SELECT
      ah.*,
      u.investor_code,
      u.full_name AS investor_name,
      c.case_code,
      lr.district,
      lr.province
    FROM investor_auction_history ah
    LEFT JOIN investors u ON u.id = ah.investor_id
    LEFT JOIN cases c ON c.id = ah.case_id
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    ORDER BY ah.id DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAuctionHistory error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// เพิ่มรายการประมูล
exports.createAuctionHistory = (req, res) => {
  const { investor_id, case_id, auction_date, winning_price, note } = req.body || {}
  if (!investor_id) return res.status(400).json({ success: false, message: 'กรุณาเลือกนายทุน' })

  const sql = `
    INSERT INTO investor_auction_history (investor_id, case_id, auction_date, winning_price, note)
    VALUES (?, ?, ?, ?, ?)
  `
  db.query(sql, [investor_id, case_id || null, auction_date || null, winning_price || null, note || null], (err, result) => {
    if (err) {
      console.error('createAuctionHistory error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'เพิ่มรายการสำเร็จ', id: result.insertId })
  })
}

// แก้ไขรายการประมูล
exports.updateAuctionHistory = (req, res) => {
  const { id } = req.params
  const { investor_id, case_id, auction_date, winning_price, note } = req.body || {}

  const fields = []
  const values = []
  if (investor_id !== undefined) { fields.push('investor_id=?'); values.push(investor_id) }
  if (case_id !== undefined) { fields.push('case_id=?'); values.push(case_id || null) }
  if (auction_date !== undefined) { fields.push('auction_date=?'); values.push(auction_date || null) }
  if (winning_price !== undefined) { fields.push('winning_price=?'); values.push(winning_price || null) }
  if (note !== undefined) { fields.push('note=?'); values.push(note || null) }

  if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

  values.push(id)
  db.query(`UPDATE investor_auction_history SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) {
      console.error('updateAuctionHistory error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'อัพเดทสำเร็จ' })
  })
}

// ลบรายการประมูล
exports.deleteAuctionHistory = (req, res) => {
  const { id } = req.params
  db.query('DELETE FROM investor_auction_history WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('deleteAuctionHistory error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'ลบรายการสำเร็จ' })
  })
}

// ดึงรายการเคสทั้งหมด (สำหรับ dropdown เลือกเคส + auto-fill ที่ตั้งทรัพย์)
// จังหวัด/อำเภออยู่ในตาราง loan_requests
exports.getCaseList = (req, res) => {
  const sql = `
    SELECT
      c.id,
      c.case_code,
      lr.district,
      lr.province
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    ORDER BY c.case_code ASC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getCaseList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ======================================================================
// ================ History การถอนเงิน ==================================
// ======================================================================

// Multer config สำหรับอัพโหลดสลิปถอนเงิน
const slipDir = path.join(__dirname, '..', 'uploads', 'withdrawal-slips')
if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true })

const slipStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, slipDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `wslip_${req.params.id}_${Date.now()}${ext}`)
  }
})

const uploadSlipMulter = multer({
  storage: slipStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG, PDF'))
  }
}).single('slip')

// ดึงรายการถอนเงินทั้งหมด (JOIN กับ investors + cases)
exports.getWithdrawals = (req, res) => {
  const sql = `
    SELECT w.*, u.investor_code, u.full_name,
      c.case_code
    FROM investor_withdrawals w
    LEFT JOIN investors u ON u.id = w.investor_id
    LEFT JOIN cases c ON c.id = w.case_id
    ORDER BY w.id DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getWithdrawals error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// เพิ่มรายการถอนเงิน (รองรับ FormData + อัพโหลดสลิปตอนเพิ่ม)
exports.createWithdrawal = (req, res) => {
  uploadSlipMulter(req, res, (uploadErr) => {
    if (uploadErr) {
      console.error('createWithdrawal upload error:', uploadErr)
      return res.status(400).json({ success: false, message: uploadErr.message || 'อัพโหลดไม่สำเร็จ' })
    }

    const { investor_id, amount, withdrawal_date, status, note, case_id } = req.body || {}
    if (!investor_id) return res.status(400).json({ success: false, message: 'กรุณาเลือกนายทุน' })
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'กรุณากรอกจำนวนเงิน' })

    // ถ้ามีไฟล์สลิปแนบมา → ใช้ status = transferred
    let slipPath = null
    let finalStatus = status || 'pending'
    if (req.file) {
      slipPath = `/uploads/withdrawal-slips/${req.file.filename}`
      finalStatus = 'transferred'
    }

    const sql = `
      INSERT INTO investor_withdrawals (investor_id, case_id, amount, withdrawal_date, status, note, slip_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    db.query(sql, [investor_id, case_id || null, amount, withdrawal_date || null, finalStatus, note || null, slipPath], (err, result) => {
      if (err) {
        console.error('createWithdrawal error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ถ้ามีสลิป (โอนแล้ว) + เลือก case_id → ปิดเคสอัตโนมัติ
      if (slipPath && case_id) {
        db.query('UPDATE cases SET status = ? WHERE id = ?', ['completed', case_id], (err2) => {
          if (!err2) {
            // sync loan_requests.status ด้วย
            db.query('SELECT loan_request_id FROM cases WHERE id = ?', [case_id], (err3, rows) => {
              if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
                db.query('UPDATE loan_requests SET status = ? WHERE id = ?', ['completed', rows[0].loan_request_id], () => {})
              }
            })
          }
        })
      }

      res.json({ success: true, message: 'เพิ่มรายการถอนเงินสำเร็จ', id: result.insertId })
    })
  })
}

// แก้ไขรายการถอนเงิน
exports.updateWithdrawal = (req, res) => {
  const { id } = req.params
  const { investor_id, amount, withdrawal_date, status, note, case_id } = req.body || {}

  const fields = []
  const values = []
  if (investor_id !== undefined) { fields.push('investor_id=?'); values.push(investor_id) }
  if (case_id !== undefined) { fields.push('case_id=?'); values.push(case_id || null) }
  if (amount !== undefined) { fields.push('amount=?'); values.push(amount) }
  if (withdrawal_date !== undefined) { fields.push('withdrawal_date=?'); values.push(withdrawal_date || null) }
  if (status !== undefined) { fields.push('status=?'); values.push(status) }
  if (note !== undefined) { fields.push('note=?'); values.push(note || null) }

  if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

  values.push(id)
  db.query(`UPDATE investor_withdrawals SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) {
      console.error('updateWithdrawal error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'อัพเดทสำเร็จ' })
  })
}

// ลบรายการถอนเงิน
exports.deleteWithdrawal = (req, res) => {
  const { id } = req.params
  // ลบสลิปด้วยถ้ามี
  db.query('SELECT slip_path FROM investor_withdrawals WHERE id = ?', [id], (err, rows) => {
    if (!err && rows.length > 0 && rows[0].slip_path) {
      const filePath = path.join(__dirname, '..', rows[0].slip_path)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    db.query('DELETE FROM investor_withdrawals WHERE id = ?', [id], (err2) => {
      if (err2) {
        console.error('deleteWithdrawal error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'ลบรายการสำเร็จ' })
    })
  })
}

// อัพโหลดสลิปสำหรับรายการถอนเงิน
exports.uploadWithdrawalSlip = (req, res) => {
  uploadSlipMulter(req, res, (err) => {
    if (err) {
      console.error('uploadWithdrawalSlip error:', err)
      return res.status(400).json({ success: false, message: err.message || 'อัพโหลดไม่สำเร็จ' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์' })
    }
    const slipPath = `/uploads/withdrawal-slips/${req.file.filename}`
    // อัพเดท slip_path + status = transferred
    db.query('UPDATE investor_withdrawals SET slip_path = ?, status = ? WHERE id = ?', [slipPath, 'transferred', req.params.id], (err2) => {
      if (err2) {
        console.error('uploadWithdrawalSlip update error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ถ้ามี case_id → ปิดเคสอัตโนมัติ (completed)
      db.query('SELECT case_id FROM investor_withdrawals WHERE id = ?', [req.params.id], (err3, rows) => {
        if (!err3 && rows.length > 0 && rows[0].case_id) {
          const caseId = rows[0].case_id
          db.query('UPDATE cases SET status = ? WHERE id = ?', ['completed', caseId], (err4) => {
            if (!err4) {
              db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err5, cRows) => {
                if (!err5 && cRows.length > 0 && cRows[0].loan_request_id) {
                  db.query('UPDATE loan_requests SET status = ? WHERE id = ?', ['matched', cRows[0].loan_request_id], () => {})
                }
              })
            }
          })
        }
      })

      res.json({ success: true, message: 'อัพโหลดสลิปสำเร็จ — เคสถูกปิดอัตโนมัติ', slip_path: slipPath })
    })
  })
}

// ลบสลิปถอนเงิน
exports.deleteWithdrawalSlip = (req, res) => {
  const { id } = req.params
  db.query('SELECT slip_path FROM investor_withdrawals WHERE id = ?', [id], (err, rows) => {
    if (err) {
      console.error('deleteWithdrawalSlip error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบรายการ' })
    // ลบไฟล์สลิปจากเซิร์ฟเวอร์
    if (rows[0].slip_path) {
      const filePath = path.join(__dirname, '..', rows[0].slip_path)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    // อัพเดท slip_path เป็น null
    db.query('UPDATE investor_withdrawals SET slip_path = NULL WHERE id = ?', [id], (err2) => {
      if (err2) {
        console.error('deleteWithdrawalSlip update error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'ลบสลิปสำเร็จ' })
    })
  })
}

// ดึงรายชื่อนายทุน (สำหรับ dropdown เลือกในฟอร์ม)
exports.getInvestorList = (req, res) => {
  const sql = `
    SELECT id, investor_code, full_name
    FROM investors
    ORDER BY sort_order ASC, investor_code ASC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getInvestorList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}