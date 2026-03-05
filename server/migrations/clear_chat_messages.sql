-- ลบข้อความแชททั้งหมด (เก็บรายการสนทนาไว้)
TRUNCATE TABLE chat_messages;

-- รีเซ็ต last_message ในรายการสนทนา
UPDATE chat_conversations SET last_message_text = NULL, last_message_at = NULL, status = 'read';
