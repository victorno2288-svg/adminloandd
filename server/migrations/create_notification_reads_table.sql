-- สร้างตาราง notification_reads สำหรับ per-user read tracking
-- แต่ละ user อ่านแจ้งเตือนแยกกัน ไม่ใช่ global is_read
-- รัน: mysql -u <user> -p <db_name> < migrations/create_notification_reads_table.sql

CREATE TABLE IF NOT EXISTS notification_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user_notif (notification_id, user_id),
  KEY idx_nr_user_id (user_id),
  KEY idx_nr_notification_id (notification_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
