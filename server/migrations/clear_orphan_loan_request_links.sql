-- ล้าง loan_request_id ที่ชี้ไปหา record ที่ถูกลบไปแล้ว
-- เพื่อให้ระบบสร้างลูกหนี้ใหม่ได้เมื่อกรอกฟอร์ม

UPDATE chat_conversations
SET loan_request_id = NULL
WHERE loan_request_id IS NOT NULL
  AND loan_request_id NOT IN (SELECT id FROM loan_requests);
