-- PostgreSQL Schema (Supabase)

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE, -- Supabase auth reference (optional depending on auth strategy)
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    pin_hash VARCHAR(255) NOT NULL, -- Hashed PIN for transactions/login
    otp_code_hash VARCHAR(255),
    otp_purpose VARCHAR(20),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    otp_verified_at TIMESTAMP WITH TIME ZONE,
    login_otp_session_token VARCHAR(255),
    login_otp_session_expires_at TIMESTAMP WITH TIME ZONE,
    pin_reset_token VARCHAR(255),
    pin_reset_expires_at TIMESTAMP WITH TIME ZONE,
    pin_reset_selfie_url TEXT,
    kyc_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- Admin approval state
    momo_number VARCHAR(15),
    bank_account_number VARCHAR(50),
    bank_sort_code VARCHAR(10),
    bank_name VARCHAR(100),
    card_number VARCHAR(50),
    house_address TEXT,
    gps_address VARCHAR(100),
    region VARCHAR(100),
    hometown VARCHAR(100),
    passport_picture_url TEXT,
    id_type VARCHAR(50),
    id_number VARCHAR(50),
    id_card_front_url TEXT,
    id_card_back_url TEXT,
    selfie_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);

-- 1b. Staff Users Table (Administration and Operations)
CREATE TABLE staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_code VARCHAR(30) UNIQUE NOT NULL, -- e.g. ADM-001, TLR-014
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
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash for staff password (e.g. admin123)
    admin_session_token VARCHAR(255),
    admin_session_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT false,
    otp_code_hash TEXT,
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    otp_session_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_staff_users_role ON staff_users(role);
CREATE INDEX idx_staff_users_status ON staff_users(status);
CREATE INDEX idx_staff_users_admin_session_token ON staff_users(admin_session_token);

-- 2. Wallets Table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0), -- Prevent negative balance
    currency VARCHAR(3) DEFAULT 'GHS' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Transactions Table (Ledger-based)
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    reference VARCHAR(255) UNIQUE NOT NULL, -- Paystack or external reference
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'PENDING' NOT NULL,
    metadata JSONB, -- Store webhook payload or extra details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for querying transactions efficiently
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_status ON transactions(status);

-- 4. Receipts Table
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE UNIQUE,
    receipt_url TEXT NOT NULL, -- Supabase storage URL for the PDF
    sent_via_email BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TYPE email_delivery_status AS ENUM ('SENT', 'FAILED');

CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_email VARCHAR(255) NOT NULL,
    subject TEXT,
    body_preview TEXT,
    email_type VARCHAR(50) DEFAULT 'NOTIFICATION' NOT NULL,
    status email_delivery_status NOT NULL,
    message_id TEXT,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);

CREATE TYPE revenue_source_type AS ENUM ('TRANSACTION', 'LOAN', 'INVESTMENT', 'ACCOUNT', 'MANUAL', 'OTHER');
CREATE TYPE revenue_category AS ENUM (
    'TRANSACTION_FEE',
    'LOAN_INTEREST',
    'INVESTMENT_RETURN',
    'ACCOUNT_MAINTENANCE',
    'PENALTY',
    'COMMISSION',
    'GOV_TAX_ELEVY',
    'OTHER'
);

CREATE TABLE revenue_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type revenue_source_type NOT NULL DEFAULT 'OTHER',
    category revenue_category NOT NULL DEFAULT 'OTHER',
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'GHS' NOT NULL,
    reference VARCHAR(255),
    note TEXT,
    description TEXT,
    tax_type VARCHAR(50),
    posted_date DATE DEFAULT CURRENT_DATE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_revenue_ledger_created_at ON revenue_ledger(created_at);
CREATE INDEX idx_revenue_ledger_category ON revenue_ledger(category);
CREATE INDEX idx_revenue_ledger_source_type ON revenue_ledger(source_type);
CREATE INDEX idx_revenue_ledger_reference ON revenue_ledger(reference);
CREATE UNIQUE INDEX idx_revenue_ledger_reference_category_source_unique
    ON revenue_ledger(reference, category, source_type)
    WHERE reference IS NOT NULL;

-- =====================================================
-- MISSING TABLES FOR ADMIN DASHBOARD
-- =====================================================

-- 5. Branches Table (Bank/Branch locations)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    region VARCHAR(100),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_branches_code ON branches(branch_code);
CREATE INDEX idx_branches_status ON branches(status);

