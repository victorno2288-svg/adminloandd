// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// กำหนดเส้นทาง และผูกกับ Controller
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;