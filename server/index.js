// server/index.js
require('dotenv').config(); // ⬅️ โหลด .env ก่อนทุกอย่าง (ต้องอยู่บรรทัดแรกสุด)
const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const app = express();
const port = 3000;
const path = require('path')
const db = require('./config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'LoanDD_Secret_Key_2026';

// สร้าง HTTP server + Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// เก็บ io ไว้ใช้ใน controller
app.set('io', io);

// ========== Socket.io Authentication ==========
// ตรวจ JWT token ก่อนอนุญาตให้ connect
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('ไม่มี token'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded; // { id, username, department, full_name, ... }
    next();
  } catch (err) {
    return next(new Error('Token ไม่ถูกต้อง'));
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  const user = socket.user;
  const displayName = user.full_name || user.username || user.nickname || 'unknown';
  console.log(`📱 ${displayName} (${user.department}) connected: ${socket.id}`);

  // แอดมินเข้า room กลาง (สำหรับอัพเดท conversation list)
  socket.join('admin_room');

  // เข้า room ตาม user เพื่อให้ส่ง notification เฉพาะคน
  socket.join('user_' + user.id);

  // เข้า room เฉพาะ conversation ที่กำลังดูอยู่
  socket.on('join_conversation', (conversationId) => {
    // ตรวจสิทธิ์: super_admin/admin เข้าได้ทุก conversation
    // เซลล์ต้องเป็น conversation ที่ assign ให้ตัวเอง หรือยังไม่ assign
    if (user.department !== 'super_admin' && user.department !== 'admin') {
      db.query(
        'SELECT assigned_to FROM chat_conversations WHERE id = ?',
        [conversationId],
        (err, rows) => {
          if (err || rows.length === 0) return;
          const assignedTo = rows[0].assigned_to;
          // ถ้า assign ให้คนอื่นแล้ว → ไม่ให้เข้า
          if (assignedTo && assignedTo !== user.id) {
            socket.emit('error_message', 'คุณไม่มีสิทธิ์ดู conversation นี้');
            return;
          }
          // ผ่าน → join room
          joinConvRoom(socket, conversationId);
        }
      );
    } else {
      // super_admin / admin → เข้าได้เลย
      joinConvRoom(socket, conversationId);
    }
  });

  // ออกจาก room conversation
  socket.on('leave_conversation', (conversationId) => {
    socket.leave('conv_' + conversationId);
  });

  socket.on('disconnect', () => {
    console.log(`📱 ${displayName} disconnected: ${socket.id}`);
  });
});

function joinConvRoom(socket, conversationId) {
  // ออกจาก room conversation เก่าก่อน
  socket.rooms.forEach(room => {
    if (room.startsWith('conv_')) socket.leave(room);
  });
  socket.join('conv_' + conversationId);
  console.log(`📱 ${socket.user.full_name || socket.user.username || 'unknown'} joined conv_${conversationId}`);
}

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const salesRoutes = require('./routes/salesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const provinceRoutes = require('./routes/provinceRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const investorRoutes = require('./routes/investorRoutes');
const appraisalRoutes = require('./routes/appraisalRoutes');
const legalRoutes = require('./routes/legalRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const issuingRoutes = require('./routes/issuingRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const investorHistoryRoutes = require('./routes/investorHistoryRoutes');
const cancellationRoutes = require('./routes/cancellationRoutes');
const accountUserRoutes = require('./routes/accountUserRoutes');
const salesManagementRoutes = require('./routes/salesManagementRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiSummaryRoutes = require('./routes/aiSummaryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatWebhookController = require('./controllers/chatWebhookController');

// Middleware
const authMiddleware = require('./middleware/auth');
const { requireDept, superAdminOnly } = require('./middleware/roleMiddleware');

app.set('trust proxy', 1); // รับ X-Forwarded-Proto จาก nginx/reverse proxy (ทำให้ req.protocol = 'https')
app.use(cors());
app.use(express.json());

// ========== Public Routes (ไม่ต้อง login) ==========
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/provinces', provinceRoutes);
app.use('/api/investment-properties', investmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.get('/api/chat/webhook/facebook', chatWebhookController.verifyFacebookWebhook);
app.post('/api/chat/webhook/facebook', chatWebhookController.handleFacebookWebhook);
app.get('/api/chat/webhook/line', chatWebhookController.verifyLineWebhook);
app.post('/api/chat/webhook/line', chatWebhookController.handleLineWebhook);

app.use('/api/admin/dashboard', authMiddleware, dashboardRoutes);
// ========== Admin Routes (ต้อง login + เช็คสิทธิ์ department) ==========
app.use('/api/admin', adminRoutes);
app.use('/api/admin/chat', authMiddleware, chatRoutes);
app.use('/api/admin/ai-summary', authMiddleware, aiSummaryRoutes);
app.use('/api/admin/notifications', authMiddleware, notificationRoutes);

// ฝ่ายขาย
app.use('/api/admin/sales', authMiddleware, requireDept('sales'), salesRoutes);

// นายหน้า (agents) — อยู่ฝ่ายขาย
app.use('/api/admin/sales-management', authMiddleware, requireDept('sales'), salesManagementRoutes);

// ฝ่ายบัญชี
app.use('/api/admin/accounting', authMiddleware, requireDept('accounting'), accountingRoutes);

// ฝ่ายประเมิน
app.use('/api/admin/appraisal', authMiddleware, requireDept('appraisal'), appraisalRoutes);

// ฝ่ายอนุมัติวงเงิน
app.use('/api/admin/approval', authMiddleware, requireDept('approval'), approvalRoutes);

// ฝ่ายนิติกรรม (รวมออกสัญญาแล้ว)
app.use('/api/admin/legal', authMiddleware, requireDept('legal'), legalRoutes);
app.use('/api/admin/issuing', authMiddleware, requireDept('legal'), issuingRoutes);

// ฝ่ายประมูลทรัพย์ (อยู่ใต้ approval แล้ว)
app.use('/api/admin/auction', authMiddleware, requireDept('approval'), auctionRoutes);

// นายทุน
app.use('/api/admin/investors', authMiddleware, requireDept('investors', 'approval'), investorRoutes);
app.use('/api/admin/investor-history', authMiddleware, requireDept('investor-history', 'approval', 'auction'), investorHistoryRoutes);

// ยกเลิกเคส
app.use('/api/admin/cancellation', authMiddleware, requireDept('cancellation', 'legal'), cancellationRoutes);

// จัดการแอคเคาท์ — super_admin เท่านั้น
app.use('/api/admin/account-user', authMiddleware, superAdminOnly, accountUserRoutes);


server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});