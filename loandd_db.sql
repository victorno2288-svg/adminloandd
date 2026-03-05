-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 04, 2026 at 03:05 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `loandd_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

CREATE TABLE `admin_users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `department` enum('super_admin','admin','sales','accounting','legal','appraisal','issuing','approval','auction') DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `status` enum('active','suspended','banned') DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `password_hash`, `full_name`, `nickname`, `email`, `phone`, `department`, `position`, `avatar_url`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'ภัคจิรา', '$2b$10$9w8osaagoxsoTPzmEQm83.rnug3meF2iyC0OTS7CEjzxKNgsAjsK6', 'ภัคจิรา อุดมนา', 'แฟรี่', 'lafatano22@gmail.com', '0956504157', 'super_admin', 'เทสเตอร์', NULL, 'active', '2026-03-02 15:22:04', '2026-02-17 04:24:05', '2026-03-02 08:22:04'),
(3, 'ดา', '$2b$10$ahsOrgwr7Plhyki4HDVZZuw/T5a/QfRGVDW5L14IohiiinZ2lELry', 'ดา', 'ก็ดา', 'loandd02@gmail.com', '0956504157', 'sales', 'เทสเตอร์', NULL, 'active', '2026-03-04 08:29:40', '2026-02-19 08:28:41', '2026-03-04 01:29:40'),
(5, 'นุ่น', '$2b$10$2ZMbmErFoZ6rnCU7Ydzi4.cJ3gZimihr88fIhmrlUFKTLxGUHGBqW', 'คคคคค', 'คคคค', 'llll2@gmail.com', '00000000000', 'sales', 'ทาย', NULL, 'active', '2026-02-20 16:44:17', '2026-02-20 09:16:13', '2026-02-20 09:44:17');

-- --------------------------------------------------------

--
-- Table structure for table `agents`
--

