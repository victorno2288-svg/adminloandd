-- เพิ่มคอลัมน์เอกสารออกสัญญาใน issuing_transactions
ALTER TABLE issuing_transactions
  ADD COLUMN doc_selling_pledge VARCHAR(500) DEFAULT NULL COMMENT 'สัญญาธุรกรรมขายฝาก',
  ADD COLUMN doc_mortgage VARCHAR(500) DEFAULT NULL COMMENT 'สัญญาธุรกรรมจำนอง';
