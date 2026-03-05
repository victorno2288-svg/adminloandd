const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/investorHistoryController')

// รายชื่อนายทุน (สำหรับ dropdown)
router.get('/investor-list', ctrl.getInvestorList)

// รายการเคส (สำหรับ dropdown เลือกเคส + auto-fill ที่ตั้ง)
router.get('/cases', ctrl.getCaseList)

// History การประมูลนายทุน (CRUD + LEFT JOIN cases)
router.get('/auction', ctrl.getAuctionHistory)
router.post('/auction', ctrl.createAuctionHistory)
router.put('/auction/:id', ctrl.updateAuctionHistory)
router.delete('/auction/:id', ctrl.deleteAuctionHistory)

// History การถอนเงิน
router.get('/withdrawals', ctrl.getWithdrawals)
router.post('/withdrawals', ctrl.createWithdrawal)
router.put('/withdrawals/:id', ctrl.updateWithdrawal)
router.delete('/withdrawals/:id', ctrl.deleteWithdrawal)
router.post('/withdrawals/:id/slip', ctrl.uploadWithdrawalSlip)
router.delete('/withdrawals/:id/slip', ctrl.deleteWithdrawalSlip)

module.exports = router