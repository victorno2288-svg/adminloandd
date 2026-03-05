-- แก้ province ให้เป็น NULL ได้ (ไม่บังคับกรอก)
-- รันคำสั่งนี้ใน MySQL:

ALTER TABLE loan_requests MODIFY COLUMN province VARCHAR(100) NULL DEFAULT NULL;

-- ถ้ามี property_type ที่เป็น NOT NULL ด้วย ก็แก้เลย:
ALTER TABLE loan_requests MODIFY COLUMN property_type VARCHAR(100) NULL DEFAULT NULL;
