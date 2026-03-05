const db = require('../config/db')
const bcrypt = require('bcrypt')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// ========== Multer config สำหรับอัพโหลดสลิป ==========
const slipDir = path.join(__dirname, '..', 'uploads', 'slips')
if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true })

const slipStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, slipDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `slip_${req.params.id}_${Date.now()}${ext}`)
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

// ========== สร้างรหัสนายทุนอัตโนมัติ (CAP0001, CAP0002, ...) ==========
function generateInvestorCode(callback) {
  db.query(
    `SELECT investor_code FROM investors WHERE investor_code IS NOT NULL ORDER BY investor_code DESC LIMIT 1`,
    (err, results) => {
      if (err || results.length === 0) return callback('CAP0001')
      const last = results[0].investor_code // e.g. CAP0002
      const num = parseInt(last.replace('CAP', ''), 10) + 1
      callback('CAP' + String(num).padStart(4, '0'))
    }
  )
}

// ========== GET: รายชื่อนายทุนทั้งหมด ==========
exports.getInvestors = (req, res) => {
  const sql = `
    SELECT id, investor_code, full_name, phone, line_id, email,
      status, investor_level, sort_order, updated_at
    FROM investors
    ORDER BY sort_order ASC, created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getInvestors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายละเอียดนายทุน 1 คน ==========
exports.getInvestorById = (req, res) => {
  const { id } = req.params
  db.query(
    `SELECT id, investor_code, username, full_name, phone, line_id, email,
      status, investor_level, sort_order, updated_at
     FROM investors WHERE id = ?`,
    [id],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ success: false, message: 'Investor not found' })
      }
      res.json({ success: true, data: results[0] })
    }
  )
}

// ========== GET: รหัสนายทุนถัดไป ==========
exports.getNextCode = (req, res) => {
  generateInvestorCode((code) => {
    res.json({ success: true, code })
  })
}

// ========== POST: เพิ่มนายทุนใหม่ ==========
exports.createInvestor = (req, res) => {
  const data = req.body

  generateInvestorCode((code) => {
    const username = data.username || code.toLowerCase()
    const passwordHash = data.password
      ? bcrypt.hashSync(data.password, 10)
      : bcrypt.hashSync(code + '2025', 10)

    const fields = {
      username,
      investor_code: code,
      full_name: data.full_name || null,
      phone: data.phone || null,
      line_id: data.line_id || null,
      email: data.email || null,
      status: data.status || 'active',
      investor_level: data.investor_level || null,
      sort_order: data.sort_order || null,
      password_hash: passwordHash
    }

    const keys = Object.keys(fields)
    const placeholders = keys.map(() => '?').join(', ')
    const values = keys.map(k => fields[k])

    db.query(`INSERT INTO investors (${keys.join(', ')}) VALUES (${placeholders})`, values, (err, result) => {
      if (err) {
        console.error('createInvestor error:', err)
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ success: false, message: 'ข้อมูลซ้ำ (username หรือ email)' })
        }
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'Created', id: result.insertId, investor_code: code })
    })
  })
}

// ========== PUT: แก้ไขนายทุน ==========
exports.updateInvestor = (req, res) => {
  const { id } = req.params
  const data = req.body

  const fields = {
    full_name: data.full_name || null,
    phone: data.phone || null,
    line_id: data.line_id || null,
    email: data.email || null,
    status: data.status || 'active',
    investor_level: data.investor_level || null,
    sort_order: data.sort_order || null,
  }

  const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(fields), id]

  db.query(`UPDATE investors SET ${setClauses} WHERE id = ?`, values, (err, result) => {
    if (err) {
      console.error('updateInvestor error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Investor not found' })
    }
    res.json({ success: true, message: 'Updated' })
  })
}

// ========== DELETE: ลบนายทุน ==========
exports.deleteInvestor = (req, res) => {
  const { id } = req.params
  db.query(`DELETE FROM investors WHERE id = ?`, [id], (err, result) => {
    if (err) {
      console.error('deleteInvestor error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Investor not found' })
    }
    res.json({ success: true, message: 'ลบนายทุนสำเร็จ' })
  })
}

// ========== POST: อัพโหลดสลิป ==========
exports.uploadSlip = (req, res) => {
  uploadSlipMulter(req, res, (err) => {
    if (err) {
      console.error('uploadSlip error:', err)
      return res.status(400).json({ success: false, message: err.message || 'อัพโหลดไม่สำเร็จ' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์' })
    }
    const filePath = `/uploads/slips/${req.file.filename}`
    res.json({ success: true, message: 'อัพโหลดสลิปสำเร็จ', file_path: filePath, filename: req.file.filename })
  })
}

// ========== GET: ดูรายการสลิปของนายทุน ==========
exports.getSlips = (req, res) => {
  const { id } = req.params
  const dir = path.join(__dirname, '..', 'uploads', 'slips')

  if (!fs.existsSync(dir)) return res.json({ success: true, slips: [] })

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(`slip_${id}_`))
    .map(f => ({
      filename: f,
      path: `/uploads/slips/${f}`,
      ext: path.extname(f).toLowerCase(),
      uploadedAt: fs.statSync(path.join(dir, f)).mtime
    }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))

  res.json({ success: true, slips: files })
}

// ========== DELETE: ลบสลิป ==========
exports.deleteSlip = (req, res) => {
  const { filename } = req.params
  const filePath = path.join(__dirname, '..', 'uploads', 'slips', filename)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'ไม่พบไฟล์' })
  }

  fs.unlinkSync(filePath)
  res.json({ success: true, message: 'ลบสลิปสำเร็จ' })
}