const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const secretKey = 'LoanDD_Secret_Key_2026';

// ==========================================
// ฟังก์ชันสมัครสมาชิก
// POST /api/auth/register
// ==========================================
exports.register = async (req, res) => {
    const { username, password, email, phone, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (username, password_hash, email, phone, role) VALUES (?, ?, ?, ?, ?)`;

        db.query(sql, [username, hashedPassword, email, phone, role], (err, result) => {
            if (err) {
                console.error(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).send('ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว');
                }
                return res.status(500).send('สมัครสมาชิกไม่สำเร็จ');
            }
            res.send('สมัครสมาชิกสำเร็จ!');
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// ==========================================
// ฟังก์ชันเข้าสู่ระบบ
// POST /api/auth/login
// ==========================================
exports.login = (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';

    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).send('Server Error');
        if (results.length === 0) return res.status(401).send('ไม่พบชื่อผู้ใช้งาน');

        const user = results[0];

        // ✅ เช็คสถานะบัญชี (active / suspended / banned)
        if (user.status === 'suspended') {
            return res.status(403).send('บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อแอดมิน');
        }
        if (user.status === 'banned') {
            return res.status(403).send('บัญชีของคุณถูกปิดการใช้งาน');
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).send('รหัสผ่านไม่ถูกต้อง');

        const token = jwt.sign(
            { id: user.id, role: user.role, department: user.department },
            secretKey,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login สำเร็จ',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                department: user.department,
                is_verified: user.is_verified  // ✅ ส่งสถานะยืนยันกลับไปด้วย
            }
        });
    });
};

// ==========================================
// ★ ดึงข้อมูล User ปัจจุบัน (ใช้ตรวจ Token + ดึง is_verified)
// GET /api/auth/me
// Headers: Authorization: Bearer <token>
// ==========================================
exports.me = (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'ไม่พบ Token กรุณาเข้าสู่ระบบ' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token หมดอายุหรือไม่ถูกต้อง' });
        }

        // ดึงข้อมูลล่าสุดจาก DB (เพราะ is_verified อาจเปลี่ยนหลัง Login)
        const sql = 'SELECT id, username, email, phone, role, department, is_verified, status, created_at FROM users WHERE id = ?';

        db.query(sql, [decoded.id], (err, results) => {
            if (err) {
                console.error('Auth/me query error:', err);
                return res.status(500).json({ error: 'Server Error' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'ไม่พบผู้ใช้นี้' });
            }

            const user = results[0];

            // เช็คสถานะบัญชี
            if (user.status === 'suspended' || user.status === 'banned') {
                return res.status(403).json({ error: 'บัญชีถูกระงับ', status: user.status });
            }

            res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role,
                department: user.department,
                is_verified: user.is_verified,
                created_at: user.created_at
            });
        });
    });
};