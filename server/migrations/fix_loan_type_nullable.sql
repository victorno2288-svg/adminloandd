-- Fix: make loan_type column nullable
-- loan_type_detail is the primary field used in forms; loan_type may not always be sent
ALTER TABLE loan_requests MODIFY COLUMN loan_type VARCHAR(100) NULL DEFAULT NULL;
