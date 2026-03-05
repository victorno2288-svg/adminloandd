-- สร้างตาราง notifications สำหรับเก็บประวัติการแจ้งเตือนทั้งภายในและลูกค้า
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('internal', 'customer') NOT NULL DEFAULT 'internal',
  loan_request_id INT DEFAULT NULL,
  case_id INT DEFAULT NULL,

  -- สำหรับ internal notification
  from_department VARCHAR(50) DEFAULT NULL,
  target_department VARCHAR(50) DEFAULT NULL,
  target_user_id INT DEFAULT NULL,

  -- สำหรับ customer notification
  platform VARCHAR(20) DEFAULT NULL COMMENT 'line, facebook, system',
  customer_platform_id VARCHAR(255) DEFAULT NULL,
  conversation_id INT DEFAULT NULL,

  -- เนื้อหา
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status_from VARCHAR(50) DEFAULT NULL,
  status_to VARCHAR(50) DEFAULT NULL,

  -- สถานะ
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  is_sent TINYINT(1) NOT NULL DEFAULT 0,
  sent_at DATETIME DEFAULT NULL,
  read_at DATETIME DEFAULT NULL,

  -- metadata
  link_url VARCHAR(500) DEFAULT NULL COMMENT 'URL ที่จะ navigate ไปเมื่อคลิก',
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_notif_target_dept (target_department),
  INDEX idx_notif_target_user (target_user_id),
  INDEX idx_notif_loan_request (loan_request_id),
  INDEX idx_notif_case (case_id),
  INDEX idx_notif_is_read (is_read),
  INDEX idx_notif_type (type),
  INDEX idx_notif_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
