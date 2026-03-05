-- แยกรูปทรัพย์ฝ่ายประเมินออกจากรูปลูกค้า/ฝ่ายขาย
-- loan_requests.images = รูปจากลูกค้า/ฝ่ายขาย (บัตรประชาชน, ทรัพย์, ใบอนุญาต, วิดีโอ)
-- loan_requests.appraisal_images = รูปจากฝ่ายประเมินลงพื้นที่ (รูปหลักทรัพย์ที่ทุกฝ่ายเห็น)
ALTER TABLE loan_requests
  ADD COLUMN appraisal_images JSON DEFAULT NULL COMMENT 'รูปทรัพย์จากฝ่ายประเมินลงพื้นที่ (แยกจากรูปลูกค้า)';
