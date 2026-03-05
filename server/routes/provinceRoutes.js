const express = require('express');
const router = express.Router();
const { getProvinces, getPopularProvinces } = require('../controllers/provinceController');

router.get('/', getProvinces);
router.get('/popular', getPopularProvinces);

module.exports = router;