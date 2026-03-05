-- Migration: เพิ่มคอลัมน์ credit_table_file ในตาราง approval_transactions
ALTER TABLE approval_transactions
  ADD COLUMN credit_table_file VARCHAR(500) NULL COMMENT 'ไฟล์ตารางวงเงิน' AFTER advance_interest;
