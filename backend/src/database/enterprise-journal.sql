-- Enterprise Fintech: Double-Entry Journal & E-Levy Compliance
-- This file contains the enterprise-grade accounting additions
-- Add to system-upgrade-schema.sql or run separately

-- ============================================================
-- 1. JOURNAL_ENTRIES TABLE (Double-Entry Accounting)
-- ============================================================
-- Every wallet operation creates balanced debit/credit entries
-- Sum(Debits) - Sum(Credits) must always equal Wallet Balance

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    account_type VARCHAR(50) NOT NULL, -- 'ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE'
    account_code VARCHAR(50) NOT NULL, -- e.g., 'USER_WALLET', 'COMPANY_BANK', 'GOV_TAX'
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount_cents BIGINT NOT NULL, -- Integer cents to avoid float errors
    currency VARCHAR(3) DEFAULT 'GHS',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast reconciliation
CREATE INDEX IF NOT EXISTS idx_journal_transaction ON journal_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_journal_account ON journal_entries(account_code, entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_created ON journal_entries(created_at DESC);

-- ============================================================
-- 2. ADD E-LEVY REVENUE CATEGORY
-- ============================================================
-- E-Levy is a Ghana government tax on digital transactions
-- Separate from TRANSACTION_FEE for BoG reporting

DO $$
BEGIN
    -- Add E_LEVY category to revenue_category enum if using PostgreSQL enum
    -- For Supabase text-based approach, we just document the category
    -- The category is already valid as text in revenue_ledger.category
    RAISE NOTICE 'E-Levy category (GOV_TAX_ELEVY) is text-based, no enum change needed';
END $$;

-- ============================================================
-- 3. ENHANCED REVENUE CATEGORIES
-- ============================================================
-- New categories for enterprise reporting

-- DOCUMENT: Use these categories in revenue_ledger.category
-- 'TRANSACTION_FEE'    - Our service fee
-- 'GOV_TAX_ELEVY'      - Government E-Levy (1% on digital transactions)
-- 'GOV_TAX_CGT'        - Capital Gains Tax (if applicable)
-- 'LOAN_INTEREST'       - Interest on susu loans
-- 'COMMISSION'        - Collection commission
-- 'ACCOUNT_MAINTENANCE' - Monthly maintenance fees
-- 'PENALTY'           - Late payment penalties
-- 'OTHER'             - Miscellaneous

-- ============================================================
-- 4. RECONCILIATION FUNCTION
-- ============================================================
-- Run nightly to verify data integrity
-- Returns 0 if balanced, >0 for discrepancy count

CREATE OR REPLACE FUNCTION reconcile_wallet_balances()
RETURNS TABLE (
    wallet_id UUID,
    reported_balance DECIMAL,
    calculated_balance DECIMAL,
    discrepancy DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.balance as reported_balance,
        COALESCE(
            (SELECT SUM(je.amount_cents) / 100.0
             FROM journal_entries je
             WHERE je.transaction_id IN (
                 SELECT t.id FROM transactions t WHERE t.wallet_id = w.id
             )
               AND je.account_code = 'USER_WALLET'
               AND je.entry_type = 'DEBIT'
             ) -
            (SELECT COALESCE(SUM(je.amount_cents), 0) / 100.0
             FROM journal_entries je
             WHERE je.transaction_id IN (
                 SELECT t.id FROM transactions t WHERE t.wallet_id = w.id
             )
               AND je.account_code = 'USER_WALLET'
               AND je.entry_type = 'CREDIT'
            ),
            0
        ) as calculated_balance,
        w.balance - COALESCE(
            (SELECT SUM(je.amount_cents) / 100.0
             FROM journal_entries je
             WHERE je.transaction_id IN (
                 SELECT t.id FROM transactions t WHERE t.wallet_id = w.id
             )
               AND je.account_code = 'USER_WALLET'
               AND je.entry_type = 'DEBIT'
             ) -
            (SELECT COALESCE(SUM(je.amount_cents), 0) / 100.0
             FROM journal_entries je
             WHERE je.transaction_id IN (
                 SELECT t.id FROM transactions t WHERE t.wallet_id = w.id
             )
               AND je.account_code = 'USER_WALLET'
               AND je.entry_type = 'CREDIT'
            ),
            0
        ) as discrepancy
    FROM wallets w;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. ENHANCED CREDIT WALLET (with Journal)
-- ============================================================
-- Replaces simple credit_wallet with double-entry journaling

CREATE OR REPLACE FUNCTION credit_wallet_with_journal(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_reference VARCHAR,
    p_fee_amount DECIMAL DEFAULT 0,
    p_elevy_amount DECIMAL DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    v_transaction_id UUID;
    v_amount_cents BIGINT;
    v_fee_cents BIGINT;
    v_elevy_cents BIGINT;
BEGIN
    v_amount_cents := FLOOR(p_amount * 100)::BIGINT;
    v_fee_cents := FLOOR(COALESCE(p_fee_amount, 0) * 100)::BIGINT;
    v_elevy_cents := FLOOR(COALESCE(p_elevy_amount, 0) * 100)::BIGINT;

    -- Idempotency: Only process PENDING transactions
    UPDATE transactions
    SET status = 'SUCCESS', updated_at = now()
    WHERE reference = p_reference AND status = 'PENDING'
    RETURNING id INTO v_transaction_id;

    IF NOT FOUND THEN
        RETURN; -- Already processed or not found
    END IF;

    -- Credit User Wallet (DEBIT to LIABILITY)
    INSERT INTO journal_entries (transaction_id, account_type, account_code, entry_type, amount_cents)
    VALUES (v_transaction_id, 'LIABILITY', 'USER_WALLET', 'DEBIT', v_amount_cents);

    -- Credit Company Bank (CREDIT to ASSET)
    INSERT INTO journal_entries (transaction_id, account_type, account_code, entry_type, amount_cents)
    VALUES (v_transaction_id, 'ASSET', 'COMPANY_BANK', 'CREDIT', v_amount_cents);

    -- Service Fee to Revenue Ledger
    IF v_fee_cents > 0 THEN
        INSERT INTO revenue_ledger (source_type, category, amount, currency, description, reference, tax_type, posted_date)
        VALUES ('TRANSACTION', 'TRANSACTION_FEE', p_fee_amount, 'GHS', 'Transaction service fee', p_reference, 'NONE', NOW());
    END IF;

    -- E-Levy to Government Tax
    IF v_elevy_cents > 0 THEN
        INSERT INTO revenue_ledger (source_type, category, amount, currency, description, reference, tax_type, posted_date)
        VALUES ('TRANSACTION', 'GOV_TAX_ELEVY', p_elevy_amount, 'GHS', 'Government E-Levy tax', p_reference, 'ELEVY', NOW());
    END IF;

    -- Update wallet balance
    UPDATE wallets
    SET balance = balance + p_amount, updated_at = now()
    WHERE id = p_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. ENHANCED DEBIT WALLET (with Journal)
-- ============================================================

CREATE OR REPLACE FUNCTION debit_wallet_with_journal(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_reference VARCHAR,
    p_fee_amount DECIMAL DEFAULT 0,
    p_elevy_amount DECIMAL DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    v_transaction_id UUID;
    v_amount_cents BIGINT;
    v_fee_cents BIGINT;
    v_elevy_cents BIGINT;
BEGIN
    -- Check balance first
    IF (SELECT balance FROM wallets WHERE id = p_wallet_id) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    v_amount_cents := FLOOR(p_amount * 100)::BIGINT;
    v_fee_cents := FLOOR(COALESCE(p_fee_amount, 0) * 100)::BIGINT;
    v_elevy_cents := FLOOR(COALESCE(p_elevy_amount, 0) * 100)::BIGINT;

    -- Create pending transaction
    INSERT INTO transactions (wallet_id, reference, amount, type, status)
    VALUES (p_wallet_id, p_reference, p_amount, 'WITHDRAWAL', 'SUCCESS')
    RETURNING id INTO v_transaction_id;

    -- Debit User Wallet (CREDIT to LIABILITY = reduce liability)
    INSERT INTO journal_entries (transaction_id, account_type, account_code, entry_type, amount_cents)
    VALUES (v_transaction_id, 'LIABILITY', 'USER_WALLET', 'CREDIT', v_amount_cents);

    -- Debit Company Bank (DEBIT from ASSET)
    INSERT INTO journal_entries (transaction_id, account_type, account_code, entry_type, amount_cents)
    VALUES (v_transaction_id, 'ASSET', 'COMPANY_BANK', 'DEBIT', v_amount_cents);

    -- Service Fee
    IF v_fee_cents > 0 THEN
        INSERT INTO revenue_ledger (source_type, category, amount, currency, description, reference, tax_type, posted_date)
        VALUES ('TRANSACTION', 'TRANSACTION_FEE', p_fee_amount, 'GHS', 'Withdrawal fee', p_reference, 'NONE', NOW());
    END IF;

    -- E-Levy
    IF v_elevy_cents > 0 THEN
        INSERT INTO revenue_ledger (source_type, category, amount, currency, description, reference, tax_type, posted_date)
        VALUES ('TRANSACTION', 'GOV_TAX_ELEVY', p_elevy_amount, 'GHS', 'Withdrawal E-Levy', p_reference, 'ELEVY', NOW());
    END IF;

    -- Update wallet balance
    UPDATE wallets
    SET balance = balance - p_amount, updated_at = now()
    WHERE id = p_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. VIEW: Reconciliation Status
-- ============================================================

CREATE OR REPLACE VIEW reconciliation_status AS
SELECT
    w.id as wallet_id,
    w.balance as current_balance,
    (
        SELECT COUNT(*)
        FROM reconcile_wallet_balances() r
        WHERE r.wallet_id = w.id AND r.discrepancy != 0
    ) as has_discrepancy,
    (
        SELECT COALESCE(SUM(je.amount_cents), 0)
        FROM journal_entries je
        WHERE je.account_code = 'USER_WALLET' AND je.entry_type = 'DEBIT'
          AND je.transaction_id IN (SELECT id FROM transactions WHERE wallet_id = w.id)
    ) as total_debits_cents,
    (
        SELECT COALESCE(SUM(je.amount_cents), 0)
        FROM journal_entries je
        WHERE je.account_code = 'USER_WALLET' AND je.entry_type = 'CREDIT'
          AND je.transaction_id IN (SELECT id FROM transactions WHERE wallet_id = w.id)
    ) as total_credits_cents,
    w.updated_at as last_updated
FROM wallets w;

COMMENT ON TABLE journal_entries IS 'Double-entry accounting journal. Sum(Debits) - Sum(Credits) for USER_WALLET must equal wallet.balance';
COMMENT ON FUNCTION reconcile_wallet_balances IS 'Verify wallet balance matches journal entries. Run nightly via cron';
COMMENT ON FUNCTION credit_wallet_with_journal IS 'Enhanced credit_wallet with double-entry journaling and E-Levy';