-- เพิ่มฟิลด์ SOP Screening ใน chat_conversations
-- เพื่อ flag ทรัพย์ที่ไม่ผ่านเกณฑ์ SOP และ intent ของลูกค้า

ALTER TABLE chat_conversations
  ADD COLUMN ineligible_property TINYINT(1) DEFAULT 0 COMMENT 'ทรัพย์ไม่ผ่านเกณฑ์ SOP (ที่เกษตร/น.ส.3/สปก/ตาบอด)' AFTER contract_years,
  ADD COLUMN ineligible_reason VARCHAR(255) DEFAULT NULL COMMENT 'เหตุผลที่ไม่ผ่านเกณฑ์' AFTER ineligible_property,
  ADD COLUMN intent_type VARCHAR(50) DEFAULT NULL COMMENT 'intent: loan_inquiry|ask_interest|ask_fee|contract_renewal|ask_appraisal' AFTER ineligible_reason,
  ADD COLUMN is_refinance TINYINT(1) DEFAULT 0 COMMENT 'ลูกค้าต้องการรีไฟแนนซ์' AFTER intent_type;

-- index สำหรับ filter ทรัพย์ไม่ผ่านเกณฑ์
ALTER TABLE chat_conversations
  ADD INDEX idx_ineligible (ineligible_property);
