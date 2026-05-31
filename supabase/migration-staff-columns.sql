-- Migration: Add missing staff_users columns
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS otp_code_hash TEXT;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS otp_session_token TEXT;
-- Add staff_user_id to tellers
ALTER TABLE tellers ADD COLUMN IF NOT EXISTS staff_user_id UUID REFERENCES staff_users(id);
CREATE INDEX IF NOT EXISTS idx_tellers_staff_user_id ON tellers(staff_user_id);
