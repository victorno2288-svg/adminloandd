const express = require('express')
const router = express.Router()
const investorController = require('../controllers/investorController')

// จัดการนายทุน
router.get('/', investorController.getInvestors)
router.get('/next-code', investorController.getNextCode)
router.get('/:id', investorController.getInvestorById)
router.post('/', investorController.createInvestor)
router.put('/:id', investorController.updateInvestor)
router.delete('/:id', investorController.deleteInvestor)

// สลิป
router.get('/:id/slips', investorController.getSlips)
router.post('/:id/slips', investorController.uploadSlip)
router.delete('/slips/:filename', investorController.deleteSlip)

module.exports = router