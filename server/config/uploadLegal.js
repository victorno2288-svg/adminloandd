const multer = require('multer')
const path = require('path')
const fs = require('fs')

// โฟลเดอร์หลักเก็บเอกสารนิติกรรม
const baseLegalDir = path.join(__dirname, '..', 'uploads', 'legal')
if (!fs.existsSync(baseLegalDir)) fs.mkdirSync(baseLegalDir, { recursive: true })

// แยกโฟลเดอร์ตามประเภทเอกสาร
const folderMap = {
  attachment: 'attachment',
  doc_selling_pledge: 'doc-selling-pledge',
  deed_selling_pledge: 'deed-selling-pledge',
  doc_extension: 'doc-extension',
  deed_extension: 'deed-extension',
  doc_redemption: 'doc-redemption',
  deed_redemption: 'deed-redemption',
  commission_slip: 'commission-slip',  // ★ สลิปค่าคอมมิชชั่น
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = folderMap[file.fieldname] || 'general'
    const dir = path.join(baseLegalDir, subfolder)
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

const uploadLegal = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

module.exports = uploadLegal