-- 6. Tellers Table (Tellers linked to branches)
CREATE TABLE tellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teller_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    cash_position DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_tellers_code ON tellers(teller_code);
CREATE INDEX idx_tellers_branch ON tellers(branch_id);
CREATE INDEX idx_tellers_status ON tellers(status);
ALTER TABLE tellers ADD COLUMN IF NOT EXISTS staff_user_id UUID REFERENCES staff_users(id);
CREATE INDEX IF NOT EXISTS idx_tellers_staff_user_id ON tellers(staff_user_id);

-- 7. Compliance Flags Table
CREATE TYPE flag_type AS ENUM ('CTR', 'STR', 'AML_ALERT', 'OTHER');
CREATE TYPE flag_status AS ENUM ('OPEN', 'INVESTIGATING', 'CLOSED');

CREATE TABLE compliance_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_type flag_type NOT NULL DEFAULT 'OTHER',
    flag_status flag_status DEFAULT 'OPEN',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2),
    reported_to_bog BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_compliance_flags_status ON compliance_flags(flag_status);
CREATE INDEX idx_compliance_flags_type ON compliance_flags(flag_type);
CREATE INDEX idx_compliance_flags_user ON compliance_flags(user_id);

-- 8. Admin Users Table (for admin dashboard authentication)
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_code ON admin_users(admin_code);
CREATE INDEX idx_admin_users_session ON admin_users(session_token);

-- 9. Staff Sessions Table
CREATE TABLE staff_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff_users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_staff_sessions_token ON staff_sessions(token);
CREATE INDEX idx_staff_sessions_staff ON staff_sessions(staff_id);
CREATE INDEX idx_staff_sessions_expires ON staff_sessions(expires_at);

-- 10. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type VARCHAR(20) NOT NULL, -- 'admin', 'staff', 'user'
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_type, user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Database Functions (Wallet Logic)

-- Securely credit a wallet
CREATE OR REPLACE FUNCTION credit_wallet(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_reference VARCHAR
) RETURNS VOID AS $$
BEGIN
    -- Update transaction status (Idempotency check: ensures we only credit if PENDING)
    UPDATE transactions 
    SET status = 'SUCCESS', updated_at = now() 
    WHERE reference = p_reference AND status = 'PENDING';

    -- Only update wallet if the transaction update affected a row (prevents double crediting)
    IF FOUND THEN
        UPDATE wallets 
        SET balance = balance + p_amount, updated_at = now()
        WHERE id = p_wallet_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Securely debit a wallet
CREATE OR REPLACE FUNCTION debit_wallet(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_reference VARCHAR
) RETURNS VOID AS $$
BEGIN
    -- Ensure sufficient balance
    IF (SELECT balance FROM wallets WHERE id = p_wallet_id) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update transaction status
    UPDATE transactions 
    SET status = 'SUCCESS', updated_at = now() 
    WHERE reference = p_reference AND status = 'PENDING';

    IF FOUND THEN
        UPDATE wallets 
        SET balance = balance - p_amount, updated_at = now()
        WHERE id = p_wallet_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Initialize a withdrawal (Lock funds)
CREATE OR REPLACE FUNCTION init_withdrawal(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_reference VARCHAR
) RETURNS VOID AS $$
BEGIN
    -- Ensure sufficient balance
    IF (SELECT balance FROM wallets WHERE id = p_wallet_id) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Create pending transaction
    INSERT INTO transactions (wallet_id, reference, amount, type, status)
    VALUES (p_wallet_id, p_reference, p_amount, 'WITHDRAWAL', 'PENDING');

    -- Deduct balance immediately
    UPDATE wallets 
    SET balance = balance - p_amount, updated_at = now()
    WHERE id = p_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Refund wallet if withdrawal fails
CREATE OR REPLACE FUNCTION refund_wallet(
    p_reference VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_wallet_id UUID;
    v_amount DECIMAL;
BEGIN
    -- Find the pending transaction
    SELECT wallet_id, amount INTO v_wallet_id, v_amount
    FROM transactions 
    WHERE reference = p_reference AND status = 'PENDING';

    IF FOUND THEN
        -- Mark as failed
        UPDATE transactions 
        SET status = 'FAILED', updated_at = now() 
        WHERE reference = p_reference AND status = 'PENDING';

        -- Restore balance
        UPDATE wallets 
        SET balance = balance + v_amount, updated_at = now()
        WHERE id = v_wallet_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
