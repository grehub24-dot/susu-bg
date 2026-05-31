-- Auth system upgrade: add OTP and lockout columns to staff_users
-- Run this in Supabase SQL Editor

-- Failed login tracking + lockout
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT true;

-- OTP fields for staff login
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS otp_code_hash TEXT;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS otp_session_token TEXT;

-- Index for OTP session token lookups
CREATE INDEX IF NOT EXISTS idx_staff_users_otp_session_token ON staff_users(otp_session_token);

-- Staff login sessions table (tracks active JWT sessions)
CREATE TABLE IF NOT EXISTS staff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_user_id ON staff_sessions(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_refresh_token_hash ON staff_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires_at ON staff_sessions(expires_at);