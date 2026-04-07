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
