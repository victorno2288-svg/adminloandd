const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');

// Public routes (หน้าบ้าน - ไม่ต้อง login)
router.get('/', propertyController.getAllProperties);
router.get('/featured', propertyController.getFeaturedProperties);
router.get('/latest', propertyController.getLatestProperties);
router.get('/counts', propertyController.getPropertyCounts);
router.get('/:id', propertyController.getPropertyById);

module.exports = router;