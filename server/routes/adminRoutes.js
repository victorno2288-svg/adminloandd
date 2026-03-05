const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// POST /api/admin/login
router.post('/login', adminController.login);
router.post('/register', adminController.register);

module.exports = router;