-- ==========================================
-- SEED DATA FOR SUSU-BG
-- ==========================================

-- 1. Insert Initial Users
-- PIN for John Doe: 123456
-- PIN for Jane Smith: 654321
INSERT INTO users (id, phone_number, full_name, pin_hash, kyc_status)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '0551234567', 'John Doe', '$2b$12$a2XEF7zHTnqE/x.rA8zGBeUsnwuPcFNXSnJv7f.g28z7vskby62YS', 'APPROVED'),
    ('22222222-2222-2222-2222-222222222222', '0249876543', 'Jane Smith', '$2b$12$SFT7fJSCNpZjSdYlH1pfKuFs.j978RTHhSkCRkqjxjHhRw44Kiy4m', 'APPROVED')
ON CONFLICT (phone_number) DO NOTHING;

-- 2. Insert Wallets for Initial Users
INSERT INTO wallets (user_id, balance, currency)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 1500.00, 'GHS'),
    ('22222222-2222-2222-2222-222222222222', 250.50, 'GHS')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Insert Initial Transactions History
INSERT INTO transactions (wallet_id, reference, amount, type, status)
VALUES
    ((SELECT id FROM wallets WHERE user_id = '11111111-1111-1111-1111-111111111111'), 'TXN-JD-001', 500.00, 'DEPOSIT', 'SUCCESS'),
    ((SELECT id FROM wallets WHERE user_id = '11111111-1111-1111-1111-111111111111'), 'TXN-JD-002', 1000.00, 'DEPOSIT', 'SUCCESS'),
    ((SELECT id FROM wallets WHERE user_id = '22222222-2222-2222-2222-222222222222'), 'TXN-JS-001', 250.50, 'DEPOSIT', 'SUCCESS')
ON CONFLICT (reference) DO NOTHING;

-- 4. Insert Default Admin Users
-- Password: admin123 (bcrypt hash)
INSERT INTO admin_users (admin_code, full_name, email, phone_number, password_hash, status)
VALUES 
    ('ADM-001', 'System Admin', 'admin@susu-bg.com', '+233501234567', '$2b$10$4vKm4wyHScMwTIsBCfW26u49OIcm.5JHlb130ZpLaAag/wc6Th50G', 'ACTIVE')
ON CONFLICT (admin_code) DO NOTHING;

-- 5. Insert Default Branches
INSERT INTO branches (branch_code, name, address, region, phone_number, email, status)
VALUES 
    ('BRN-001', 'Accra Central', 'Accra, Ghana', 'Greater Accra', '+233302000001', 'accra@susu-bg.com', 'ACTIVE'),
    ('BRN-002', 'Kumasi Main', 'Kumasi, Ghana', 'Ashanti', '+233502000002', 'kumasi@susu-bg.com', 'ACTIVE'),
    ('BRN-003', 'Takoradi Branch', 'Takoradi, Ghana', 'Western', '+233503000003', 'takoradi@susu-bg.com', 'ACTIVE')
ON CONFLICT (branch_code) DO NOTHING;

-- 6. Insert Default Tellers
INSERT INTO tellers (teller_code, full_name, email, phone_number, branch_id, status)
SELECT 
    'TLR-001', 'John Teller', 'john.teller@susu-bg.com', '+233501000001', id, 'ACTIVE'
FROM branches WHERE branch_code = 'BRN-001'
ON CONFLICT (teller_code) DO NOTHING;

-- 7. Insert Sample Compliance Flags
INSERT INTO compliance_flags (flag_type, flag_status, description, amount)
VALUES 
    ('AML_ALERT', 'OPEN', 'Large cash deposit detected', 50000.00),
    ('CTR', 'INVESTIGATING', 'Currency transaction report needed', 10000.00),
    ('STR', 'OPEN', 'Suspicious activity pattern', 25000.00)
ON CONFLICT DO NOTHING;

-- 8. Insert Sample Revenue Ledger Entries
INSERT INTO revenue_ledger (source_type, category, amount, reference, note)
VALUES 
    ('TRANSACTION', 'TRANSACTION_FEE', 150.00, 'REV-001', 'Transaction fee revenue'),
    ('LOAN', 'LOAN_INTEREST', 500.00, 'REV-002', 'Loan interest'),
    ('MANUAL', 'MANUALENTRY', 1000.00, 'REV-003', 'Manual deposit')
ON CONFLICT (reference) DO NOTHING;
