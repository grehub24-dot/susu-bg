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
