const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'general'

    // โฟลเดอร์ตาม fieldname
    if (file.fieldname === 'id_card_image') folder = 'id-cards'
    else if (file.fieldname === 'deed_image') folder = 'deeds'
    else if (file.fieldname === 'property_image') folder = 'properties'
    else if (file.fieldname === 'appraisal_property_image') folder = 'appraisal-properties'
    else if (file.fieldname === 'building_permit') folder = 'permits'
    else if (file.fieldname === 'property_video') folder = 'videos'
    else if (file.fieldname === 'slip_image') folder = 'slips'
    else if (file.fieldname === 'appraisal_book_image') folder = 'appraisal-books'
    else if (['house_reg_book','house_reg_book_legal','name_change_doc','divorce_doc',
              'spouse_consent_doc','spouse_id_card','spouse_reg_copy',
              'marriage_cert','spouse_name_change_doc'].includes(file.fieldname)) folder = 'auction-docs'

    const dir = path.join(uploadDir, folder)
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
  // อนุญาตรูปภาพ + วิดีโอ
  if (file.fieldname === 'property_video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์วิดีโอ'), false)
    }
  } else {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพหรือ PDF'), false)
    }
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

module.exports = upload