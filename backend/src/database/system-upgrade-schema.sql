-- System Upgrade Database Schema
-- Based on System upgrade.md requirements for BoG/GCSCA compliance
-- This script includes original schema tables plus new tables and enhancements
-- Can be applied on a fresh database

-- ============================================================
-- MIGRATION: Add role and compliance columns to users table
-- ============================================================

-- Ensure client compliance fields exist on users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'kyc_status'
    ) THEN
        ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20) DEFAULT 'PENDING';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'risk_rating'
    ) THEN
        ALTER TABLE users ADD COLUMN risk_rating VARCHAR(20) DEFAULT 'LOW';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'pep_status'
    ) THEN
        ALTER TABLE users ADD COLUMN pep_status BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'ghana_card_number'
    ) THEN
        ALTER TABLE users ADD COLUMN ghana_card_number VARCHAR(20);
    END IF;
END $$;

-- ============================================================
-- ORIGINAL SCHEMA TABLES (from susu-schema.sql)
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'PENDING',
    risk_rating VARCHAR(20) DEFAULT 'LOW',
    pep_status BOOLEAN DEFAULT FALSE,
    ghana_card_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WALLETS
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'GHS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(50) UNIQUE NOT NULL,
    wallet_id UUID NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUSU_GROUPS
CREATE TABLE IF NOT EXISTS susu_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(255) NOT NULL,
    group_code VARCHAR(20) UNIQUE NOT NULL,
    target_group VARCHAR(100),
    daily_contribution DECIMAL(15,2) NOT NULL,
    cycle_days INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUSU_MEMBERSHIPS
CREATE TABLE IF NOT EXISTS susu_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    group_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

-- SUSU_CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS susu_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    group_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    contribution_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'CASH',
    collector_id UUID NOT NULL,
    transaction_reference VARCHAR(100),
    sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(membership_id, contribution_date)
);

-- SUSU_LOANS
CREATE TABLE IF NOT EXISTS susu_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 10.00,
    repayment_period INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'PENDING',
    disbursed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUSU_FEES
CREATE TABLE IF NOT EXISTS susu_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID,
    fee_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUSU_LIQUIDITY
CREATE TABLE IF NOT EXISTS susu_liquidity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL UNIQUE,
    total_deposits DECIMAL(15,2) DEFAULT 0.00,
    vault_cash DECIMAL(15,2) DEFAULT 0.00,
    loan_portfolio DECIMAL(15,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS_LOGS
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUSU_CYCLES
CREATE TABLE IF NOT EXISTS susu_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    cycle_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_contributions DECIMAL(15,2) DEFAULT 0.00,
    total_payouts DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, cycle_number)
);

-- SUSU_PAYOUTS
CREATE TABLE IF NOT EXISTS susu_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    cycle_id UUID NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payout_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- NEW TABLES (System Upgrade)
-- ============================================================

-- STAFF USERS (Backoffice/Operations identities)
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

-- TELLERS (Branch Operations)
CREATE TABLE IF NOT EXISTS tellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID UNIQUE REFERENCES staff_users(id),
    user_id UUID,
    teller_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    branch_id UUID NOT NULL,
    daily_limit DECIMAL(15,2) DEFAULT 50000.00,
    current_cash_position DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COMPLIANCE_FLAGS (BoG Compliance - CTR/STR/AML)
CREATE TABLE IF NOT EXISTS compliance_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    flag_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount_involved DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'OPEN',
    reported_to_bog BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- BRANCH_ACCOUNTS (Multi-branch Operations)
