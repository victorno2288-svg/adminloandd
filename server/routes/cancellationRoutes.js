const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/cancellationController')

// dropdown data
router.get('/cases', ctrl.getCaseListForCancel)
router.get('/staff', ctrl.getStaffList)

// CRUD
router.get('/', ctrl.getCancellations)
router.post('/', ctrl.createCancellation)

// อนุมัติ / ปฏิเสธ
router.put('/:id/approve', ctrl.approveCancellation)
router.put('/:id/reject', ctrl.rejectCancellation)

module.exports = router