-- Modern Susu Model Database Schema
-- Aligned with BoG and GCSCA regulations

-- Susu Groups (Cooperative Groups)
CREATE TABLE susu_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(200) NOT NULL,
    group_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., "MKT-001" for market women
    target_group ENUM('MARKET_WOMEN', 'TAXI_DRIVERS', 'OFFICE_WORKERS', 'GENERAL') NOT NULL,
    collector_id UUID REFERENCES users(id) NOT NULL,
    max_members INTEGER DEFAULT 30,
    current_members INTEGER DEFAULT 0,
    daily_contribution DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    cycle_days INTEGER DEFAULT 30,
    status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Susu Memberships
CREATE TABLE susu_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    group_id UUID REFERENCES susu_groups(id) NOT NULL,
    membership_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "MKT-001-015"
    tier ENUM('SILVER', 'GOLD') DEFAULT 'SILVER',
    daily_contribution DECIMAL(10,2) NOT NULL,
    ghana_card_number VARCHAR(20) NOT NULL, -- AML compliance
    ghana_card_type ENUM('VOTER_ID', 'DRIVERS_LICENSE', 'PASSPORT', 'NATIONAL_ID') NOT NULL,
    guarantor_1_id UUID REFERENCES susu_memberships(id), -- P2P guarantee
    guarantor_2_id UUID REFERENCES susu_memberships(id), -- P2P guarantee
    status ENUM('ACTIVE', 'SUSPENDED', 'WITHDRAWN') DEFAULT 'ACTIVE',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_contribution_date DATE,
    total_contributions DECIMAL(12,2) DEFAULT 0.00,
    cycle_start_date DATE NOT NULL,
    cycle_end_date DATE NOT NULL,
    UNIQUE(user_id, group_id)
);

-- Daily Contributions
CREATE TABLE susu_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID REFERENCES susu_memberships(id) NOT NULL,
    group_id UUID REFERENCES susu_groups(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    contribution_date DATE NOT NULL,
    payment_method ENUM('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER') DEFAULT 'CASH',
    collector_id UUID REFERENCES users(id) NOT NULL,
    transaction_reference VARCHAR(100) UNIQUE,
    sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(membership_id, contribution_date)
);

-- Susu Loans (Micro-lending)
CREATE TABLE susu_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID REFERENCES susu_memberships(id) NOT NULL,
    group_id UUID REFERENCES susu_groups(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL, -- Monthly interest rate (3-7%)
    loan_term_days INTEGER NOT NULL, -- 30-90 days
    processing_fee DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    insurance_fee DECIMAL(10,2) NOT NULL,
    total_repayment DECIMAL(10,2) NOT NULL,
    guarantor_1_id UUID REFERENCES susu_memberships(id) NOT NULL,
    guarantor_2_id UUID REFERENCES susu_memberships(id) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'DISBURSED', 'REPAID', 'DEFAULTED') DEFAULT 'PENDING',
    application_date DATE NOT NULL,
    approval_date DATE,
    disbursement_date DATE,
    due_date DATE,
    repaid_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loan Repayments
CREATE TABLE susu_loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES susu_loans(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    principal_amount DECIMAL(10,2) NOT NULL,
    interest_amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER') DEFAULT 'CASH',
    collector_id UUID REFERENCES users(id) NOT NULL,
    transaction_reference VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee Structure
CREATE TABLE susu_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID REFERENCES susu_memberships(id) NOT NULL,
    fee_type ENUM('ONBOARDING', 'SMS_SUBSCRIPTION', 'PREMATURE_WITHDRAWAL', 'MAINTENANCE') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    charged_date DATE NOT NULL,
    transaction_reference VARCHAR(100) UNIQUE,
    status ENUM('PAID', 'PENDING', 'WAIVED') DEFAULT 'PAID',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue Ledger (Extended for Susu)
CREATE TABLE susu_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES susu_groups(id) NOT NULL,
    revenue_type ENUM('COMMISSION', 'PROCESSING_FEE', 'INTEREST', 'INSURANCE_FEE', 'SMS_FEE', 'MAINTENANCE_FEE', 'WITHDRAWAL_FEE') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    source_id UUID, -- Reference to loan, fee, or contribution
    source_type VARCHAR(50), -- 'loan', 'fee', 'contribution'
    description TEXT,
    revenue_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Liquidity Management (80/20 Rule)
CREATE TABLE susu_liquidity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES susu_groups(id) NOT NULL,
    total_deposits DECIMAL(12,2) NOT NULL,
    vault_cash DECIMAL(12,2) NOT NULL, -- 20% liquid
    loan_portfolio DECIMAL(12,2) NOT NULL, -- 80% for lending
    available_for_loans DECIMAL(12,2) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id)
);

