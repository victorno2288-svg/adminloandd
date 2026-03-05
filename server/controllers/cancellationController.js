const db = require('../config/db')

// ดึงรายการขอยกเลิกเคสทั้งหมด
exports.getCancellations = (req, res) => {
  const sql = `
    SELECT
      cc.*,
      c.case_code,
      lr.property_address,
      a1.full_name AS requester_name,
      a1.department AS requester_department,
      a2.full_name AS approver_name
    FROM case_cancellations cc
    LEFT JOIN cases c ON c.id = cc.case_id
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN admin_users a1 ON a1.id = cc.requested_by
    LEFT JOIN admin_users a2 ON a2.id = cc.approved_by
    ORDER BY cc.id DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getCancellations error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// เพิ่มรายการขอยกเลิกเคส
exports.createCancellation = (req, res) => {
  const { case_id, requested_by, reason } = req.body || {}
  if (!case_id) return res.status(400).json({ success: false, message: 'กรุณาเลือกเคส' })
  if (!requested_by) return res.status(400).json({ success: false, message: 'กรุณาเลือกเจ้าหน้าที่' })
  if (!reason || !reason.trim()) return res.status(400).json({ success: false, message: 'กรุณากรอกเหตุผล' })

  // ดึง status ปัจจุบันของเคสก่อน เพื่อเก็บไว้ใช้ตอน reject
  db.query('SELECT status FROM cases WHERE id = ?', [case_id], (err0, rows) => {
    if (err0 || rows.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบเคส' })
    const previousStatus = rows[0].status || 'new'

    const sql = `
      INSERT INTO case_cancellations (case_id, requested_by, reason, previous_status, status)
      VALUES (?, ?, ?, ?, 'pending')
    `
    db.query(sql, [case_id, requested_by, reason.trim(), previousStatus], (err, result) => {
      if (err) {
        console.error('createCancellation error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      // อัพเดทสถานะเคสเป็น pending_cancel ให้ฝ่ายขายเห็น
      db.query('UPDATE cases SET status = ? WHERE id = ?', ['pending_cancel', case_id], () => {})
      res.json({ success: true, message: 'ส่งคำขอยกเลิกเคสสำเร็จ', id: result.insertId })
    })
  })
}

// อนุมัติยกเลิกเคส
exports.approveCancellation = (req, res) => {
  const { id } = req.params
  const { approved_by } = req.body || {}

  db.query(
    `UPDATE case_cancellations SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ? AND status = 'pending'`,
    [approved_by || null, id],
    (err, result) => {
      if (err) {
        console.error('approveCancellation error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({ success: false, message: 'ไม่พบรายการหรือสถานะไม่ใช่รอการอนุมัติ' })
      }

      // อัพเดทสถานะเคสเป็น cancelled ด้วย
      db.query('SELECT case_id FROM case_cancellations WHERE id = ?', [id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          db.query('UPDATE cases SET status = ? WHERE id = ?', ['cancelled', rows[0].case_id], () => {})
        }
      })

      res.json({ success: true, message: 'อนุมัติยกเลิกเคสสำเร็จ' })
    }
  )
}

// ปฏิเสธยกเลิกเคส
exports.rejectCancellation = (req, res) => {
  const { id } = req.params
  const { approved_by } = req.body || {}

  db.query(
    `UPDATE case_cancellations SET status = 'rejected', approved_by = ?, approved_at = NOW() WHERE id = ? AND status = 'pending'`,
    [approved_by || null, id],
    (err, result) => {
      if (err) {
        console.error('rejectCancellation error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({ success: false, message: 'ไม่พบรายการหรือสถานะไม่ใช่รอการอนุมัติ' })
      }
      // คืนสถานะเคสกลับไปเป็น previous_status
      db.query('SELECT case_id, previous_status FROM case_cancellations WHERE id = ?', [id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          const restoreStatus = rows[0].previous_status || 'new'
          db.query('UPDATE cases SET status = ? WHERE id = ?', [restoreStatus, rows[0].case_id], () => {})
        }
      })
      res.json({ success: true, message: 'ปฏิเสธคำขอยกเลิกเคสสำเร็จ' })
    }
  )
}

// ดึงรายการเคสทั้งหมด (สำหรับ dropdown)
exports.getCaseListForCancel = (req, res) => {
  const sql = `
    SELECT c.id, c.case_code, lr.property_address
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    ORDER BY c.case_code ASC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getCaseListForCancel error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ดึงรายชื่อเจ้าหน้าที่ทั้งหมด (สำหรับ dropdown - ทุกฝ่าย)
exports.getStaffList = (req, res) => {
  const sql = `
    SELECT id, full_name, department, position
    FROM admin_users
    WHERE status = 'active'
    ORDER BY department ASC, full_name ASC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getStaffList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}