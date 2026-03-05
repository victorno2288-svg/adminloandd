const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const secretKey = 'LoanDD_Secret_Key_2026';

// ==========================================
// Admin Login
// POST /api/admin/login
// ==========================================
exports.login = (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM admin_users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server Error' });
        if (results.length === 0) return res.status(401).json({ success: false, message: 'ไม่พบชื่อผู้ใช้' });

        const user = results[0];

        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: 'บัญชีถูกระงับ' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });

        const token = jwt.sign(
            { id: user.id, department: user.department, position: user.position },
            secretKey,
            { expiresIn: '1d' }
        );

        // อัพเดท last_login
        db.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [user.id]);

        res.json({
            success: true,
            message: 'Login สำเร็จ',
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                nickname: user.nickname,
                department: user.department,
                position: user.position,
                avatar_url: user.avatar_url
            }
        });
    });
};

// ==========================================
// Admin Register
// POST /api/admin/register
// ==========================================
exports.register = async (req, res) => {
    const { username, password, full_name, nickname, email, phone, department, position } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอก username และ password' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO admin_users (username, password_hash, full_name, nickname, email, phone, department, position)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [username, hashedPassword, full_name, nickname, email, phone, department || null, position], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
                }
                return res.status(500).json({ success: false, message: 'Server Error' });
            }
            res.json({ success: true, message: 'ลงทะเบียนสำเร็จ' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};