-- SMS Logs (Compliance)
CREATE TABLE susu_sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID REFERENCES susu_memberships(id) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_type ENUM('CONTRIBUTION', 'LOAN_APPROVAL', 'LOAN_REMINDER', 'BALANCE', 'PAYOUT') NOT NULL,
    message_content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status ENUM('SENT', 'DELIVERED', 'FAILED') DEFAULT 'SENT',
    sms_provider VARCHAR(50) DEFAULT 'WIGAL'
);

-- Group Cycles
CREATE TABLE susu_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES susu_groups(id) NOT NULL,
    cycle_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_contributions DECIMAL(12,2) DEFAULT 0.00,
    total_loans_disbursed DECIMAL(12,2) DEFAULT 0.00,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('ACTIVE', 'COMPLETED', 'TERMINATED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payout Records
CREATE TABLE susu_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID REFERENCES susu_memberships(id) NOT NULL,
    cycle_id UUID REFERENCES susu_cycles(id) NOT NULL,
    payout_amount DECIMAL(12,2) NOT NULL,
    commission_deducted DECIMAL(10,2) NOT NULL, -- 31st day rule
    net_payout DECIMAL(12,2) NOT NULL,
    payout_date DATE NOT NULL,
    payment_method ENUM('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER') DEFAULT 'CASH',
    collector_id UUID REFERENCES users(id) NOT NULL,
    transaction_reference VARCHAR(100) UNIQUE,
    status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PAID',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_susu_memberships_user_id ON susu_memberships(user_id);
CREATE INDEX idx_susu_memberships_group_id ON susu_memberships(group_id);
CREATE INDEX idx_susu_contributions_membership_id ON susu_contributions(membership_id);
CREATE INDEX idx_susu_contributions_date ON susu_contributions(contribution_date);
CREATE INDEX idx_susu_loans_borrower_id ON susu_loans(borrower_id);
CREATE INDEX idx_susu_loans_status ON susu_loans(status);
CREATE INDEX idx_susu_revenue_group_id ON susu_revenue(group_id);
CREATE INDEX idx_susu_revenue_date ON susu_revenue(revenue_date);

-- Views for Reporting
CREATE VIEW susu_group_summary AS
SELECT 
    g.id,
    g.group_name,
    g.target_group,
    COUNT(m.id) as active_members,
    COALESCE(SUM(m.daily_contribution), 0) as daily_collection_target,
    COALESCE(SUM(sc.amount), 0) as total_contributions_today,
    COALESCE(l.vault_cash, 0) as vault_cash,
    COALESCE(l.loan_portfolio, 0) as loan_portfolio,
    g.status
FROM susu_groups g
LEFT JOIN susu_memberships m ON g.id = m.group_id AND m.status = 'ACTIVE'
LEFT JOIN susu_contributions sc ON g.id = sc.group_id AND sc.contribution_date = CURRENT_DATE
LEFT JOIN susu_liquidity l ON g.id = l.group_id
GROUP BY g.id, g.group_name, g.target_group, g.status, l.vault_cash, l.loan_portfolio;

-- Triggers for Business Logic
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE susu_groups SET current_members = current_members + 1 WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE susu_groups SET current_members = current_members - 1 WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_member_count
    AFTER INSERT OR DELETE ON susu_memberships
    FOR EACH ROW EXECUTE FUNCTION update_group_member_count();
