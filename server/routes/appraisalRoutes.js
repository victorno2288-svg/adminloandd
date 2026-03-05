const express = require('express')
const router = express.Router()
const upload = require('../config/upload')
const appraisalController = require('../controllers/appraisalController')

// ฝ่ายประเมิน
router.get('/stats', appraisalController.getAppraisalStats)
router.get('/cases', appraisalController.getAppraisalCases)
router.get('/cases/:caseId', appraisalController.getCaseDetail)
router.put('/result/:caseId', appraisalController.updateAppraisalResult)

// อัพโหลดเอกสารประเมิน
const appraisalUpload = upload.fields([
  { name: 'appraisal_book_image', maxCount: 1 },
  { name: 'slip_image', maxCount: 1 },
])
router.post('/upload/:caseId', appraisalUpload, appraisalController.uploadAppraisalDoc)
router.put('/cases/:caseId', appraisalUpload, appraisalController.updateAppraisalCase)

// อัพโหลดรูปทรัพย์จากฝ่ายประเมิน (บันทึกลง loan_requests.appraisal_images แยกจากรูปลูกค้า)
const propertyUpload = upload.fields([{ name: 'appraisal_property_image', maxCount: 20 }])
router.post('/property-images/:caseId', propertyUpload, appraisalController.uploadPropertyImages)
router.post('/delete-property-image', appraisalController.deletePropertyImage)

// ลบรูป (ใช้ได้ทุกฟอร์ม)
router.post('/delete-image', appraisalController.deleteImage)

module.exports = router