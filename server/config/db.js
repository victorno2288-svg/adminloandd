// server/config/db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'loandd_db'
});

db.connect((err) => {
    if (err) {
        console.error('❌ เชื่อมต่อ Database ไม่สำเร็จ:', err);
    } else {
        console.log('✅ เชื่อมต่อ MySQL สำเร็จแล้ว!');
    }
});

module.exports = db; // ส่งออกตัวแปร db ให้ไฟล์อื่นใช้