CREATE TABLE IF NOT EXISTS branch_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(20) UNIQUE NOT NULL,
    location TEXT,
    assets DECIMAL(15,2) DEFAULT 0.00,
    liabilities DECIMAL(15,2) DEFAULT 0.00,
    equity DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT_LOGS (Compliance Tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RECEIPTS (Receipt Generation)
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    receipt_type VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(30),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pdf_url TEXT,
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- ENHANCED EXISTING TABLES
-- ============================================================

-- Enhance USERS table with AML fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS risk_rating VARCHAR(10) DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS pep_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ghana_card_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS ghana_card_image_url TEXT;

-- Enhance WALLETS table with limits and branch
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS daily_limit DECIMAL(15,2) DEFAULT 5000.00,
ADD COLUMN IF NOT EXISTS monthly_limit DECIMAL(15,2) DEFAULT 50000.00,
ADD COLUMN IF NOT EXISTS branch_id UUID,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- Enhance TRANSACTIONS table with channel and teller
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS channel VARCHAR(30),
ADD COLUMN IF NOT EXISTS teller_id UUID,
ADD COLUMN IF NOT EXISTS susu_collection_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Enhance SUSU_GROUPS table with tier and liquidity
ALTER TABLE susu_groups
ADD COLUMN IF NOT EXISTS tier VARCHAR(10) DEFAULT 'SILVER',
ADD COLUMN IF NOT EXISTS monthly_maintenance_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vault_cash DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS loan_portfolio DECIMAL(15,2) DEFAULT 0.00;

-- Enhance SUSU_MEMBERSHIPS table with compliance
ALTER TABLE susu_memberships
ADD COLUMN IF NOT EXISTS guarantor_1_id UUID,
ADD COLUMN IF NOT EXISTS guarantor_2_id UUID,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_contributions INTEGER DEFAULT 0;

-- ============================================================
-- ENHANCED REVENUE LEDGER
-- ============================================================

-- Drop existing revenue_ledger if it exists and create enhanced version
DROP TABLE IF EXISTS revenue_ledger CASCADE;
DROP TABLE IF EXISTS susu_revenue CASCADE;

CREATE TABLE revenue_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GHS',
    description TEXT,
    metadata JSONB,
    teller_id UUID,
    susu_group_id UUID,
    branch_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    posted_date DATE DEFAULT CURRENT_DATE
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tellers_branch_id ON tellers(branch_id);
CREATE INDEX IF NOT EXISTS idx_tellers_status ON tellers(status);
CREATE INDEX IF NOT EXISTS idx_tellers_staff_user_id ON tellers(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_role ON staff_users(role);
CREATE INDEX IF NOT EXISTS idx_staff_users_status ON staff_users(status);
CREATE INDEX IF NOT EXISTS idx_staff_users_admin_session_token ON staff_users(admin_session_token);
CREATE INDEX IF NOT EXISTS idx_compliance_flags_user_id ON compliance_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_flags_type ON compliance_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_compliance_flags_status ON compliance_flags(status);
CREATE INDEX IF NOT EXISTS idx_branch_accounts_code ON branch_accounts(branch_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_revenue_ledger_category ON revenue_ledger(category);
CREATE INDEX IF NOT EXISTS idx_revenue_ledger_source ON revenue_ledger(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_revenue_ledger_date ON revenue_ledger(posted_date);
CREATE INDEX IF NOT EXISTS idx_transactions_channel ON transactions(channel);
CREATE INDEX IF NOT EXISTS idx_transactions_teller ON transactions(teller_id);
CREATE INDEX IF NOT EXISTS idx_users_risk_rating ON users(risk_rating);
CREATE INDEX IF NOT EXISTS idx_wallets_branch ON wallets(branch_id);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);

-- ============================================================
-- VIEWS FOR REPORTING
-- ============================================================

-- Branch Summary View
CREATE OR REPLACE VIEW branch_summary AS
SELECT 
    ba.id,
    ba.branch_name,
    ba.branch_code,
    ba.assets,
    ba.liabilities,
    ba.equity,
    COUNT(DISTINCT t.id) as teller_count,
    COUNT(DISTINCT w.id) as wallet_count,
    COALESCE(SUM(w.balance), 0) as total_wallet_balance,
    ba.status
FROM branch_accounts ba
LEFT JOIN tellers t ON ba.id = t.branch_id AND t.status = 'ACTIVE'
LEFT JOIN wallets w ON ba.id = w.branch_id AND w.status = 'ACTIVE'
GROUP BY ba.id, ba.branch_name, ba.branch_code, ba.assets, ba.liabilities, ba.equity, ba.status;

-- Compliance Dashboard View
CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
    cf.flag_type,
    cf.status,
    COUNT(*) as flag_count,
    COALESCE(SUM(cf.amount_involved), 0) as total_amount,
    COUNT(CASE WHEN cf.reported_to_bog = TRUE THEN 1 END) as reported_to_bog
FROM compliance_flags cf
GROUP BY cf.flag_type, cf.status;

-- Revenue by Category View
CREATE OR REPLACE VIEW revenue_by_category AS
SELECT 
    category,
    posted_date,
    COUNT(*) as transaction_count,
    SUM(amount) as total_revenue
FROM revenue_ledger
GROUP BY category, posted_date
ORDER BY posted_date DESC, category;

-- ============================================================
-- TRIGGERS FOR BUSINESS LOGIC
-- ============================================================

-- Trigger to update teller cash position
CREATE OR REPLACE FUNCTION update_teller_cash_position()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'SUCCESS' AND OLD.status = 'PENDING' THEN
        IF NEW.type = 'DEPOSIT' THEN
            UPDATE tellers SET current_cash_position = current_cash_position + NEW.amount 
            WHERE id = NEW.teller_id;
        ELSIF NEW.type = 'WITHDRAWAL' THEN
            UPDATE tellers SET current_cash_position = current_cash_position - NEW.amount 
            WHERE id = NEW.teller_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_teller_cash_position ON transactions;
CREATE TRIGGER trigger_update_teller_cash_position
    AFTER UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION update_teller_cash_position();

-- Trigger to create compliance flags for large transactions (CTR threshold: GHS 20,000)
CREATE OR REPLACE FUNCTION check_ctr_threshold()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'SUCCESS' AND NEW.amount >= 20000 THEN
        INSERT INTO compliance_flags (
            user_id,
            flag_type,
            description,
            amount_involved,
            status
        )
        SELECT 
            w.user_id,
            'CTR',
            'Large transaction exceeding GHS 20,000 threshold',
            NEW.amount,
            'OPEN'
        FROM wallets w
        WHERE w.id = NEW.wallet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_ctr_threshold ON transactions;
CREATE TRIGGER trigger_check_ctr_threshold
    AFTER UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'SUCCESS' AND NEW.amount >= 20000)
    EXECUTE FUNCTION check_ctr_threshold();

-- ============================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================

-- Function to calculate 80/20 liquidity for susu groups
-- Calculates vault cash (20%) and loan portfolio (80%) from total contributions
CREATE OR REPLACE FUNCTION update_susu_liquidity(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_deposits DECIMAL(15,2);
    v_vault_cash DECIMAL(15,2);
    v_loan_portfolio DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(contribution_amount), 0) INTO v_total_deposits
    FROM susu_contributions
    WHERE group_id = p_group_id AND status = 'PAID';

    v_vault_cash := v_total_deposits * 0.20;
    v_loan_portfolio := v_total_deposits * 0.80;

    UPDATE susu_groups
    SET 
        vault_cash = v_vault_cash,
        loan_portfolio = v_loan_portfolio,
        updated_at = NOW()
    WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql;

-- Function to post revenue to ledger
CREATE OR REPLACE FUNCTION post_revenue(
    p_category VARCHAR,
    p_source_type VARCHAR,
    p_source_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_metadata JSONB,
    p_teller_id UUID,
    p_susu_group_id UUID,
    p_branch_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_revenue_id UUID;
BEGIN
    INSERT INTO revenue_ledger (
        category,
        source_type,
        source_id,
        amount,
        description,
        metadata,
        teller_id,
        susu_group_id,
        branch_id
    ) VALUES (
        p_category,
        p_source_type,
        p_source_id,
        p_amount,
        p_description,
        p_metadata,
        p_teller_id,
        p_susu_group_id,
        p_branch_id
    ) RETURNING id INTO v_revenue_id;

    RETURN v_revenue_id;
END;
$$ LANGUAGE plpgsql;
