-- เพิ่มคอลัมน์ loan_request_id ใน chat_conversations
-- เชื่อมข้อมูลแชทกับลูกหนี้ที่สร้างอัตโนมัติ
ALTER TABLE chat_conversations ADD COLUMN loan_request_id INT DEFAULT NULL;
ALTER TABLE chat_conversations ADD INDEX idx_chat_conv_loan_request_id (loan_request_id);
