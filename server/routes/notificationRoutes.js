// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// ดึงรายการแจ้งเตือน
router.get('/', notificationController.getNotifications);

// นับ unread
router.get('/unread-count', notificationController.getUnreadCount);

// อ่านแล้ว
router.put('/:id/read', notificationController.markAsRead);

// อ่านทั้งหมด
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;
