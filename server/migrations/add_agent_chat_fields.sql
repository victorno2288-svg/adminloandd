-- Migration: เพิ่ม column ข้อมูลนายหน้าใน chat_conversations
-- รันใน phpMyAdmin หรือ MySQL client
-- วันที่: 2026-03-02

ALTER TABLE chat_conversations
  ADD COLUMN is_agent        TINYINT(1)   NOT NULL DEFAULT 0    AFTER contract_years,
  ADD COLUMN agent_name      VARCHAR(255) NULL     DEFAULT NULL  AFTER is_agent,
  ADD COLUMN agent_phone     VARCHAR(20)  NULL     DEFAULT NULL  AFTER agent_name;

-- Index ช่วย lookup นายหน้าจากเบอร์
CREATE INDEX idx_chat_conv_agent_phone ON chat_conversations (agent_phone);
