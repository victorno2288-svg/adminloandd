const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aiSummaryController');

// POST /api/admin/ai-summary/ask — ถาม Claude
router.post('/ask', ctrl.askSummary);

// GET /api/admin/ai-summary/snapshot — ดูสถิติ DB
router.get('/snapshot', ctrl.getSnapshot);

module.exports = router;
