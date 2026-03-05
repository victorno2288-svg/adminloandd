const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// ===== Conversations =====
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id', chatController.getConversationDetail);
router.post('/conversations/:id/reply', chatController.sendReply);
router.post('/conversations/:id/upload', chatController.chatUpload.single('file'), chatController.sendFileReply);
router.put('/conversations/:id/note', chatController.updateNote);
router.put('/conversations/:id/info', chatController.updateCustomerInfo);
router.put('/conversations/:id/assign', chatController.assignConversation);
router.get('/conversations/:id/linked-user', chatController.getLinkedUser);
router.post('/conversations/:id/create-loan-request', chatController.manualCreateLoanRequest);
router.post('/conversations/:id/sync-loan-request', chatController.syncLoanRequest);

// ===== Sync (ดึงข้อมูลจาก API) =====
router.post('/sync/facebook', chatController.syncFacebook);
router.post('/sync/line', chatController.syncLine);

// ===== Platform config =====
router.get('/platforms', chatController.getPlatforms);
router.post('/platforms', chatController.createPlatform);
router.delete('/platforms/:id', chatController.deletePlatform);

// ===== Tags (แท็กสถานะ) =====
router.get('/tags', chatController.getTags);
router.post('/tags', chatController.createTag);
router.put('/tags/:id', chatController.updateTag);
router.delete('/tags/:id', chatController.deleteTag);
router.put('/conversations/:id/tag', chatController.setConversationTag);

// ===== Proxy (ดึงรูปภาพ/วิดีโอจาก LINE) =====
router.get('/proxy/line-content/:messageId', chatController.proxyLineContent);

// ===== Stats =====
router.get('/stats', chatController.getStats);

// ===== Archive (ล้างข้อมูลเก่า) =====
router.get('/archive/preview', chatController.previewArchive);
router.post('/archive/execute', chatController.executeArchive);

module.exports = router;

// ===== Webhook routes (ต้อง mount แยก ไม่ผ่าน authMiddleware) =====
// ใน index.js ต้องเพิ่ม (เฉพาะตอนมี domain จริง หรือใช้ ngrok):
//   const chatWebhookController = require('./controllers/chatWebhookController');
//   app.get('/api/chat/webhook/facebook', chatWebhookController.verifyFacebookWebhook);
//   app.post('/api/chat/webhook/facebook', chatWebhookController.handleFacebookWebhook);
//   app.get('/api/chat/webhook/line', chatWebhookController.verifyLineWebhook);
//   app.post('/api/chat/webhook/line', chatWebhookController.handleLineWebhook);