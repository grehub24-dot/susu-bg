-- Admin Users Table (separate from staff_users)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    session_token VARCHAR(255),
    session_expires_at TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT true,
    otp_code_hash TEXT,
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    otp_session_token TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_admin_code ON admin_users(admin_code);
CREATE INDEX IF NOT EXISTS idx_admin_users_session_token ON admin_users(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_users_otp_session_token ON admin_users(otp_session_token);

-- Insert default admin (password: admin123)
-- bcrypt hash of 'admin123': $2b$10$kjDYhWVeMPdr2MHq2O6lmuT8nqNo1Nb2v2.mG8Q7q9qO.rVO0FS2S
INSERT INTO admin_users (admin_code, full_name, email, phone_number, password_hash)
VALUES ('ADM-001', 'System Admin', 'admin@susu-bg.com', '+233501234567', '$2b$10$kjDYhWVeMPdr2MHq2O6lmuT8nqNo1Nb2v2.mG8Q7q9qO.rVO0FS2S')
ON CONFLICT (admin_code) DO NOTHING;

-- Verify setup
SELECT admin_code, full_name, email, status FROM admin_users;