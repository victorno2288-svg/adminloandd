const multer = require('multer')
const path = require('path')
const fs = require('fs')

// โฟลเดอร์หลักเก็บเอกสารออกสัญญา
const baseIssuingDir = path.join(__dirname, '..', 'uploads', 'issuing')
if (!fs.existsSync(baseIssuingDir)) fs.mkdirSync(baseIssuingDir, { recursive: true })

// แยกโฟลเดอร์ตามประเภทเอกสาร
const folderMap = {
  doc_selling_pledge: 'doc-selling-pledge',
  doc_mortgage: 'doc-mortgage',
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = folderMap[file.fieldname] || 'general'
    const dir = path.join(baseIssuingDir, subfolder)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`
    cb(null, name)
  }
})

const fileFilter = (req, file, cb) => {
  // อนุญาตรูปภาพ + PDF
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true)
  } else {
    cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพหรือ PDF'), false)
  }
}

const uploadIssuing = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

module.exports = uploadIssuing
