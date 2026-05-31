-- Enterprise Journal Updates for Atomic Transactions
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to revenue_ledger
ALTER TABLE revenue_ledger ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE revenue_ledger ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE revenue_ledger ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50);

-- 2. Create Atomic Wallet Transaction Function
-- This function handles:
-- - Wallet balance update
-- - Journal entries for double-entry accounting
-- - Revenue posting (transaction fees + E-Levy)
CREATE OR REPLACE FUNCTION atomic_wallet_transaction(
    p_wallet_id UUID,
    p_transaction_id UUID,
    p_amount DECIMAL(15,2),
    p_tx_type VARCHAR(20),
    p_fee DECIMAL(15,2),
    p_elevy DECIMAL(15,2)
)
RETURNS JSONB AS $$
DECLARE
    v_new_balance DECIMAL(15,2);
    v_tx_ref VARCHAR(50);
BEGIN
    -- Generate transaction reference
    v_tx_ref := 'TXN-' || LEFT(p_transaction_id::TEXT, 8);

    -- Update wallet balance
    UPDATE wallets 
    SET balance = CASE 
        WHEN p_tx_type = 'DEPOSIT' THEN balance + p_amount
        WHEN p_tx_type = 'WITHDRAWAL' THEN balance - p_amount
    END,
    updated_at = NOW()
    WHERE id = p_wallet_id
    RETURNING balance INTO v_new_balance;

    -- Create journal entries for DEPOSIT (money coming in)
    IF p_tx_type = 'DEPOSIT' THEN
        -- Credit: Company Bank Account (Asset increases)
        INSERT INTO journal_entries (transaction_id, account_type, account_code, entry_type, amount_cents, currency, description)
        VALUES (p_transaction_id, 'ASSET', 'COMPANY_BANK', 'CREDIT', (p_amount * 100)::BIGINT, 'GHS', 
                'Deposit from customer - ' || v_tx_ref);
        
        -- Debit: User Wallet (Liability increases)
        INSERT INTO journal_entries (transaction_id, account_type, account_code, entry_type, amount_cents, currency, description)
        VALUES (p_transaction_id, 'LIABILITY', 'USER_WALLET', 'DEBIT', (p_amount * 100)::BIGINT, 'GHS',
                'Wallet credit - ' || v_tx_ref);
    ELSE
        -- Create journal entries for WITHDRAWAL (money going out)
        -- Debit: User Wallet (Liability decreases)
        INSERT INTO journal_entries (transaction_id, account_type, account_code, entry_type, amount_cents, currency, description)
        VALUES (p_transaction_id, 'LIABILITY', 'USER_WALLET', 'CREDIT', ((p_amount + p_fee + p_elevy) * 100)::BIGINT, 'GHS',
                'Withdrawal by customer - ' || v_tx_ref);
        
        -- Credit: Company Bank Account (Asset decreases)
        INSERT INTO journal_entries (transaction_id, account_type, account_code, entry_type, amount_cents, currency, description)
        VALUES (p_transaction_id, 'ASSET', 'COMPANY_BANK', 'DEBIT', (p_amount * 100)::BIGINT, 'GHS',
                'Disbursement - ' || v_tx_ref);
    END IF;

    -- Post TRANSACTION_FEE revenue
    IF p_fee > 0 THEN
        INSERT INTO revenue_ledger (category, source_type, source_id, amount, currency, description, reference, tax_type, posted_date)
        VALUES (
            'TRANSACTION_FEE', 
            'TRANSACTION', 
            p_transaction_id, 
            p_fee, 
            'GHS', 
            CASE WHEN p_tx_type = 'DEPOSIT' THEN 'Deposit transaction fee (1%)' ELSE 'Withdrawal transaction fee (2%)' END, 
            'FEE-' || v_tx_ref, 
            'NONE',
            NOW()
        );
    END IF;

    -- Post E-Levy revenue (if applicable)
    IF p_elevy > 0 THEN
        INSERT INTO revenue_ledger (category, source_type, source_id, amount, currency, description, reference, tax_type, posted_date)
        VALUES (
            'GOV_TAX_ELEVY', 
            'TRANSACTION', 
            p_transaction_id, 
            p_elevy, 
            'GHS', 
            'E-Levy (0.5%) on withdrawal over GHS 100', 
            'ELEVY-' || v_tx_ref, 
            'ELEVY',
            NOW()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', v_new_balance,
        'transaction_reference', v_tx_ref
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_transaction ON journal_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_code ON journal_entries(account_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at);

-- 4. Verify setup
SELECT 'atomic_wallet_transaction function created successfully' as status;