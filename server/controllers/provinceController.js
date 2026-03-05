const db = require('../config/db');

exports.getProvinces = (req, res) => {
  db.query(
    'SELECT id, name, slug, region, is_popular FROM provinces WHERE is_active = 1 ORDER BY sort_order ASC',
    (err, rows) => {
      if (err) {
        console.error('getProvinces error:', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
      }
      res.json({ success: true, data: rows });
    }
  );
};

exports.getPopularProvinces = (req, res) => {
  db.query(
    'SELECT id, name, slug, region FROM provinces WHERE is_active = 1 AND is_popular = 1 ORDER BY sort_order ASC',
    (err, rows) => {
      if (err) {
        console.error('getPopularProvinces error:', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
      }
      res.json({ success: true, data: rows });
    }
  );
};