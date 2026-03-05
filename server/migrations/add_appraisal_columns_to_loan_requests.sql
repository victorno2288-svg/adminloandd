-- ย้ายข้อมูลประเมินจาก cases → loan_requests
-- เพราะข้อมูลประเมินเป็นของลูกหนี้ ยังไม่ใช่เคส จนกว่าจะคอนเฟิร์มทั้งสองฝ่าย

ALTER TABLE loan_requests
  ADD COLUMN appraisal_type ENUM('outside','inside','check_price') DEFAULT 'outside' AFTER appraisal_images,
  ADD COLUMN appraisal_result ENUM('passed','not_passed') DEFAULT NULL AFTER appraisal_type,
  ADD COLUMN appraisal_date DATE DEFAULT NULL AFTER appraisal_result,
  ADD COLUMN appraisal_fee DECIMAL(10,2) DEFAULT NULL AFTER appraisal_date,
  ADD COLUMN slip_image TEXT DEFAULT NULL AFTER appraisal_fee,
  ADD COLUMN appraisal_book_image TEXT DEFAULT NULL AFTER slip_image,
  ADD COLUMN appraisal_note TEXT DEFAULT NULL AFTER appraisal_book_image,
  ADD COLUMN appraisal_recorded_by VARCHAR(100) DEFAULT NULL AFTER appraisal_note,
  ADD COLUMN appraisal_recorded_at DATETIME DEFAULT NULL AFTER appraisal_recorded_by,
  ADD COLUMN outside_result VARCHAR(50) DEFAULT NULL AFTER appraisal_recorded_at,
  ADD COLUMN outside_reason TEXT DEFAULT NULL AFTER outside_result,
  ADD COLUMN outside_recorded_at DATETIME DEFAULT NULL AFTER outside_reason,
  ADD COLUMN inside_result VARCHAR(50) DEFAULT NULL AFTER outside_recorded_at,
  ADD COLUMN inside_reason TEXT DEFAULT NULL AFTER inside_result,
  ADD COLUMN inside_recorded_at DATETIME DEFAULT NULL AFTER inside_reason,
  ADD COLUMN check_price_value DECIMAL(15,2) DEFAULT NULL AFTER inside_recorded_at,
  ADD COLUMN check_price_detail TEXT DEFAULT NULL AFTER check_price_value,
  ADD COLUMN check_price_recorded_at DATETIME DEFAULT NULL AFTER check_price_detail;
