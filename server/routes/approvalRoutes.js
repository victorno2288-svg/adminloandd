const express = require('express')
const router = express.Router()
const approvalController = require('../controllers/approvalController')

router.get('/stats', approvalController.getStats)
router.get('/cases', approvalController.getApprovalCases)
router.get('/cases/:caseId', approvalController.getApprovalDetail)
router.put('/cases/:caseId', approvalController.updateApproval)
router.post('/cases/:caseId/upload-credit-table', approvalController.uploadCreditTableMiddleware, approvalController.uploadCreditTable)
router.delete('/cases/:caseId/credit-table', approvalController.deleteCreditTable)

module.exports = router