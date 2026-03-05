const express = require('express')
const router = express.Router()
const upload = require('../config/upload')
const salesController = require('../controllers/salesController')

// ฟิลด์ไฟล์ที่รับจาก SalesFormPage
const debtorUpload = upload.fields([
  { name: 'id_card_image', maxCount: 5 },
  { name: 'deed_image', maxCount: 5 },
  { name: 'property_image', maxCount: 10 },
  { name: 'building_permit', maxCount: 5 },
  { name: 'property_video', maxCount: 5 },
])

// ฟิลด์ไฟล์สำหรับนายหน้า (บัตร ปชช. นายหน้า + ไฟล์ลูกหนี้ทั้งหมด)
const agentUpload = upload.fields([
  { name: 'id_card_image', maxCount: 1 },      // บัตร ปชช. นายหน้า
  { name: 'debtor_id_card', maxCount: 5 },      // บัตร ปชช. ลูกหนี้
  { name: 'deed_image', maxCount: 5 },           // รูปโฉนด
  { name: 'property_image', maxCount: 10 },      // รูปทรัพย์
  { name: 'building_permit', maxCount: 5 },      // ใบอนุญาต
  { name: 'property_video', maxCount: 5 },       // วีดีโอ
])

// ฟิลด์ไฟล์สำหรับเคส (สลิป + เล่มประเมิน)
const caseUpload = upload.fields([
  { name: 'slip_image', maxCount: 1 },
  { name: 'appraisal_book_image', maxCount: 1 },
])

// สถิติ
router.get('/stats', salesController.getSalesStats)

// Auto-matching (ค้นหาคู่ลูกหนี้-นายหน้า)
router.get('/find-match', salesController.findMatch)

// ID ลูกหนี้
router.get('/debtors', salesController.getDebtors)
router.post('/debtors', debtorUpload, salesController.createDebtor)
router.get('/debtors/:id', salesController.getDebtorById)
router.put('/debtors/:id', debtorUpload, salesController.updateDebtor)
router.delete('/debtors/:id', salesController.deleteDebtor)

// ลบรูปทีละรูปจาก loan_requests (JSON array)
router.post('/remove-image', salesController.removeDebtorImage)

// อัพเดทสถานะชำระ ใน loan_requests (ก่อนมีเคส)
router.patch('/debtors/:id/payment-status', salesController.updateDebtorPaymentStatus)

// อัพเดทประเภทสินเชื่อ inline (loan_type_detail)
router.patch('/debtors/:id/loan-type', salesController.updateLoanType)

// อัพโหลดรูปลูกหนี้เพิ่ม (ใช้จาก CaseEditPage)
router.post('/debtors/:id/upload-images', debtorUpload, salesController.uploadDebtorImages)

// ID เคส
router.get('/cases', salesController.getCases)
router.post('/cases', caseUpload, salesController.createCase)
router.get('/cases/:id', salesController.getCaseById)
router.put('/cases/:id', caseUpload, salesController.updateCaseStatus)
router.delete('/cases/:id', salesController.deleteCase)

// ID นายหน้า
router.get('/agents', salesController.getAgents)
router.post('/agents', agentUpload, salesController.createAgent)
router.get('/agents/:id', salesController.getAgentById)
router.put('/agents/:id', agentUpload, salesController.updateAgent)
router.delete('/agents/:id', salesController.deleteAgent)

module.exports = router
