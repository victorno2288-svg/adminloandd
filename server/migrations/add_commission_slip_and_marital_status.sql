-- ============================================================
-- Migration: Commission Slip + Marital Status
-- ตามคำสั่งบอส:
--   1) commission_slip บังคับก่อนปิดเคสนิติกรรม
--   2) marital_status สำหรับ checklist เอกสารตามสถานะสมรส
-- ============================================================

-- 1) เพิ่ม commission_slip ใน legal_transactions
ALTER TABLE legal_transactions
  ADD COLUMN commission_slip VARCHAR(500) NULL DEFAULT NULL
  COMMENT 'สลิปค่าคอมมิชชั่น — ต้องอัพโหลดก่อนเปลี่ยนสถานะเป็น completed'
  AFTER deed_redemption;

-- 2) เพิ่ม marital_status ใน loan_requests
ALTER TABLE loan_requests
  ADD COLUMN marital_status ENUM(
    'single',           -- โสด
    'married_reg',      -- สมรสจดทะเบียน
    'married_unreg',    -- สมรสไม่จดทะเบียน
    'divorced',         -- หย่า
    'inherited'         -- รับมรดก
  ) NULL DEFAULT NULL
  COMMENT 'สถานะสมรสของลูกค้า — ใช้กำหนด checklist เอกสาร'
  AFTER loan_purpose;
