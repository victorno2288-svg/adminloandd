-- เพิ่มฟิลด์ตาม SOP ฝ่ายขาย ข้อ 2.1.6 (ข้อมูลผู้กู้ + วัตถุประสงค์ + ระยะเวลาสัญญา)

-- 1. loan_requests: เพิ่มฟิลด์ข้อมูลผู้กู้
ALTER TABLE loan_requests ADD COLUMN contact_email VARCHAR(255) NULL DEFAULT NULL AFTER contact_phone;
ALTER TABLE loan_requests ADD COLUMN occupation VARCHAR(255) NULL DEFAULT NULL AFTER contact_email;
ALTER TABLE loan_requests ADD COLUMN monthly_income DECIMAL(15,2) NULL DEFAULT NULL AFTER occupation;
ALTER TABLE loan_requests ADD COLUMN desired_amount DECIMAL(15,2) NULL DEFAULT NULL AFTER monthly_income;
ALTER TABLE loan_requests ADD COLUMN obligation_amount DECIMAL(15,2) NULL DEFAULT NULL AFTER has_obligation;
ALTER TABLE loan_requests ADD COLUMN contract_years INT NULL DEFAULT NULL AFTER obligation_amount;

-- 2. chat_conversations: เพิ่มฟิลด์เก็บข้อมูลจากแชท (ก่อนสร้าง loan_request)
ALTER TABLE chat_conversations ADD COLUMN occupation VARCHAR(255) NULL DEFAULT NULL AFTER customer_email;
ALTER TABLE chat_conversations ADD COLUMN monthly_income DECIMAL(15,2) NULL DEFAULT NULL AFTER occupation;
ALTER TABLE chat_conversations ADD COLUMN desired_amount DECIMAL(15,2) NULL DEFAULT NULL AFTER monthly_income;
ALTER TABLE chat_conversations ADD COLUMN obligation_amount DECIMAL(15,2) NULL DEFAULT NULL AFTER has_obligation;
ALTER TABLE chat_conversations ADD COLUMN contract_years INT NULL DEFAULT NULL AFTER obligation_amount;
