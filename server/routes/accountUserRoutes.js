const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/accountUserController')

router.get('/', ctrl.getAdminUsers)
router.post('/', ctrl.createAdminUser)
router.put('/:id', ctrl.updateAdminUser)
router.delete('/:id', ctrl.deleteAdminUser)

module.exports = router