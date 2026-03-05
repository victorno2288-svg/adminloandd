const db = require('../config/db')
const bcrypt = require('bcryptjs')

// ดึงรายการ admin ทั้งหมด
exports.getAdminUsers = (req, res) => {
  const sql = `
    SELECT id, username, full_name, nickname, email, phone, position, department, status, created_at
    FROM admin_users
    ORDER BY id DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAdminUsers error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// เพิ่ม admin ใหม่
exports.createAdminUser = (req, res) => {
  const { username, full_name, nickname, email, phone, position, department, status, password } = req.body || {}
  if (!full_name) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ-สกุล' })
  if (!username) return res.status(400).json({ success: false, message: 'กรุณากรอก Username' })

  // เช็ค username ซ้ำ
  db.query('SELECT id FROM admin_users WHERE username = ?', [username], (err, rows) => {
    if (err) {
      console.error('createAdminUser check error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Username นี้ถูกใช้งานแล้ว' })
    }

    // hash password (ถ้าไม่กรอก ใช้ Password123!)
    const passwordHash = bcrypt.hashSync(password || 'Password123!', 10)

    const sql = `
      INSERT INTO admin_users (username, full_name, nickname, email, phone, position, department, status, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    db.query(sql, [
      username, full_name, nickname || null, email || null, phone || null,
      position || null, department || null, status || 'active', passwordHash
    ], (err2, result) => {
      if (err2) {
        console.error('createAdminUser error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'เพิ่มผู้ใช้สำเร็จ', id: result.insertId })
    })
  })
}

// แก้ไข admin
exports.updateAdminUser = (req, res) => {
  const { id } = req.params
  const { username, full_name, nickname, email, phone, position, department, status, password } = req.body || {}

  // เช็ค username ซ้ำ (ยกเว้นตัวเอง)
  if (username) {
    db.query('SELECT id FROM admin_users WHERE username = ? AND id != ?', [username, id], (err, rows) => {
      if (err) {
        console.error('updateAdminUser check error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      if (rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Username นี้ถูกใช้งานแล้ว' })
      }
      doUpdate()
    })
  } else {
    doUpdate()
  }

  function doUpdate() {
    const fields = []
    const values = []

    if (username !== undefined) { fields.push('username=?'); values.push(username) }
    if (full_name !== undefined) { fields.push('full_name=?'); values.push(full_name) }
    if (nickname !== undefined) { fields.push('nickname=?'); values.push(nickname || null) }
    if (email !== undefined) { fields.push('email=?'); values.push(email || null) }
    if (phone !== undefined) { fields.push('phone=?'); values.push(phone || null) }
    if (position !== undefined) { fields.push('position=?'); values.push(position || null) }
    if (department !== undefined) { fields.push('department=?'); values.push(department || null) }
    if (status !== undefined) { fields.push('status=?'); values.push(status) }
    if (password) {
      fields.push('password_hash=?'); values.push(bcrypt.hashSync(password, 10))
    }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

    values.push(id)
    db.query(`UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
      if (err) {
        console.error('updateAdminUser error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'อัพเดทสำเร็จ' })
    })
  }
}

// ลบ admin
exports.deleteAdminUser = (req, res) => {
  const { id } = req.params
  db.query('DELETE FROM admin_users WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('deleteAdminUser error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' })
  })
}