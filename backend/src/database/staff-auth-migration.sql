-- Staff authentication and teller mapping schema migration
-- Run this in Supabase SQL Editor before running backend/scripts/migrate-add-role-columns.js

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

CREATE INDEX IF NOT EXISTS idx_staff_users_role ON staff_users(role);
CREATE INDEX IF NOT EXISTS idx_staff_users_status ON staff_users(status);
CREATE INDEX IF NOT EXISTS idx_staff_users_admin_session_token ON staff_users(admin_session_token);

ALTER TABLE tellers ADD COLUMN IF NOT EXISTS staff_user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'tellers'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'tellers_staff_user_id_fkey'
  ) THEN
    ALTER TABLE tellers
      ADD CONSTRAINT tellers_staff_user_id_fkey
      FOREIGN KEY (staff_user_id) REFERENCES staff_users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tellers_staff_user_id ON tellers(staff_user_id);
