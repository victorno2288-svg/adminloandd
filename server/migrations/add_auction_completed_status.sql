-- Migration: เพิ่ม auction_completed ใน cases.status
-- รัน query นี้ใน phpMyAdmin หรือ MySQL client

-- ถ้า status เป็น ENUM ให้ใช้คำสั่งนี้:
-- (ดูค่า ENUM ปัจจุบันก่อนโดย: SHOW COLUMNS FROM cases LIKE 'status';)
-- แล้วแก้ให้ครบตาม workflow:

ALTER TABLE cases
  MODIFY COLUMN status ENUM(
    'new',
    'contacting',
    'incomplete',
    'awaiting_appraisal_fee',
    'appraisal_scheduled',
    'appraisal_passed',
    'appraisal_not_passed',
    'pending_approve',
    'credit_approved',
    'pending_auction',
    'auction_completed',
    'preparing_docs',
    'legal_scheduled',
    'legal_completed',
    'completed',
    'pending_cancel',
    'cancelled'
  ) DEFAULT 'new' COMMENT 'สถานะเคสตาม workflow';

-- ถ้า status เป็น VARCHAR อยู่แล้ว ไม่ต้องรัน query ข้างบน
-- เพราะ VARCHAR รับค่าอะไรก็ได้อยู่แล้ว
