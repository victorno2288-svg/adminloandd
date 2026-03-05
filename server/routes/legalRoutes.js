const express = require('express')
const router = express.Router()
const upload = require('../config/uploadLegal')
const legalController = require('../controllers/legalController')

// ฝ่ายนิติกรรม
router.get('/stats', legalController.getStats)
router.get('/cases', legalController.getLegalCases)
router.get('/cases/:caseId', legalController.getLegalDetail)

// อัพโหลดเอกสารนิติกรรม
const legalUpload = upload.fields([
  { name: 'attachment', maxCount: 1 },
  { name: 'doc_selling_pledge', maxCount: 1 },
  { name: 'deed_selling_pledge', maxCount: 1 },
  { name: 'doc_extension', maxCount: 1 },
  { name: 'deed_extension', maxCount: 1 },
  { name: 'doc_redemption', maxCount: 1 },
  { name: 'deed_redemption', maxCount: 1 },
  { name: 'commission_slip', maxCount: 1 },   // ★ สลิปค่าคอมมิชชั่น
])
router.put('/cases/:caseId', legalUpload, legalController.updateLegal)

// ลบเอกสาร
router.post('/delete-document', legalController.deleteDocument)

module.exports = router