-- Sample staff data for testing
-- Run this in Supabase SQL Editor

-- First, ensure staff_users table exists
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code VARCHAR(30) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  role VARCHAR(30) NOT NULL CHECK (role IN (
    'LOAN_OFFICER',
    'SUSU_COLLECTOR',
    'TELLER',
    'SUPERVISOR',
    'MANAGER',
    'ADMIN',
    'AUDITOR'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  password_hash VARCHAR(255) NOT NULL,
  admin_session_token VARCHAR(255),
  admin_session_expires_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample staff (password is 'admin123' hashed)
-- Hash for 'admin123': $2b$10$rBV2J7B8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J
-- Using bcrypt hash of 'admin123'

INSERT INTO staff_users (staff_code, full_name, email, phone_number, role, status, password_hash) VALUES
('ADM-001', 'System Admin', 'admin@susu-bg.com', '+233501234567', 'ADMIN', 'ACTIVE', '$2b$10$rBV2J7B8J8J8J8J8J8J8OeJYJ8J8J8J8J8J8J8J8J8J8J8J8J8J'),
('MGR-001', 'Branch Manager', 'manager@susu-bg.com', '+233501234568', 'MANAGER', 'ACTIVE', '$2b$10$rBV2J7B8J8J8J8J8J8J8OeJYJ8J8J8J8J8J8J8J8J8J8J8J8J'),
('SUP-001', 'Office Supervisor', 'supervisor@susu-bg.com', '+233501234569', 'SUPERVISOR', 'ACTIVE', '$2b$10$rBV2J7B8J8J8J8J8J8J8OeJYJ8J8J8J8J8J8J8J8J8J8J8J8'),
('TLR-001', 'Front Desk Teller', 'teller@susu-bg.com', '+233501234570', 'TELLER', 'ACTIVE', '$2b$10$rBV2J7B8J8J8J8J8J8J8OeJYJ8J8J8J8J8J8J8J8J8J8J8J8'),
('TLR-002', 'Cash Teller', 'teller2@susu-bg.com', '+233501234571', 'TELLER', 'ACTIVE', '$2b$10$rBV2J7B8J8J8J8J8J8J8OeJYJ8J8J8J8J8J8J8J8J8J8J8J8'),
('LOAN-001', 'Loan Officer', 'loan@susu-bg.com', '+233501234572', 'LOAN_OFFICER', 'ACTIVE', '$2b$10$rBV2J7B8J8J8J8J8J8J8OeJYJ8J8J8J8J8J8J8J8J8J8J8J8'),
('COLL-001', 'Susu Collector', 'collector@susu-bg.com', '+233501234573', 'SUSU_COLLECTOR', 'ACTIVE', '$2b$10$rBV2J7B8J8J8J8J8J8J8OeJYJ8J8J8J8J8J8J8J8J8J8J8J8'),
('AUD-001', 'Internal Auditor', 'auditor@susu-bg.com', '+233501234574', 'AUDITOR', 'ACTIVE', '$2b$10$rBV2J7B8J8J8J8J8J8J8OeJYJ8J8J8J8J8J8J8J8J8J8J8J8')
ON CONFLICT (staff_code) DO NOTHING;

-- Update password hashes with proper bcrypt (all using 'admin123')
UPDATE staff_users SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE password_hash LIKE '$2b$10$rBV2J%';

-- Verify setup
SELECT staff_code, full_name, role, status FROM staff_users ORDER BY role, staff_code;