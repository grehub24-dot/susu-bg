-- Revenue Sample Data for Testing
-- Run this in Supabase SQL Editor

-- 1. Insert sample revenue entries for TRANSACTION_FEE category
INSERT INTO revenue_ledger (category, source_type, source_id, amount, currency, description, reference, tax_type, posted_date)
VALUES
    ('TRANSACTION_FEE', 'TRANSACTION', gen_random_uuid(), 0.50, 'GHS', 'Deposit transaction fee (1%) - GHS 50 deposit', 'FEE-TXN-001', 'NONE', NOW() - INTERVAL '7 days'),
    ('TRANSACTION_FEE', 'TRANSACTION', gen_random_uuid(), 1.00, 'GHS', 'Withdrawal transaction fee (2%) - GHS 50 withdrawal', 'FEE-TXN-002', 'NONE', NOW() - INTERVAL '6 days'),
    ('TRANSACTION_FEE', 'TRANSACTION', gen_random_uuid(), 2.00, 'GHS', 'Withdrawal transaction fee (2%) - GHS 100 withdrawal', 'FEE-TXN-003', 'NONE', NOW() - INTERVAL '5 days'),
    ('TRANSACTION_FEE', 'TRANSACTION', gen_random_uuid(), 3.00, 'GHS', 'Withdrawal transaction fee (2%) - GHS 150 withdrawal', 'FEE-TXN-004', 'NONE', NOW() - INTERVAL '4 days'),
    ('TRANSACTION_FEE', 'TRANSACTION', gen_random_uuid(), 5.00, 'GHS', 'Deposit transaction fee (1%) - GHS 500 deposit', 'FEE-TXN-005', 'NONE', NOW() - INTERVAL '3 days'),
    ('TRANSACTION_FEE', 'TRANSACTION', gen_random_uuid(), 10.00, 'GHS', 'Withdrawal transaction fee (2%) - GHS 500 withdrawal', 'FEE-TXN-006', 'NONE', NOW() - INTERVAL '2 days'),
    ('TRANSACTION_FEE', 'TRANSACTION', gen_random_uuid(), 1.50, 'GHS', 'Withdrawal transaction fee (2%) - GHS 75 withdrawal', 'FEE-TXN-007', 'NONE', NOW() - INTERVAL '1 day'),
    ('TRANSACTION_FEE', 'TRANSACTION', gen_random_uuid(), 2.50, 'GHS', 'Deposit transaction fee (1%) - GHS 250 deposit', 'FEE-TXN-008', 'NONE', NOW());

-- 2. Insert sample revenue entries for E-Levy category (withdrawals over GHS 100)
INSERT INTO revenue_ledger (category, source_type, source_id, amount, currency, description, reference, tax_type, posted_date)
VALUES
    ('GOV_TAX_ELEVY', 'TRANSACTION', gen_random_uuid(), 0.50, 'GHS', 'E-Levy (0.5%) - GHS 100 withdrawal', 'ELEVY-001', 'ELEVY', NOW() - INTERVAL '7 days'),
    ('GOV_TAX_ELEVY', 'TRANSACTION', gen_random_uuid(), 2.50, 'GHS', 'E-Levy (0.5%) - GHS 500 withdrawal', 'ELEVY-002', 'ELEVY', NOW() - INTERVAL '5 days'),
    ('GOV_TAX_ELEVY', 'TRANSACTION', gen_random_uuid(), 5.00, 'GHS', 'E-Levy (0.5%) - GHS 1000 withdrawal', 'ELEVY-003', 'ELEVY', NOW() - INTERVAL '3 days'),
    ('GOV_TAX_ELEVY', 'TRANSACTION', gen_random_uuid(), 12.50, 'GHS', 'E-Levy (0.5%) - GHS 2500 withdrawal', 'ELEVY-004', 'ELEVY', NOW() - INTERVAL '1 day'),
    ('GOV_TAX_ELEVY', 'TRANSACTION', gen_random_uuid(), 25.00, 'GHS', 'E-Levy (0.5%) - GHS 5000 withdrawal', 'ELEVY-005', 'ELEVY', NOW());

-- 3. Insert sample other revenue categories
INSERT INTO revenue_ledger (category, source_type, source_id, amount, currency, description, reference, tax_type, posted_date)
VALUES
    ('ACCOUNT_FEE', 'SUBSCRIPTION', gen_random_uuid(), 50.00, 'GHS', 'Monthly account maintenance fee', 'ACC-FEE-001', 'NONE', NOW() - INTERVAL '15 days'),
    ('LOAN_INTEREST', 'LOAN', gen_random_uuid(), 150.00, 'GHS', 'Loan interest - Client ABC', 'LOAN-INT-001', 'NONE', NOW() - INTERVAL '10 days'),
    ('LOAN_INTEREST', 'LOAN', gen_random_uuid(), 200.00, 'GHS', 'Loan interest - Client XYZ', 'LOAN-INT-002', 'NONE', NOW() - INTERVAL '5 days'),
    ('LOAN_INTEREST', 'LOAN', gen_random_uuid(), 175.00, 'GHS', 'Loan interest - Client DEF', 'LOAN-INT-003', 'NONE', NOW() - INTERVAL '2 days'),
    ('PENALTY_FEE', 'LOAN', gen_random_uuid(), 25.00, 'GHS', 'Late payment penalty - Client GHI', 'PENALTY-001', 'NONE', NOW() - INTERVAL '8 days'),
    ('REGISTRATION_FEE', 'USER', gen_random_uuid(), 10.00, 'GHS', 'New user registration fee', 'REG-FEE-001', 'NONE', NOW() - INTERVAL '12 days'),
    ('PROCESSING_FEE', 'LOAN', gen_random_uuid(), 50.00, 'GHS', 'Loan processing fee', 'PROC-FEE-001', 'NONE', NOW() - INTERVAL '6 days');

-- 4. Verify the data
SELECT 
    category,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM revenue_ledger 
GROUP BY category
ORDER BY category;

-- 5. Show total revenue
SELECT 
    'Total Revenue' as metric,
    SUM(amount) as value
FROM revenue_ledger;