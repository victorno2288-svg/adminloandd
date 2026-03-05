const express = require('express');
const router = express.Router();
const investmentPropertyController = require('../controllers/investmentController');



// ==========================================
// JWT Auth Middleware — ตรวจสอบ Token ก่อนเข้าถึง Protected Routes
// ==========================================
const secretKey = 'LoanDD_Secret_Key_2026';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            console.error('JWT verify error:', err.message);
            return res.status(403).json({ error: 'Token หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
        }
        req.user = decoded; // { id, role, department, iat, exp }
        next();
    });
};


// ==========================================
// PUBLIC ROUTES (ไม่ต้อง Login)
// ==========================================

// ดึงทรัพย์ล่าสุด (ต้องอยู่ก่อน /:id ไม่งั้น "latest" จะถูกจับเป็น id)
router.get('/latest', investmentPropertyController.getLatestProperties);

// นับจำนวนตามประเภท
router.get('/counts', investmentPropertyController.getPropertyCounts);

// ดึงจังหวัดที่มีทรัพย์
router.get('/provinces', investmentPropertyController.getProvinceList);

// คำนวณผลตอบแทน
router.post('/calculate-return', investmentPropertyController.calculateReturn);


// ==========================================
// PROTECTED ROUTES (ต้อง Login — ใช้ JWT)
// ==========================================

// ★ ลงประกาศทรัพย์ใหม่ (Borrower) — ต้อง Login
router.post('/create', authenticateToken, investmentPropertyController.createProperty);


// ==========================================
// PUBLIC ROUTES (ต่อ)
// ==========================================

// ดึงรายการทั้งหมด (พร้อม filter + pagination)
router.get('/', investmentPropertyController.getAllProperties);

// ดึงรายละเอียดตาม ID (ต้องอยู่ล่างสุด เพราะ /:id จับทุกอย่าง)
router.get('/:id', investmentPropertyController.getPropertyById);

module.exports = router;