CREATE TABLE `agents` (
  `id` int(11) NOT NULL,
  `agent_code` varchar(20) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `line_id` varchar(100) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT 0.00,
  `id_card_image` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `agents`
--

INSERT INTO `agents` (`id`, `agent_code`, `full_name`, `nickname`, `phone`, `email`, `line_id`, `commission_rate`, `id_card_image`, `status`, `created_at`, `updated_at`) VALUES
(1, 'LDD0001', 'ง่วง', 'ไม่บอก', '00000000', 'loandd02@gmail.com', '@kkk', 90.00, 'uploads/id-cards/1771467780103-403.jpg', 'active', '2026-02-18 04:20:15', '2026-02-23 10:27:33'),
(2, 'LDD0002', 'ลอง', 'ระบบ', '0956504157', 'aaaa@hotmail.com', 'fffff', 3.00, 'uploads/id-cards/1771813661205-559.jpeg', 'active', '2026-02-23 02:27:41', '2026-03-02 09:09:39'),
(5, 'AGT0001', 'ธาม', 'ทาย', '09998788', 'lo@gmail.com', '@mager', 0.40, 'uploads/id-cards/1771921287418-288.jpg', 'active', '2026-02-24 08:21:27', '2026-02-24 08:36:33');

-- --------------------------------------------------------

--
-- Table structure for table `agent_accounting`
--

CREATE TABLE `agent_accounting` (
  `id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `case_id` int(11) DEFAULT NULL,
  `team` varchar(50) DEFAULT NULL,
  `commission_amount` decimal(12,2) DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `commission_slip` varchar(500) DEFAULT NULL,
  `payment_status` enum('paid','unpaid') DEFAULT 'unpaid',
  `recorded_by` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `agent_accounting`
--

INSERT INTO `agent_accounting` (`id`, `agent_id`, `case_id`, `team`, `commission_amount`, `payment_date`, `commission_slip`, `payment_status`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 1, 1, NULL, 7000.00, NULL, '/uploads/general/1771404040482-748.jpg', 'paid', 'ทาย', '2026-02-18 08:40:59', '2026-02-18 08:40:59'),
(2, 2, 2, NULL, 7777.00, '2026-02-23', '/uploads/general/1771813974218-632.jpg', 'paid', 'f', '2026-02-23 02:33:16', '2026-02-23 02:33:16');

-- --------------------------------------------------------

--
-- Table structure for table `approval_transactions`
--

CREATE TABLE `approval_transactions` (
  `id` int(11) NOT NULL,
  `case_id` int(11) DEFAULT NULL,
  `loan_request_id` int(11) DEFAULT NULL,
  `approval_type` enum('selling_pledge','mortgage') DEFAULT NULL COMMENT 'ประเภท: ขายฝาก/จำนอง',
  `approved_credit` decimal(15,2) DEFAULT NULL COMMENT 'วงเงินอนุมัติ',
  `interest_per_year` decimal(10,2) DEFAULT NULL COMMENT 'ดอกเบี้ยต่อปี',
  `interest_per_month` decimal(10,2) DEFAULT NULL COMMENT 'ดอกเบี้ยต่อเดือน',
  `operation_fee` decimal(15,2) DEFAULT NULL COMMENT 'ค่าดำเนินการ',
  `land_tax_estimate` decimal(15,2) DEFAULT NULL COMMENT 'ค่าประมาณการภาษีจากกรมที่ดิน',
  `advance_interest` decimal(15,2) DEFAULT NULL COMMENT 'ดอกเบี้ยล่วงหน้า',
  `credit_table_file` varchar(500) DEFAULT NULL,
  `is_cancelled` tinyint(1) DEFAULT 0 COMMENT 'ยกเลิกรายการเคสนี้',
  `approval_status` enum('pending','approved','cancelled') DEFAULT 'pending' COMMENT 'สถานะ: ผ่านประเมิน/อนุมัติวงเงิน/เคสยกเลิก',
  `recorded_by` varchar(100) DEFAULT NULL COMMENT 'ผู้บันทึก',
  `recorded_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่บันทึก',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approval_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `approval_transactions`
--

INSERT INTO `approval_transactions` (`id`, `case_id`, `loan_request_id`, `approval_type`, `approved_credit`, `interest_per_year`, `interest_per_month`, `operation_fee`, `land_tax_estimate`, `advance_interest`, `credit_table_file`, `is_cancelled`, `approval_status`, `recorded_by`, `recorded_at`, `created_at`, `updated_at`, `approval_date`) VALUES
(1, 1, NULL, 'mortgage', 45555.00, 0.50, 45.00, 23333.00, 33333.00, 33333.00, NULL, 0, 'cancelled', 'ทาย', '2026-02-18 22:02:00', '2026-02-19 04:11:25', '2026-02-26 08:11:24', NULL),
(6, 1, 18, 'mortgage', NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/credit_tables/credit_1772186128377.pdf', 1, 'pending', NULL, NULL, '2026-02-27 07:46:24', '2026-02-27 09:55:29', NULL),
(7, NULL, 29, 'selling_pledge', 30000.00, 4.50, 0.18, 40000.00, 5000.00, 20000.00, '/uploads/credit_tables/credit_1772179351921.jpg', 0, 'pending', 'fairy', '2026-02-27 08:03:00', '2026-02-27 08:02:25', '2026-02-27 08:26:29', '2026-02-26'),
(8, NULL, 30, 'mortgage', 600000.00, 4.00, 1.40, 30000.00, 29998.00, 2000.00, '/uploads/credit_tables/credit_1772182642291.jpg', 0, 'pending', 'g', '2026-02-27 15:57:00', '2026-02-27 08:56:29', '2026-02-27 08:57:38', '2026-02-27'),
(9, NULL, 33, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', NULL, NULL, '2026-03-02 02:17:42', '2026-03-02 02:17:42', NULL),
(10, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', NULL, NULL, '2026-03-02 07:23:12', '2026-03-02 07:23:12', NULL),
(11, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'cancelled', NULL, NULL, '2026-03-02 08:47:07', '2026-03-02 08:47:10', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `auction_bids`
--

CREATE TABLE `auction_bids` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `bid_amount` decimal(15,2) DEFAULT NULL,
  `investor_id` int(11) DEFAULT NULL,
  `investor_name` varchar(255) DEFAULT NULL,
  `investor_code` varchar(100) DEFAULT NULL,
  `investor_phone` varchar(50) DEFAULT NULL,
  `bid_date` date DEFAULT NULL,
  `note` text DEFAULT NULL,
  `recorded_by` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auction_bids`
--

INSERT INTO `auction_bids` (`id`, `case_id`, `bid_amount`, `investor_id`, `investor_name`, `investor_code`, `investor_phone`, `bid_date`, `note`, `recorded_by`, `created_at`, `updated_at`) VALUES
(2, 8, 9000.00, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', '2026-02-27', NULL, 'fairy', '2026-02-27 15:37:39', '2026-02-27 15:37:39'),
(3, 8, 400000000000.00, 3, 'พี่เป้', 'CAP0001', '000000000', NULL, NULL, 'fairy', '2026-02-27 15:37:52', '2026-02-27 15:37:52'),
(4, 9, 600000.00, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', NULL, NULL, 'f', '2026-02-27 16:08:21', '2026-02-27 16:08:21');

-- --------------------------------------------------------

--
-- Table structure for table `auction_transactions`
--

CREATE TABLE `auction_transactions` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `investor_id` int(11) DEFAULT NULL,
  `investor_name` varchar(200) DEFAULT NULL,
  `investor_code` varchar(50) DEFAULT NULL,
  `investor_phone` varchar(50) DEFAULT NULL,
  `investor_type` enum('corporate','individual') DEFAULT NULL,
  `property_value` decimal(15,2) DEFAULT NULL,
  `selling_pledge_amount` decimal(15,2) DEFAULT NULL,
  `interest_rate` decimal(10,2) DEFAULT NULL,
  `auction_land_area` varchar(100) DEFAULT NULL,
  `contract_years` int(11) DEFAULT NULL,
  `house_reg_book` text DEFAULT NULL COMMENT 'เล่มทะเบียนบ้าน (JSON array)',
  `house_reg_book_legal` text DEFAULT NULL COMMENT 'เล่มทะเบียนบ้านที่ทำนิติกรรม (JSON array)',
  `name_change_doc` text DEFAULT NULL COMMENT 'ใบเปลี่ยนชื่อนามสกุล (JSON array)',
  `divorce_doc` text DEFAULT NULL COMMENT 'ใบหย่า (JSON array)',
  `spouse_consent_doc` text DEFAULT NULL COMMENT 'หนังสือยินยอมคู่สมรส (JSON array)',
  `spouse_id_card` text DEFAULT NULL COMMENT 'บัตรประชาชนคู่สมรส (JSON array)',
  `spouse_reg_copy` text DEFAULT NULL COMMENT 'สำเนาทะเบียนคู่สมรส (JSON array)',
  `marriage_cert` text DEFAULT NULL COMMENT 'ทะเบียนสมรส (JSON array)',
  `spouse_name_change_doc` text DEFAULT NULL COMMENT 'ใบเปลี่ยนชื่อนามสกุลคู่สมรส (JSON array)',
  `is_cancelled` tinyint(1) DEFAULT 0,
  `auction_status` enum('pending','auctioned','cancelled') DEFAULT 'pending',
  `recorded_by` varchar(100) DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auction_transactions`
--

INSERT INTO `auction_transactions` (`id`, `case_id`, `investor_id`, `investor_name`, `investor_code`, `investor_phone`, `investor_type`, `property_value`, `selling_pledge_amount`, `interest_rate`, `auction_land_area`, `contract_years`, `house_reg_book`, `house_reg_book_legal`, `name_change_doc`, `divorce_doc`, `spouse_consent_doc`, `spouse_id_card`, `spouse_reg_copy`, `marriage_cert`, `spouse_name_change_doc`, `is_cancelled`, `auction_status`, `recorded_by`, `recorded_at`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 'พี่เป้', 'CAP0001', '000000000', 'individual', 50000.00, 50000.00, 40.00, '123456', 2004, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'cancelled', 'ทาย', '2026-02-18 02:32:00', '2026-02-19 06:30:12', '2026-02-21 03:58:54'),
(2, 2, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'corporate', 7777.00, 8888.00, 6666.00, '5555', 2998, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'f', '2026-02-23 09:50:00', '2026-02-23 02:48:29', '2026-02-26 08:30:44'),
(3, 4, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', NULL, 6666666.00, 66566.00, 0.50, '777777', 9999, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'g', NULL, '2026-02-25 04:08:19', '2026-02-25 04:08:55'),
(4, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', NULL, NULL, '2026-02-25 04:38:06', '2026-02-25 05:01:01'),
(5, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', NULL, NULL, '2026-02-25 10:09:43', '2026-02-25 10:09:43'),
(6, 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', NULL, NULL, '2026-02-27 02:55:21', '2026-02-27 02:55:21'),
(7, 8, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'individual', 400000000000.00, 4000.00, 40.00, '50000', 3, '[\"uploads/auction-docs/1772181091809-359.jpg\"]', '[\"uploads/auction-docs/1772181095651-665.jpg\"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', 'fairy', '2026-02-26 11:38:00', '2026-02-27 08:31:21', '2026-02-27 08:51:29'),
(8, 9, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'individual', 600000.00, 50.00, 60.00, '69', 3, '[\"uploads/auction-docs/1772183271018-102.jpg\"]', '[\"uploads/auction-docs/1772183273539-654.jpg\"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'f', '2026-02-27 16:09:00', '2026-02-27 09:01:12', '2026-02-27 09:09:06');

-- --------------------------------------------------------

--
-- Table structure for table `cases`
--

CREATE TABLE `cases` (
  `id` int(11) NOT NULL,
  `case_code` varchar(20) NOT NULL COMMENT 'รหัสเคส เช่น LDD0001',
  `loan_request_id` int(11) DEFAULT NULL COMMENT 'FK → loan_requests',
  `user_id` int(11) DEFAULT NULL COMMENT 'FK → users (ลูกหนี้)',
  `agent_id` int(11) DEFAULT NULL COMMENT 'FK → agents (นายหน้า ถ้ามี)',
  `assigned_sales_id` int(11) DEFAULT NULL COMMENT 'FK → admin_users (เซลล์ที่ดูแล)',
  `status` enum('new','contacting','incomplete','awaiting_appraisal_fee','appraisal_scheduled','appraisal_passed','appraisal_not_passed','pending_approve','credit_approved','pending_auction','preparing_docs','legal_scheduled','legal_completed','completed','cancelled') DEFAULT 'new',
  `payment_status` enum('unpaid','paid') DEFAULT 'unpaid' COMMENT 'ค่าประเมิน 2900',
  `appraisal_fee` decimal(10,2) DEFAULT 2900.00,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `appraisal_type` enum('outside','inside','check_price') DEFAULT 'outside',
  `appraisal_result` enum('passed','not_passed') DEFAULT NULL,
  `appraisal_date` date DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `slip_image` text DEFAULT NULL,
  `appraisal_book_image` text DEFAULT NULL,
  `recorded_by` varchar(100) DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `transaction_date` date DEFAULT NULL COMMENT 'วันที่ธุรกรรม (ฝ่ายขายกรอก)',
  `transaction_time` varchar(10) DEFAULT NULL COMMENT 'เวลา เช่น 10:00',
  `transaction_land_office` varchar(255) DEFAULT NULL COMMENT 'สำนักงานที่ดิน',
  `transaction_note` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `transaction_recorded_by` varchar(100) DEFAULT NULL COMMENT 'ผู้บันทึก',
  `transaction_recorded_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่บันทึก (auto)',
  `outside_result` varchar(50) DEFAULT NULL,
  `outside_reason` text DEFAULT NULL,
  `outside_recorded_at` datetime DEFAULT NULL,
  `inside_result` varchar(50) DEFAULT NULL,
  `inside_reason` text DEFAULT NULL,
  `inside_recorded_at` datetime DEFAULT NULL,
  `check_price_value` decimal(15,2) DEFAULT NULL,
  `check_price_detail` text DEFAULT NULL,
  `check_price_recorded_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cases`
--

INSERT INTO `cases` (`id`, `case_code`, `loan_request_id`, `user_id`, `agent_id`, `assigned_sales_id`, `status`, `payment_status`, `appraisal_fee`, `approved_amount`, `note`, `appraisal_type`, `appraisal_result`, `appraisal_date`, `payment_date`, `slip_image`, `appraisal_book_image`, `recorded_by`, `recorded_at`, `created_at`, `updated_at`, `transaction_date`, `transaction_time`, `transaction_land_office`, `transaction_note`, `transaction_recorded_by`, `transaction_recorded_at`, `outside_result`, `outside_reason`, `outside_recorded_at`, `inside_result`, `inside_reason`, `inside_recorded_at`, `check_price_value`, `check_price_detail`, `check_price_recorded_at`) VALUES
(1, '0001', 18, NULL, 1, NULL, 'cancelled', 'paid', 5000.00, 246666.00, NULL, 'outside', 'passed', '2026-02-18', '2026-02-08', 'uploads/slips/1771467833852-305.jpg', 'uploads/appraisal-books/1771388483754-712.jpg', 'ทาย', '2026-02-15 13:21:23', '2026-02-18 04:21:23', '2026-02-21 02:40:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'CS0001', 29, NULL, NULL, NULL, 'completed', 'paid', 3000.00, 50000.00, NULL, 'outside', NULL, '2026-02-24', NULL, NULL, NULL, 'fairy', '2026-02-27 01:29:58', '2026-02-27 08:29:58', '2026-02-27 08:52:25', '2026-02-27', '09.00', 'สน.มีนบุรี', NULL, 'fairy', '2026-02-27 15:35:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 'CS0002', 30, NULL, 2, NULL, 'completed', 'paid', 1000.00, NULL, NULL, 'inside', NULL, '2026-02-25', NULL, NULL, NULL, 'f', '2026-02-27 08:59:44', '2026-02-27 08:59:44', '2026-02-27 09:09:47', '2026-02-26', '09.00', 'โคราช', NULL, 'f', '2026-02-27 16:07:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `case_cancellations`
--

CREATE TABLE `case_cancellations` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL COMMENT 'admin_users.id ผู้ขอยกเลิก',
  `reason` text NOT NULL COMMENT 'เหตุผลที่ขอยกเลิก',
  `previous_status` varchar(50) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'สถานะ: รอการอนุมัติ/อนุมัติ/ปฏิเสธ',
  `approved_by` int(11) DEFAULT NULL COMMENT 'admin_users.id ผู้อนุมัติ/ปฏิเสธ',
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `case_cancellations`
--

INSERT INTO `case_cancellations` (`id`, `case_id`, `requested_by`, `reason`, `previous_status`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'ไม่พร้อม', NULL, 'approved', NULL, '2026-02-20 09:35:26', '2026-02-20 02:34:53', '2026-02-20 02:35:26');

-- --------------------------------------------------------

--
-- Table structure for table `case_documents`
--

CREATE TABLE `case_documents` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `uploaded_by` int(11) NOT NULL,
  `doc_type` enum('generated_contract','signed_contract','deed_copy','id_card_copy','other') NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_confidential` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_conversations`
--

CREATE TABLE `chat_conversations` (
  `id` int(11) NOT NULL,
  `platform` enum('facebook','line') NOT NULL COMMENT 'แพลตฟอร์มที่มา',
  `platform_conversation_id` varchar(255) NOT NULL COMMENT 'FB conversation_id หรือ LINE userId',
  `customer_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อลูกค้า',
  `customer_phone` varchar(20) DEFAULT NULL COMMENT 'เบอร์โทร (parse จากแชท)',
  `customer_email` varchar(255) DEFAULT NULL COMMENT 'อีเมล (parse จากแชท)',
  `occupation` varchar(255) DEFAULT NULL,
  `monthly_income` decimal(15,2) DEFAULT NULL,
  `desired_amount` decimal(15,2) DEFAULT NULL,
  `customer_avatar` varchar(500) DEFAULT NULL COMMENT 'URL รูปโปรไฟล์',
  `customer_platform_id` varchar(255) DEFAULT NULL COMMENT 'FB PSID หรือ LINE userId',
  `status` enum('unread','read','replied') DEFAULT 'unread',
  `last_message_text` text DEFAULT NULL COMMENT 'ข้อความล่าสุด (แสดง preview)',
  `last_message_at` timestamp NULL DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL COMMENT 'FK admin_users.id (พนักงานที่รับเคส)',
  `notes` text DEFAULT NULL COMMENT 'บันทึกภายใน',
  `property_type` varchar(50) DEFAULT NULL COMMENT 'บ้านเดี่ยว | ทาวน์เฮ้าส์ | คอนโด | อาคารพาณิชย์ | ที่ดินเปล่า — parse จากแชท',
  `deed_type` varchar(20) DEFAULT NULL COMMENT 'chanote=โฉนด✅ | ns4k=น.ส.4ก✅ | ns3=นส.3❌ | ns3k=นส.3ก❌ | spk=สปก❌',
  `loan_type_detail` varchar(20) DEFAULT NULL COMMENT 'mortgage=จำนอง(LTV30-40%) | selling_pledge=ขายฝาก(LTV50-60%)',
  `estimated_value` decimal(15,2) DEFAULT NULL COMMENT 'วงเงินที่ลูกค้าต้องการ — parse จากตัวเลขในแชท',
  `location_hint` varchar(255) DEFAULT NULL COMMENT 'จังหวัด/ที่ตั้งทรัพย์ — parse จากแชท',
  `has_obligation` varchar(5) DEFAULT NULL COMMENT 'yes | no — parse จากแชท (ติดจำนอง/ไม่ติด)',
  `obligation_amount` decimal(15,2) DEFAULT NULL,
  `contract_years` int(11) DEFAULT NULL,
  `ineligible_property` tinyint(1) DEFAULT 0 COMMENT 'ทรัพย์ไม่ผ่านเกณฑ์ SOP (ที่เกษตร/น.ส.3/สปก/ตาบอด)',
  `ineligible_reason` varchar(255) DEFAULT NULL COMMENT 'เหตุผลที่ไม่ผ่านเกณฑ์',
  `intent_type` varchar(50) DEFAULT NULL COMMENT 'intent: loan_inquiry|ask_interest|ask_fee|contract_renewal|ask_appraisal',
  `is_refinance` tinyint(1) DEFAULT 0 COMMENT 'ลูกค้าต้องการรีไฟแนนซ์',
  `is_agent` tinyint(1) NOT NULL DEFAULT 0,
  `agent_name` varchar(255) DEFAULT NULL,
  `agent_phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tag_id` int(11) DEFAULT NULL,
  `loan_request_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_conversations`
--

INSERT INTO `chat_conversations` (`id`, `platform`, `platform_conversation_id`, `customer_name`, `customer_phone`, `customer_email`, `occupation`, `monthly_income`, `desired_amount`, `customer_avatar`, `customer_platform_id`, `status`, `last_message_text`, `last_message_at`, `assigned_to`, `notes`, `property_type`, `deed_type`, `loan_type_detail`, `estimated_value`, `location_hint`, `has_obligation`, `obligation_amount`, `contract_years`, `ineligible_property`, `ineligible_reason`, `intent_type`, `is_refinance`, `is_agent`, `agent_name`, `agent_phone`, `created_at`, `updated_at`, `tag_id`, `loan_request_id`) VALUES
(15, 'line', 'U8ad6afc9893d3aaef217ef8718d027e1', 'uuuu', '0955635331', '', '1.พนักงานบริษัท ชัยรัชการ(กรุงเทพ) จำกัด', NULL, NULL, 'https://sprofile.line-scdn.net/0h6YXMvEaFaXZ1NHaLzEsXSAVkahxWRTBkCwUlR0BgMEFLVCp1WlouQxc0NxVMDConW1YhFElgM0JXdkt4IFpWbSc9NxwoTUhrGgklaTZgRE4cb1IiGSJtdkcxNhYBYG9dPRtZTiRaMEQfX29dMC8hYkZUfihLBEUpHWMFIHAGB_UaNh4jWFMuEEk2N0TA', 'U8ad6afc9893d3aaef217ef8718d027e1', 'read', 'uuuu', '2026-03-02 10:22:52', 3, NULL, NULL, 'chanote', 'mortgage', 700000.00, 'กรุงเทพ', 'yes', NULL, 7, 0, NULL, NULL, 0, 0, NULL, NULL, '2026-02-25 08:04:59', '2026-03-02 10:22:57', 1, 33);

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL COMMENT 'FK chat_conversations.id',
  `platform_message_id` varchar(255) DEFAULT NULL COMMENT 'message ID จากแพลตฟอร์ม',
  `sender_type` enum('customer','admin') NOT NULL,
  `sender_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อผู้ส่ง',
  `message_text` text DEFAULT NULL,
  `message_type` enum('text','image','sticker','file','location') DEFAULT 'text',
  `attachment_url` varchar(500) DEFAULT NULL COMMENT 'URL ไฟล์แนบ/รูป/สติกเกอร์',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `sender_id` int(11) DEFAULT NULL COMMENT 'admin_users.id ของคนที่ตอบ (NULL ถ้าเป็น customer หรือ system)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `conversation_id`, `platform_message_id`, `sender_type`, `sender_name`, `message_text`, `message_type`, `attachment_url`, `created_at`, `sender_id`) VALUES
(1, 15, NULL, 'admin', 'Admin', 'สวัสดี คูณ Takayuki\nบริษัท โลนด์ ดีดี จำกัด ยินดีให้บริการค่ะ\n\nรบกวนขอข้อมูลดังนี้\n\nชื่อ\nเบอร์โทรติดต่อ\nสนใจขายฝาก หรือ จำนอง\n\nเพื่อความรวดเร็วในการติดต่อค่ะ', 'text', NULL, '2026-03-02 07:56:24', NULL),
(2, 15, '603320247935828076', 'customer', 'E=mc²', 'ทากายูกิ โออิเค\n0955635331\nจำนอง', 'text', NULL, '2026-03-02 07:56:35', NULL),
(3, 15, NULL, 'admin', 'Admin', 'Admin\nขอรายละเอียดเพิ่มเติมค่ะ\n\n1. คุณลูกค้าประกอบอาชีพอะไรอยู่บ้างคะ\n2. รายได้จากทางไหนบ้าง / ต่อเดือนเท่าไหร่\n3. ต้องการเงินไปทำอะไร\n4. มีแพลนทำสัญญากีปีคะ', 'text', NULL, '2026-03-02 07:57:02', NULL),
(4, 15, '603320306656346302', 'customer', 'E=mc²', '1.พนักงานบริษัท ชัยรัชการ(กรุงเทพ) จำกัด\n2.เงินเดือน+คอมมิชั่น 22,000 บาท\n3.ปิดหนี้สินให้คุณแม่\n5.7 ปี', 'text', NULL, '2026-03-02 07:57:10', NULL),
(5, 15, '603320365912948996', 'customer', 'E=mc²', '[รูปภาพ]', 'image', '/uploads/chat/603320365912948996.jpg', '2026-03-02 07:57:46', NULL),
(6, 15, NULL, 'admin', 'Admin', 'สวัสดี คูณ Takayuki\nบริษัท โลนด์ ดีดี จำกัด ยินดีให้บริการค่ะ\n\nรบกวนขอข้อมูลดังนี้\n\nชื่อ\nเบอร์โทรติดต่อ\nสนใจขายฝาก หรือ จำนอง\n\nเพื่อความรวดเร็วในการติดต่อค่ะ\n', 'text', NULL, '2026-03-02 10:07:54', NULL),
(7, 15, '603333492273053834', 'customer', 'E=mc²', 'ทากายูกิ โออิเค\n0955635331\nจำนอง', 'text', NULL, '2026-03-02 10:08:10', NULL),
(8, 15, '603334885351883271', 'customer', 'E=mc²', 'uuuu', 'text', NULL, '2026-03-02 10:22:00', NULL),
(9, 15, '603334902145876509', 'customer', 'E=mc²', 'yyy', 'text', NULL, '2026-03-02 10:22:10', NULL),
(10, 15, '603334917278924835', 'customer', 'E=mc²', 'iii', 'text', NULL, '2026-03-02 10:22:19', NULL),
(11, 15, '603334971855471173', 'customer', 'E=mc²', 'uuuu', 'text', NULL, '2026-03-02 10:22:52', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `chat_platforms`
--

CREATE TABLE `chat_platforms` (
  `id` int(11) NOT NULL,
  `platform_name` enum('facebook','line') NOT NULL,
  `platform_id` varchar(255) NOT NULL COMMENT 'FB page_id หรือ LINE channel_id',
  `access_token` varchar(500) NOT NULL COMMENT 'Page Access Token หรือ Channel Access Token',
  `channel_secret` varchar(255) DEFAULT NULL COMMENT 'LINE Channel Secret (สำหรับ verify webhook)',
  `page_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อเพจ/บัญชี',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_platforms`
--

INSERT INTO `chat_platforms` (`id`, `platform_name`, `platform_id`, `access_token`, `channel_secret`, `page_name`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 'line', '2009183139', 'B0snsDGEc6u8Xax4x89RsGsfiITWdqAaCZgqteX6+ax9qcqL425O9Uda0jRrCdzhK+w1j59SNFrYFI+Hinr6dZG8+TWSSQw6PH33gy+OQpzb1VNWGS7gse8m28DCmCKyv+0BmbN+TNMGNLkecMuXKgdB04t89/1O/w1cDnyilFU=', 'a49b67b5dfd276429ceed3b71c1b3850', 'ทดสอบ', 1, '2026-02-20 07:16:13', '2026-02-20 07:16:13');

-- --------------------------------------------------------

--
-- Table structure for table `chat_tags`
--

CREATE TABLE `chat_tags` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `bg_color` varchar(20) DEFAULT '#e5e7eb',
  `text_color` varchar(20) DEFAULT '#333333',
  `sort_order` int(11) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_tags`
--

INSERT INTO `chat_tags` (`id`, `name`, `bg_color`, `text_color`, `sort_order`, `created_by`, `created_at`) VALUES
(1, 'รอข้อมูล', '#fef3c7', '#92400e', 1, NULL, '2026-02-20 17:04:54'),
(2, 'ทรัพย์เข้าเกณฑ์', '#dcfce7', '#166534', 2, NULL, '2026-02-20 17:04:54'),
(3, 'ทรัพย์ไม่เข้าเกณฑ์', '#fee2e2', '#991b1b', 3, NULL, '2026-02-20 17:04:54'),
(4, 'ติดภาระสูง', '#f3e8ff', '#6b21a8', 4, NULL, '2026-02-20 17:04:54'),
(5, 'อนุมัติแล้ว', '#dbeafe', '#1e40af', 5, NULL, '2026-02-20 17:04:54'),
(6, 'ปิดเคส', '#f1f5f9', '#475569', 6, NULL, '2026-02-20 17:04:54'),
(7, 'นายหน้า', '#fce7f3', '#9d174d', 7, NULL, '2026-02-20 17:04:54');

-- --------------------------------------------------------

--
-- Table structure for table `contact_requests`
--

CREATE TABLE `contact_requests` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `province` varchar(50) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `preferred_day` varchar(50) DEFAULT NULL,
  `preferred_time` varchar(50) DEFAULT NULL,
  `status` enum('new','contacted','completed') DEFAULT 'new',
  `admin_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `debtor_accounting`
--

CREATE TABLE `debtor_accounting` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `loan_request_id` int(11) DEFAULT NULL,
  `debtor_status` varchar(100) DEFAULT NULL COMMENT 'สถานะลูกหนี้',
  `property_location` varchar(255) DEFAULT NULL COMMENT 'อำเภอ/จังหวัดที่ตั้งทรัพย์',
  `contact_person` varchar(255) DEFAULT NULL COMMENT 'ชื่อ-สกุล(ลูกหนี้/ผู้ติดต่อสำรอง)',
  `id_card_image` varchar(500) DEFAULT NULL COMMENT 'รูปหน้าบัตรเจ้าของทรัพย์',
  `appraisal_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าประเมิน',
  `appraisal_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าประเมิน',
  `appraisal_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปค่าประเมิน',
  `appraisal_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายค่าประเมิน',
  `bag_fee_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าปากถุง',
  `bag_fee_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าปากถุง',
  `bag_fee_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปค่าปากถุง',
  `bag_fee_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายค่าปากถุง',
  `contract_sale_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าขายสัญญา',
  `contract_sale_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าขายสัญญา',
  `contract_sale_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปค่าขายสัญญา',
  `contract_sale_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายค่าขายสัญญา',
  `redemption_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าไถ่ถอน',
  `redemption_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าไถ่ถอน',
  `redemption_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปค่าไถ่ถอน',
  `redemption_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายค่าไถ่ถอน',
  `additional_service_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าบริการเพิ่มเติม',
  `additional_service_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าบริการเพิ่มเติม',
  `additional_service_note` text DEFAULT NULL COMMENT 'หมายเหตุ:ค่าบริการเพิ่มเติม',
  `property_forfeited_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ทรัพย์หลุด',
  `property_forfeited_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินทรัพย์หลุด',
  `property_forfeited_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปทรัพย์หลุด',
  `property_forfeited_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายทรัพย์หลุด',
  `property_forfeited_note` text DEFAULT NULL COMMENT 'หมายเหตุ:ทรัพย์หลุด',
  `recorded_by` varchar(255) DEFAULT NULL COMMENT 'ผู้บันทึก',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `debtor_accounting`
--

INSERT INTO `debtor_accounting` (`id`, `case_id`, `loan_request_id`, `debtor_status`, `property_location`, `contact_person`, `id_card_image`, `appraisal_amount`, `appraisal_payment_date`, `appraisal_slip`, `appraisal_status`, `bag_fee_amount`, `bag_fee_payment_date`, `bag_fee_slip`, `bag_fee_status`, `contract_sale_amount`, `contract_sale_payment_date`, `contract_sale_slip`, `contract_sale_status`, `redemption_amount`, `redemption_payment_date`, `redemption_slip`, `redemption_status`, `additional_service_amount`, `additional_service_payment_date`, `additional_service_note`, `property_forfeited_amount`, `property_forfeited_payment_date`, `property_forfeited_slip`, `property_forfeited_status`, `property_forfeited_note`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'ทำงาน', 'กาญจนบุรี', NULL, '/uploads/id-cards/1771398926610-237.jpg', 68.00, '2026-02-01', '/uploads/slips/1771398921099-797.jpg', 'paid', 70.00, '2026-02-01', '/uploads/slips/1771398917989-399.jpg', 'paid', 91.00, '2026-02-01', '/uploads/slips/1771398915140-610.jpg', 'paid', 80.00, '2026-02-01', '/uploads/slips/1771398930565-787.jpg', 'paid', 20.00, '2026-02-01', NULL, 90.00, '2026-02-01', '/uploads/slips/1771398935104-554.jpg', 'paid', NULL, 'ทาย', '2026-02-18 06:57:37', '2026-02-19 03:07:51');

-- --------------------------------------------------------

--
-- Table structure for table `document_templates`
--

CREATE TABLE `document_templates` (
  `id` int(11) NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `template_code` varchar(50) DEFAULT NULL,
  `content_html` text NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_templates`
--

INSERT INTO `document_templates` (`id`, `template_name`, `template_code`, `content_html`, `is_active`, `created_at`) VALUES
(1, 'สัญญาขายฝากมาตรฐาน', 'KF_STD_01', '<h1>สัญญาขายฝาก</h1><p>ทำที่.. วันที่..</p><p>ผู้ขายฝากชื่อ {{owner_name}}...</p>', 1, '2026-02-13 04:19:27');

-- --------------------------------------------------------

--
-- Table structure for table `investments`
--

CREATE TABLE `investments` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `investor_id` int(11) NOT NULL,
  `offer_amount` decimal(15,2) DEFAULT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `investment_properties`
--

CREATE TABLE `investment_properties` (
  `id` int(11) NOT NULL,
  `loan_request_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `property_type` enum('land','house','condo','townhouse','other') NOT NULL,
  `property_code` varchar(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `highlights` text DEFAULT NULL,
  `address` text NOT NULL,
  `province` varchar(50) NOT NULL,
  `district` varchar(100) DEFAULT NULL,
  `land_area` varchar(50) DEFAULT NULL,
  `building_area` varchar(50) DEFAULT NULL,
  `bedrooms` int(11) DEFAULT NULL,
  `bathrooms` int(11) DEFAULT NULL,
  `property_condition` enum('new','furnished','unfurnished','renovate') DEFAULT NULL,
  `appraised_value` decimal(15,2) NOT NULL,
  `investment_amount` decimal(15,2) NOT NULL,
  `contact_phone` varchar(20) DEFAULT '',
  `contact_line` varchar(100) DEFAULT '',
  `existing_debt` decimal(15,2) DEFAULT 0.00,
  `area_unit` varchar(10) DEFAULT 'sqw',
  `user_id` int(11) DEFAULT NULL,
  `interest_rate` decimal(5,2) DEFAULT 15.00,
  `contract_type` enum('selling_pledge','mortgage') NOT NULL DEFAULT 'selling_pledge',
  `contract_duration` int(11) DEFAULT 12,
  `year_built` int(11) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `nearby_landmarks` text DEFAULT NULL,
  `images` text DEFAULT NULL,
  `thumbnail` varchar(255) DEFAULT NULL,
  `status` enum('available','reserved','invested','closed') DEFAULT 'available',
  `investor_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `investors`
--

CREATE TABLE `investors` (
  `id` int(11) NOT NULL,
  `investor_code` varchar(20) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `line_id` varchar(100) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `status` varchar(20) DEFAULT 'active',
  `investor_level` varchar(50) DEFAULT NULL,
  `sort_order` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `investors`
--

INSERT INTO `investors` (`id`, `investor_code`, `username`, `full_name`, `avatar_url`, `password_hash`, `email`, `phone`, `line_id`, `company_name`, `province`, `bio`, `is_verified`, `status`, `investor_level`, `sort_order`, `created_at`, `updated_at`) VALUES
(3, 'CAP0001', 'cap0001', 'พี่เป้', NULL, '$2b$10$YOoU/9bRA1G6xbB5phWsi.FJfI1QqkV.AOwzUuz6kgHBFFyYyeWB6', 'loandd02@gmail.com', '000000000', '@rrrr', NULL, NULL, NULL, 0, 'active', '1', 3, '2026-02-18 09:02:03', '2026-02-21 03:50:07'),
(4, 'CAP0002', 'cap0002', 'มะเมียมะมะมะเมีย', NULL, '$2b$10$2rfNZVvhg30zMWcGQtc9o.qsnaVksMoYAjy5/xNYsZ7hBS5gLXRma', 'wwww@hotmail.com', '1245677874', 'moon', NULL, NULL, NULL, 0, 'active', '2', 3, '2026-02-23 02:49:33', '2026-02-23 02:49:33');

-- --------------------------------------------------------

--
-- Table structure for table `investor_accounting`
--

CREATE TABLE `investor_accounting` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `hid` varchar(100) DEFAULT NULL,
  `auction_deposit` decimal(12,2) DEFAULT 0.00,
  `auction_date` date DEFAULT NULL,
  `status` enum('pending_auction','pending_approval','pending_transaction','completed','cancelled') DEFAULT 'pending_auction',
  `post_auction_status` enum('refund_deposit','won_auction') DEFAULT NULL,
  `recorded_by` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `investor_accounting`
--

INSERT INTO `investor_accounting` (`id`, `user_id`, `hid`, `auction_deposit`, `auction_date`, `status`, `post_auction_status`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 3, NULL, 0.00, NULL, 'pending_auction', 'refund_deposit', 'ทาย', '2026-02-19 02:55:32', '2026-02-19 02:55:32');

-- --------------------------------------------------------

--
-- Table structure for table `investor_auction_history`
--

CREATE TABLE `investor_auction_history` (
  `id` int(11) NOT NULL,
  `investor_id` int(11) NOT NULL,
  `case_id` varchar(50) DEFAULT NULL COMMENT 'ID เคสที่ประมูลได้ เช่น LDD02003',
  `case_location` varchar(255) DEFAULT NULL COMMENT 'ชื่ออำเภอ/จังหวัดที่ตั้งทรัพย์ หรือพิกัด',
  `auction_date` date DEFAULT NULL COMMENT 'วันที่ประมูลได้',
  `winning_price` decimal(15,2) DEFAULT NULL COMMENT 'ราคาที่ชนะ',
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `investor_auction_history`
--

INSERT INTO `investor_auction_history` (`id`, `investor_id`, `case_id`, `case_location`, `auction_date`, `winning_price`, `note`, `created_at`, `updated_at`) VALUES
(9, 4, '9', NULL, '2026-02-26', 600000.00, 'สร้างอัตโนมัติจากฝ่ายประมูล', '2026-02-27 09:09:06', '2026-02-27 09:10:05');

-- --------------------------------------------------------

--
-- Table structure for table `investor_withdrawals`
--

CREATE TABLE `investor_withdrawals` (
  `id` int(11) NOT NULL,
  `investor_id` int(11) NOT NULL,
  `case_id` int(11) DEFAULT NULL COMMENT 'FK → cases.id',
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงิน',
  `withdrawal_date` date DEFAULT NULL COMMENT 'วันที่ถอนเงิน',
  `status` enum('pending','transferred','cancelled') DEFAULT 'pending' COMMENT 'สถานะ: รอดำเนินการ/โอนแล้ว/ยกเลิก',
  `slip_path` varchar(255) DEFAULT NULL COMMENT 'path สลิปโอนเงิน',
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `investor_withdrawals`
--

INSERT INTO `investor_withdrawals` (`id`, `investor_id`, `case_id`, `amount`, `withdrawal_date`, `status`, `slip_path`, `note`, `created_at`, `updated_at`) VALUES
(8, 4, 9, 600000.00, NULL, 'transferred', '/uploads/withdrawal-slips/wslip_8_1772183387508.jpg', NULL, '2026-02-27 09:09:06', '2026-02-27 09:14:55');

-- --------------------------------------------------------

--
-- Table structure for table `issuing_transactions`
--

CREATE TABLE `issuing_transactions` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `contract_appointment` tinyint(1) DEFAULT 0,
  `contract_selling_pledge` tinyint(1) DEFAULT 0,
  `contract_mortgage` tinyint(1) DEFAULT 0,
  `reminder_selling_pledge` tinyint(1) DEFAULT 0,
  `reminder_mortgage` tinyint(1) DEFAULT 0,
  `tracking_no` varchar(100) DEFAULT NULL,
  `issuing_status` enum('pending','sent','cancelled') DEFAULT 'pending',
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `doc_selling_pledge` varchar(500) DEFAULT NULL,
  `doc_mortgage` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issuing_transactions`
--

INSERT INTO `issuing_transactions` (`id`, `case_id`, `contract_appointment`, `contract_selling_pledge`, `contract_mortgage`, `reminder_selling_pledge`, `reminder_mortgage`, `tracking_no`, `issuing_status`, `note`, `created_at`, `updated_at`, `doc_selling_pledge`, `doc_mortgage`) VALUES
(1, 1, 0, 0, 1, 0, 1, 'TH1234567890', 'cancelled', NULL, '2026-02-19 05:01:47', '2026-02-27 07:45:09', NULL, NULL),
(7, 8, 0, 1, 0, 0, 0, 'sand@gmail.com', 'sent', NULL, '2026-02-27 08:49:16', '2026-02-27 08:49:48', 'uploads/issuing/doc-selling-pledge/1772182183089-122.jpg', NULL),
(8, 9, 0, 0, 0, 0, 0, NULL, 'pending', NULL, '2026-02-28 01:57:09', '2026-02-28 01:57:09', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `legal_transactions`
--

CREATE TABLE `legal_transactions` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `officer_name` varchar(100) DEFAULT NULL COMMENT 'เจ้าหน้าที่',
  `visit_date` date DEFAULT NULL COMMENT 'วันที่ไป',
  `land_office` varchar(200) DEFAULT NULL COMMENT 'สำนักงานที่ดิน',
  `time_slot` varchar(50) DEFAULT NULL COMMENT 'ช่วงเวลา',
  `team` varchar(50) DEFAULT NULL COMMENT 'ทีม',
  `legal_status` enum('pending','completed','cancelled') DEFAULT 'pending' COMMENT 'สถานะ: รอทำนิติกรรม/เสร็จสิ้น/ยกเลิก',
  `attachment` text DEFAULT NULL COMMENT 'เอกสารแนบท้าย',
  `doc_selling_pledge` text DEFAULT NULL COMMENT '1.เอกสารขายฝาก/จำนอง',
  `deed_selling_pledge` text DEFAULT NULL COMMENT '2.โฉนดขายฝาก/จำนอง',
  `doc_extension` text DEFAULT NULL COMMENT '3.เอกสารขยาย',
  `deed_extension` text DEFAULT NULL COMMENT '4.โฉนดขยาย',
  `doc_redemption` text DEFAULT NULL COMMENT '5.เอกสารไถ่ถอน',
  `deed_redemption` text DEFAULT NULL COMMENT '6.โฉนดไถ่ถอน',
  `note` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `commission_slip` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `legal_transactions`
--

INSERT INTO `legal_transactions` (`id`, `case_id`, `officer_name`, `visit_date`, `land_office`, `time_slot`, `team`, `legal_status`, `attachment`, `doc_selling_pledge`, `deed_selling_pledge`, `doc_extension`, `deed_extension`, `doc_redemption`, `deed_redemption`, `note`, `created_at`, `updated_at`, `commission_slip`) VALUES
(1, 1, 'ทาย', '2026-02-15', 'ทาย', '50.33', 'q', 'cancelled', 'uploads/legal/attachment/1771473106000-117.jpeg', 'uploads/legal/doc-selling-pledge/1771473106013-742.pdf', 'uploads/legal/deed-selling-pledge/1771473106015-922.jpg', 'uploads/legal/doc-extension/1771473106025-117.jpg', 'uploads/legal/deed-extension/1771473106029-993.jpg', 'uploads/legal/doc-redemption/1771473106039-241.pdf', 'uploads/legal/deed-redemption/1771473106042-51.jpg', NULL, '2026-02-19 03:37:50', '2026-02-27 07:45:12', NULL),
(7, 8, 'may', '2026-02-27', 'สน.มีนบุรี', '09.00 น.', NULL, 'completed', 'uploads/legal/attachment/1772181425052-528.pdf', 'uploads/legal/doc-selling-pledge/1772181425068-453.pdf', 'uploads/legal/deed-selling-pledge/1772181425082-105.jpg', NULL, NULL, NULL, NULL, NULL, '2026-02-27 08:31:41', '2026-02-27 08:37:05', NULL),
(8, 9, 'f', '2026-02-26', 'โคราช', '09.00 ', NULL, 'completed', 'uploads/legal/attachment/1772182846706-371.jpg', 'uploads/legal/doc-selling-pledge/1772182846707-216.jpg', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-27 08:59:58', '2026-02-27 09:00:46', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `loan_requests`
--

CREATE TABLE `loan_requests` (
  `id` int(11) NOT NULL,
  `debtor_code` varchar(20) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `property_type` varchar(100) DEFAULT NULL,
  `has_obligation` enum('yes','no') DEFAULT 'no',
  `obligation_amount` decimal(15,2) DEFAULT NULL,
  `obligation_count` int(11) DEFAULT NULL,
  `property_address` text NOT NULL,
  `province` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `subdistrict` varchar(100) DEFAULT NULL,
  `house_no` varchar(100) DEFAULT NULL,
  `village_name` varchar(200) DEFAULT NULL,
  `additional_details` text DEFAULT NULL,
  `location_url` varchar(500) DEFAULT NULL,
  `deed_number` varchar(100) DEFAULT NULL,
  `deed_type` varchar(20) DEFAULT NULL COMMENT 'chanote=โฉนด✅ | ns4k=น.ส.4ก✅ | ns3=นส.3❌ | ns3k=นส.3ก❌ | spk=สปก❌ | other=อื่นๆ',
  `preliminary_terms` text DEFAULT NULL COMMENT 'Preliminary Terms จากฝ่ายอนุมัติ / กลุ่มคัดทรัพย์',
  `land_area` varchar(50) DEFAULT NULL,
  `building_area` varchar(50) DEFAULT NULL,
  `loan_type` varchar(100) DEFAULT NULL,
  `loan_type_detail` varchar(50) DEFAULT NULL,
  `estimated_value` decimal(15,2) DEFAULT NULL,
  `loan_amount` decimal(15,2) NOT NULL,
  `loan_duration` int(11) DEFAULT 12,
  `images` text DEFAULT NULL,
  `deed_images` text DEFAULT NULL,
  `contact_name` varchar(100) NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_line` varchar(50) DEFAULT NULL,
  `preferred_contact` enum('phone','line','email') DEFAULT 'phone',
  `status` enum('pending','reviewing','appraising','approved','matched','rejected','cancelled') DEFAULT 'pending',
  `admin_note` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `appraised_value` decimal(15,2) DEFAULT NULL,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `interest_rate` decimal(5,2) DEFAULT NULL,
  `desired_amount` varchar(100) DEFAULT NULL,
  `occupation` varchar(200) DEFAULT NULL,
  `monthly_income` varchar(100) DEFAULT NULL,
  `loan_purpose` text DEFAULT NULL,
  `contract_years` varchar(50) DEFAULT NULL,
  `net_desired_amount` varchar(100) DEFAULT NULL,
  `payment_status` varchar(20) NOT NULL DEFAULT 'unpaid' COMMENT 'สถานะชำระ (ก่อนมีเคส)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `agent_id` int(11) DEFAULT NULL,
  `appraisal_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`appraisal_images`)),
  `appraisal_type` enum('outside','inside','check_price') DEFAULT 'outside',
  `appraisal_result` enum('passed','not_passed') DEFAULT NULL,
  `appraisal_date` date DEFAULT NULL,
  `appraisal_fee` decimal(10,2) DEFAULT NULL,
  `slip_image` text DEFAULT NULL,
  `appraisal_book_image` text DEFAULT NULL,
  `appraisal_note` text DEFAULT NULL,
  `appraisal_recorded_by` varchar(100) DEFAULT NULL,
  `appraisal_recorded_at` datetime DEFAULT NULL,
  `outside_result` varchar(50) DEFAULT NULL,
  `outside_reason` text DEFAULT NULL,
  `outside_recorded_at` datetime DEFAULT NULL,
  `inside_result` varchar(50) DEFAULT NULL,
  `inside_reason` text DEFAULT NULL,
  `inside_recorded_at` datetime DEFAULT NULL,
  `check_price_value` decimal(15,2) DEFAULT NULL,
  `check_price_detail` text DEFAULT NULL,
  `check_price_recorded_at` datetime DEFAULT NULL,
  `marital_status` enum('single','married_reg','married_unreg','divorced','inherited') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `loan_requests`
--

INSERT INTO `loan_requests` (`id`, `debtor_code`, `source`, `user_id`, `property_type`, `has_obligation`, `obligation_amount`, `obligation_count`, `property_address`, `province`, `district`, `subdistrict`, `house_no`, `village_name`, `additional_details`, `location_url`, `deed_number`, `deed_type`, `preliminary_terms`, `land_area`, `building_area`, `loan_type`, `loan_type_detail`, `estimated_value`, `loan_amount`, `loan_duration`, `images`, `deed_images`, `contact_name`, `contact_phone`, `contact_email`, `contact_line`, `preferred_contact`, `status`, `admin_note`, `rejection_reason`, `appraised_value`, `approved_amount`, `interest_rate`, `desired_amount`, `occupation`, `monthly_income`, `loan_purpose`, `contract_years`, `net_desired_amount`, `payment_status`, `created_at`, `updated_at`, `agent_id`, `appraisal_images`, `appraisal_type`, `appraisal_result`, `appraisal_date`, `appraisal_fee`, `slip_image`, `appraisal_book_image`, `appraisal_note`, `appraisal_recorded_by`, `appraisal_recorded_at`, `outside_result`, `outside_reason`, `outside_recorded_at`, `inside_result`, `inside_reason`, `inside_recorded_at`, `check_price_value`, `check_price_detail`, `check_price_recorded_at`, `marital_status`) VALUES
(18, 'LDD0001', NULL, NULL, 'house', 'no', NULL, 1, '', 'กาญจนบุรี', 'ทาย', 'ทาย', NULL, NULL, NULL, 'https://www.thaiproperty.in.th/', '123456', NULL, NULL, 'ทาย', NULL, 'mortgage', 'mortgage', NULL, 0.00, 12, '[\"uploads/id-cards/1771464867071-498.jpg\",\"uploads/properties/1771465322902-442.jpg\",\"uploads/permits/1771465322903-861.jpg\"]', '[\"uploads/deeds/1771465322897-54.jpg\"]', 'ทาย', '0000000000', NULL, NULL, 'phone', '', NULL, NULL, NULL, 69999.97, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', '2026-02-18 02:10:47', '2026-02-27 09:56:35', 1, '[\"uploads/appraisal-properties/1772186181381-70.jpg\",\"uploads/appraisal-properties/1772186184598-895.jpg\"]', 'inside', 'passed', '2026-02-27', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'passed', NULL, '2026-02-27 16:56:35', NULL, NULL, NULL, NULL),
(29, 'LDD0002', NULL, NULL, 'house', 'no', NULL, NULL, '', 'กาฬสินธุ์', 'เขาวง', 'นาคู', '23', 'หมู่บ้านโคกน้อย', '5 ห้องนอน', 'https://www.oho.chat/solution/online-business', '7654', 'chanote', NULL, '70 ', NULL, NULL, 'selling_pledge', 200000.00, 0.00, 12, '[\"uploads/id-cards/1772172795623-599.jpg\",\"uploads/properties/1772172834242-887.jpg\",\"uploads/properties/1772172838301-631.jpg\",\"uploads/properties/1772172844870-219.jpg\",\"uploads/permits/1772180730973-360.pdf\"]', '[\"uploads/deeds/1772172795628-958.jpg\"]', 'ต่วย', '0987654390', NULL, NULL, 'phone', '', NULL, NULL, NULL, 29999.98, 2.50, '900000', 'ร้านค้า', '20000', 'เปิดธุรกิจใหม่', '3', '30000', 'paid', '2026-02-27 06:13:15', '2026-02-27 08:52:25', NULL, '[\"uploads/appraisal-properties/1772174287034-646.jpg\",\"uploads/appraisal-properties/1772174294229-619.jpg\",\"uploads/appraisal-properties/1772174300032-117.jpg\"]', 'outside', 'passed', '2026-02-25', 3000.00, 'uploads/slips/1772176992133-677.jpg', 'uploads/appraisal-books/1772179447844-355.pdf', NULL, 'fairy', NULL, 'passed', NULL, '2026-02-27 15:04:07', NULL, NULL, NULL, 60000.00, NULL, '2026-02-27 15:04:07', NULL),
(30, 'LDD0003', NULL, NULL, 'townhouse', 'no', NULL, NULL, '', 'นครราชสีมา', 'นคร', 'นคร', '12', 'นคร', NULL, 'https://www.pinterest.com/pin/34902965860068215/', '2477', 'ns4k', NULL, '69', NULL, 'mortgage', 'mortgage', 7000.00, 0.00, 12, '[\"uploads/id-cards/1772182516545-816.jpg\",\"uploads/properties/1772182516550-166.jpg\",\"uploads/permits/1772182516551-879.jpg\"]', '[\"uploads/deeds/1772182516546-697.jpg\"]', 'นอนเขียน', '097680', NULL, NULL, 'phone', '', NULL, NULL, NULL, 3000.00, 1.70, '60000', 'ขายน้ำ', '5000', 'งานหยาบ', '3', '50000', 'paid', '2026-02-27 08:55:16', '2026-02-27 09:58:36', 2, '[\"uploads/appraisal-properties/1772182694926-11.jpg\",\"uploads/appraisal-properties/1772182698921-540.jpg\",\"uploads/appraisal-properties/1772182702730-874.jpg\"]', 'inside', 'passed', '2026-02-25', 1000.00, 'uploads/slips/1772182576375-656.jpg', 'uploads/appraisal-books/1772182576375-705.pdf', NULL, 'f', NULL, NULL, NULL, NULL, 'passed', NULL, '2026-02-27 16:58:36', 600000.00, NULL, '2026-02-27 16:58:36', NULL),
(33, 'LDD0004', NULL, NULL, 'house', 'no', NULL, NULL, '', 'กรุงเทพมหานคร', 'ไม่', 'ไม่', '12345', NULL, NULL, NULL, NULL, 'chanote', NULL, NULL, NULL, NULL, 'mortgage', 700000.00, 0.00, 12, '[\"uploads/id-cards/1772442161795-611.jpg\"]', NULL, 'uuuu', '0955635331', NULL, NULL, 'phone', '', NULL, NULL, NULL, NULL, NULL, NULL, '1.พนักงานบริษัท ชัยรัชการ(กรุงเทพ) จำกัด', NULL, NULL, '7', NULL, 'unpaid', '2026-02-28 04:16:00', '2026-03-02 10:22:52', NULL, '[\"uploads/appraisal-properties/1772446290094-263.jpg\",\"uploads/appraisal-properties/1772446305289-701.jpg\",\"uploads/appraisal-properties/1772446305291-572.jpg\",\"uploads/appraisal-properties/1772446305294-90.jpg\",\"uploads/appraisal-properties/1772446321072-194.jpg\",\"uploads/appraisal-properties/1772446321073-578.jpg\"]', 'outside', 'passed', '2026-03-02', 5000.00, 'uploads/slips/1772446405710-519.jpg', 'uploads/appraisal-books/1772446405711-558.jpg', NULL, NULL, NULL, NULL, NULL, NULL, 'passed', NULL, '2026-03-02 17:13:25', 299990.00, NULL, '2026-03-02 17:13:25', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `type` enum('internal','customer') NOT NULL DEFAULT 'internal',
  `loan_request_id` int(11) DEFAULT NULL,
  `case_id` int(11) DEFAULT NULL,
  `from_department` varchar(50) DEFAULT NULL,
  `target_department` varchar(50) DEFAULT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `platform` varchar(20) DEFAULT NULL,
  `customer_platform_id` varchar(255) DEFAULT NULL,
  `conversation_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status_from` varchar(50) DEFAULT NULL,
  `status_to` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `is_sent` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `type`, `loan_request_id`, `case_id`, `from_department`, `target_department`, `target_user_id`, `platform`, `customer_platform_id`, `conversation_id`, `title`, `message`, `status_from`, `status_to`, `is_read`, `is_sent`, `sent_at`, `read_at`, `link_url`, `created_by`, `created_at`) VALUES
(1, 'internal', 34, NULL, NULL, 'all', NULL, NULL, NULL, NULL, '🆕 สร้างลูกหนี้ใหม่', 'ลูกหนี้ใหม่ LDD0005 (ลอง) ถูกสร้างโดยทีมงาน — ลอง', NULL, 'new_from_admin', 0, 0, NULL, NULL, '/sales/edit/34', 1, '2026-03-02 12:54:57'),
(2, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อยู่ระหว่างประเมิน', 'เคส LDD0004 (ทากายูกิ โออิเค) อยู่ระหว่างการประเมินทรัพย์สิน', NULL, 'appraisal_scheduled', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-02 17:13:25'),
(3, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'ประเมินผ่าน — รอพิจารณาอนุมัติ', 'เคส LDD0004 (ทากายูกิ โออิเค) ผ่านการประเมินแล้ว รอพิจารณาอนุมัติวงเงิน', NULL, 'appraisal_passed', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-02 17:13:25');

-- --------------------------------------------------------

--
-- Table structure for table `notification_reads`
--

CREATE TABLE `notification_reads` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `read_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_reads`
--

INSERT INTO `notification_reads` (`notification_id`, `user_id`, `read_at`) VALUES
(1, 1, '2026-03-02 12:55:03'),
(1, 3, '2026-03-02 17:22:35'),
(2, 3, '2026-03-02 17:22:35'),
(3, 3, '2026-03-02 17:22:35');

-- --------------------------------------------------------

--
-- Table structure for table `provinces`
--

CREATE TABLE `provinces` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `region` varchar(50) NOT NULL,
  `is_popular` tinyint(1) DEFAULT 0,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `provinces`
--

INSERT INTO `provinces` (`id`, `name`, `slug`, `region`, `is_popular`, `sort_order`, `is_active`, `created_at`) VALUES
(1, 'กรุงเทพฯ', 'bangkok', 'กรุงเทพฯ & ปริมณฑล', 1, 1, 1, '2026-02-16 03:33:06'),
(2, 'นนทบุรี', 'nonthaburi', 'กรุงเทพฯ & ปริมณฑล', 1, 2, 1, '2026-02-16 03:33:06'),
(3, 'ปทุมธานี', 'pathumthani', 'กรุงเทพฯ & ปริมณฑล', 1, 3, 1, '2026-02-16 03:33:06'),
(4, 'สมุทรปราการ', 'samutprakan', 'กรุงเทพฯ & ปริมณฑล', 1, 4, 1, '2026-02-16 03:33:06'),
(5, 'ชลบุรี', 'chonburi', 'ภาคตะวันออก', 1, 5, 1, '2026-02-16 03:33:06'),
(6, 'ระยอง', 'rayong', 'ภาคตะวันออก', 1, 6, 1, '2026-02-16 03:33:06'),
(7, 'เชียงใหม่', 'chiangmai', 'ภาคเหนือ', 1, 7, 1, '2026-02-16 03:33:06'),
(8, 'เชียงราย', 'chiangrai', 'ภาคเหนือ', 1, 8, 1, '2026-02-16 03:33:06'),
(9, 'นครราชสีมา', 'nakhonratchasima', 'ภาคอีสาน', 1, 9, 1, '2026-02-16 03:33:06'),
(10, 'ขอนแก่น', 'khonkaen', 'ภาคอีสาน', 1, 10, 1, '2026-02-16 03:33:06'),
(11, 'อุดรธานี', 'udonthani', 'ภาคอีสาน', 1, 11, 1, '2026-02-16 03:33:06'),
(12, 'ภูเก็ต', 'phuket', 'ภาคใต้', 1, 12, 1, '2026-02-16 03:33:06'),
(13, 'กระบี่', 'krabi', 'ภาคใต้', 1, 13, 1, '2026-02-16 03:33:06'),
(14, 'สุราษฎร์ธานี', 'suratthani', 'ภาคใต้', 1, 14, 1, '2026-02-16 03:33:06'),
(15, 'พังงา', 'phangnga', 'ภาคใต้', 1, 15, 1, '2026-02-16 03:33:06'),
(16, 'สงขลา', 'songkhla', 'ภาคใต้', 1, 16, 1, '2026-02-16 03:33:06'),
(17, 'ประจวบคีรีขันธ์', 'prachuapkhirikhan', 'ภาคตะวันตก', 1, 17, 1, '2026-02-16 03:33:06'),
(18, 'เพชรบุรี', 'phetchaburi', 'ภาคตะวันตก', 1, 18, 1, '2026-02-16 03:33:06'),
(19, 'อื่นๆ', 'others', 'อื่นๆ', 1, 99, 1, '2026-02-16 03:33:06');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `agents`
--
ALTER TABLE `agents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `agent_code` (`agent_code`);

--
-- Indexes for table `agent_accounting`
--
ALTER TABLE `agent_accounting`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_agent` (`agent_id`),
  ADD KEY `idx_case` (`case_id`);

--
-- Indexes for table `approval_transactions`
--
ALTER TABLE `approval_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `auction_bids`
--
ALTER TABLE `auction_bids`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `auction_transactions`
--
ALTER TABLE `auction_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `cases`
--
ALTER TABLE `cases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `case_code` (`case_code`);

--
-- Indexes for table `case_cancellations`
--
ALTER TABLE `case_cancellations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`),
  ADD KEY `requested_by` (`requested_by`);

--
-- Indexes for table `case_documents`
--
ALTER TABLE `case_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `chat_conversations`
--
ALTER TABLE `chat_conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_conversation` (`platform`,`platform_conversation_id`),
  ADD KEY `idx_platform` (`platform`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_assigned` (`assigned_to`),
  ADD KEY `idx_last_message` (`last_message_at`),
  ADD KEY `idx_tag_id` (`tag_id`),
  ADD KEY `idx_chat_conv_loan_request_id` (`loan_request_id`),
  ADD KEY `idx_chat_conv_agent_phone` (`agent_phone`),
  ADD KEY `idx_ineligible` (`ineligible_property`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversation` (`conversation_id`),
  ADD KEY `idx_sender` (`sender_type`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_platform_msg` (`platform_message_id`),
  ADD KEY `idx_sender_id` (`sender_id`);

--
-- Indexes for table `chat_platforms`
--
ALTER TABLE `chat_platforms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_platform` (`platform_name`,`platform_id`),
  ADD KEY `idx_platform` (`platform_name`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `chat_tags`
--
ALTER TABLE `chat_tags`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sort` (`sort_order`);

--
-- Indexes for table `contact_requests`
--
ALTER TABLE `contact_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `debtor_accounting`
--
ALTER TABLE `debtor_accounting`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_case` (`case_id`),
  ADD KEY `loan_request_id` (`loan_request_id`),
  ADD KEY `idx_case_id` (`case_id`);

--
-- Indexes for table `document_templates`
--
ALTER TABLE `document_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `template_code` (`template_code`);

--
-- Indexes for table `investments`
--
ALTER TABLE `investments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `investor_id` (`investor_id`);

--
-- Indexes for table `investment_properties`
--
ALTER TABLE `investment_properties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `loan_request_id` (`loan_request_id`),
  ADD KEY `investor_id` (`investor_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_province` (`province`),
  ADD KEY `idx_property_type` (`property_type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `investors`
--
ALTER TABLE `investors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_investor_code` (`investor_code`),
  ADD UNIQUE KEY `uk_username` (`username`);

--
-- Indexes for table `investor_accounting`
--
ALTER TABLE `investor_accounting`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user` (`user_id`);

--
-- Indexes for table `investor_auction_history`
--
ALTER TABLE `investor_auction_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_investor` (`investor_id`);

--
-- Indexes for table `investor_withdrawals`
--
ALTER TABLE `investor_withdrawals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_investor` (`investor_id`),
  ADD KEY `idx_case` (`case_id`);

--
-- Indexes for table `issuing_transactions`
--
ALTER TABLE `issuing_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `legal_transactions`
--
ALTER TABLE `legal_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `loan_requests`
--
ALTER TABLE `loan_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `debtor_code` (`debtor_code`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_province` (`province`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif_target_dept` (`target_department`),
  ADD KEY `idx_notif_target_user` (`target_user_id`),
  ADD KEY `idx_notif_loan_request` (`loan_request_id`),
  ADD KEY `idx_notif_case` (`case_id`),
  ADD KEY `idx_notif_is_read` (`is_read`),
  ADD KEY `idx_notif_type` (`type`),
  ADD KEY `idx_notif_created_at` (`created_at`);

--
-- Indexes for table `notification_reads`
--
ALTER TABLE `notification_reads`
  ADD UNIQUE KEY `unique_user_notif` (`notification_id`,`user_id`);

--
-- Indexes for table `provinces`
--
ALTER TABLE `provinces`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `agents`
--
ALTER TABLE `agents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `agent_accounting`
--
ALTER TABLE `agent_accounting`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `approval_transactions`
--
ALTER TABLE `approval_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `auction_bids`
--
ALTER TABLE `auction_bids`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `auction_transactions`
--
ALTER TABLE `auction_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `cases`
--
ALTER TABLE `cases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `case_cancellations`
--
ALTER TABLE `case_cancellations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `case_documents`
--
ALTER TABLE `case_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_conversations`
--
ALTER TABLE `chat_conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `chat_platforms`
--
ALTER TABLE `chat_platforms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `chat_tags`
--
ALTER TABLE `chat_tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `contact_requests`
--
ALTER TABLE `contact_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `debtor_accounting`
--
ALTER TABLE `debtor_accounting`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `document_templates`
--
ALTER TABLE `document_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `investments`
--
ALTER TABLE `investments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `investment_properties`
--
ALTER TABLE `investment_properties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `investors`
--
ALTER TABLE `investors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `investor_accounting`
--
ALTER TABLE `investor_accounting`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `investor_auction_history`
--
ALTER TABLE `investor_auction_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `investor_withdrawals`
--
ALTER TABLE `investor_withdrawals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `issuing_transactions`
--
ALTER TABLE `issuing_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `legal_transactions`
--
ALTER TABLE `legal_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `loan_requests`
--
ALTER TABLE `loan_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `provinces`
--
ALTER TABLE `provinces`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `approval_transactions`
--
ALTER TABLE `approval_transactions`
  ADD CONSTRAINT `approval_transactions_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `auction_bids`
--
ALTER TABLE `auction_bids`
  ADD CONSTRAINT `auction_bids_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `case_cancellations`
--
ALTER TABLE `case_cancellations`
  ADD CONSTRAINT `case_cancellations_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`),
  ADD CONSTRAINT `case_cancellations_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `admin_users` (`id`);

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `debtor_accounting`
--
ALTER TABLE `debtor_accounting`
  ADD CONSTRAINT `debtor_accounting_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `debtor_accounting_ibfk_2` FOREIGN KEY (`loan_request_id`) REFERENCES `loan_requests` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `issuing_transactions`
--
ALTER TABLE `issuing_transactions`
  ADD CONSTRAINT `issuing_transactions_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `legal_transactions`
--
ALTER TABLE `legal_transactions`
  ADD CONSTRAINT `legal_transactions_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
