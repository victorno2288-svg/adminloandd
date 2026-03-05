// server/middleware/auth.js
const jwt = require('jsonwebtoken')
const SECRET = 'LoanDD_Secret_Key_2026'

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'ไม่ได้เข้าสู่ระบบ' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}

