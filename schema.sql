-- Database Schema for ID & Visiting Card Tracker
-- Database: id_card_tracker

CREATE DATABASE IF NOT EXISTS `id_card_tracker`;
USE `id_card_tracker`;

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS `branches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Employees Table
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `branch_id` INT NOT NULL,
  `designation` VARCHAR(100) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users Table (System Access)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ID Card Requests Table
CREATE TABLE IF NOT EXISTS `id_card_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `card_type` VARCHAR(50) NOT NULL DEFAULT 'Standard', -- e.g., Standard, Smart Card, RFID, Temporary
  `request_date` DATE NOT NULL,
  `requested_by` VARCHAR(100) NOT NULL,
  `print_date` DATE DEFAULT NULL,
  `issue_date` DATE DEFAULT NULL,
  `status` ENUM('Pending', 'Printed', 'Issued') NOT NULL DEFAULT 'Pending',
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Visiting Card Requests Table
CREATE TABLE IF NOT EXISTS `visiting_card_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 100,
  `request_date` DATE NOT NULL,
  `requested_by` VARCHAR(100) NOT NULL,
  `print_date` DATE DEFAULT NULL,
  `issue_date` DATE DEFAULT NULL,
  `status` ENUM('Pending', 'Printed', 'Issued') NOT NULL DEFAULT 'Pending',
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INDEXES for Optimized Searching & Reports
CREATE INDEX idx_employee_name ON employees(name);
CREATE INDEX idx_employee_branch ON employees(branch_id);
CREATE INDEX idx_id_req_status ON id_card_requests(status);
CREATE INDEX idx_id_req_date ON id_card_requests(request_date);
CREATE INDEX idx_vc_req_status ON visiting_card_requests(status);
CREATE INDEX idx_vc_req_date ON visiting_card_requests(request_date);


-- ==========================================
-- SEED DATA (For initial setups & references)
-- ==========================================

-- Seed Branches
INSERT INTO `branches` (`id`, `name`) VALUES
(1, 'Information Technology'),
(2, 'Human Resources'),
(3, 'Finance & Accounts'),
(4, 'Marketing & Sales'),
(5, 'Operations')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Seed Employees
INSERT INTO `employees` (`id`, `employee_code`, `name`, `branch_id`, `designation`, `mobile`, `email`) VALUES
(1, 'EMP001', 'John Doe', 1, 'Senior Software Engineer', '+1 555-0101', 'john.doe@company.com'),
(2, 'EMP002', 'Jane Smith', 2, 'HR Manager', '+1 555-0102', 'jane.smith@company.com'),
(3, 'EMP003', 'Robert Johnson', 3, 'Financial Analyst', '+1 555-0103', 'robert.j@company.com'),
(4, 'EMP004', 'Emily Davis', 4, 'Marketing Executive', '+1 555-0104', 'emily.d@company.com'),
(5, 'EMP005', 'Michael Brown', 5, 'Operations Supervisor', '+1 555-0105', 'michael.b@company.com'),
(6, 'EMP006', 'Sarah Wilson', 1, 'QA Engineer', '+1 555-0106', 'sarah.w@company.com')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `branch_id` = VALUES(`branch_id`), `designation` = VALUES(`designation`), `mobile` = VALUES(`mobile`), `email` = VALUES(`email`);

-- Seed Users
-- Hashed passwords represent simple plain-text equivalence: 'admin123', 'user123'
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `name`, `email`) VALUES
(1, 'admin', 'admin123', 'Admin', 'System Administrator', 'admin@company.com'),
(2, 'user', 'user123', 'User', 'Staff User', 'user@company.com')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`), `password_hash` = VALUES(`password_hash`), `role` = VALUES(`role`), `name` = VALUES(`name`), `email` = VALUES(`email`);

-- Seed ID Card Requests
INSERT INTO `id_card_requests` (`id`, `employee_id`, `card_type`, `request_date`, `requested_by`, `print_date`, `issue_date`, `status`, `remarks`) VALUES
(1, 1, 'RFID', '2026-05-10', 'Jane Smith', '2026-05-12', '2026-05-13', 'Issued', 'RFID card configuration complete'),
(2, 2, 'Standard', '2026-05-15', 'Jane Smith', '2026-05-16', NULL, 'Printed', 'Awaiting pick up'),
(3, 3, 'Smart Card', '2026-06-01', 'Jane Smith', NULL, NULL, 'Pending', 'Requires access control integration'),
(4, 4, 'Standard', '2026-06-02', 'Jane Smith', NULL, NULL, 'Pending', 'New joining request')
ON DUPLICATE KEY UPDATE `card_type` = VALUES(`card_type`), `status` = VALUES(`status`), `remarks` = VALUES(`remarks`);

-- Seed Visiting Card Requests
INSERT INTO `visiting_card_requests` (`id`, `employee_id`, `quantity`, `request_date`, `requested_by`, `print_date`, `issue_date`, `status`, `remarks`) VALUES
(1, 4, 200, '2026-05-08', 'Jane Smith', '2026-05-10', '2026-05-11', 'Issued', 'Premium matte finish'),
(2, 1, 100, '2026-05-20', 'Jane Smith', '2026-05-22', NULL, 'Printed', 'Standard company template'),
(3, 5, 500, '2026-06-01', 'Jane Smith', NULL, NULL, 'Pending', 'Need for upcoming vendor conference')
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`), `status` = VALUES(`status`), `remarks` = VALUES(`remarks`);
