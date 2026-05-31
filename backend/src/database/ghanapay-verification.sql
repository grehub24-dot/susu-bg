-- GhanaPay Verification Table
-- Add to system-upgrade-schema.sql or run separately

CREATE TABLE IF NOT EXISTS ghanapay_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id),
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    customer_phone VARCHAR(15),
    ghanapay_number VARCHAR(15),
    status VARCHAR(20) DEFAULT 'PENDING',
    verified_by UUID REFERENCES tellers(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ghanapay_status ON ghanapay_verifications(status);
CREATE INDEX IF NOT EXISTS idx_ghanapay_wallet ON ghanapay_verifications(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ghanapay_reference ON ghanapay_verifications(reference);

COMMENT ON TABLE ghanapay_verifications IS 'GhanaPay payment verification requests for teller verification';