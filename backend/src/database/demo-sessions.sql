-- Demo Sessions Table
-- Stores demo transaction sessions in database instead of memory

CREATE TABLE IF NOT EXISTS demo_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
    payment_method VARCHAR(50),
    reference VARCHAR(50) UNIQUE NOT NULL,
    ready_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_demo_sessions_user_id ON demo_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_reference ON demo_sessions(reference);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_status ON demo_sessions(status);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_ready_at ON demo_sessions(ready_at);

-- Function to clean expired sessions (call via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_demo_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM demo_sessions 
    WHERE ready_at < NOW() - INTERVAL '1 hour' 
    OR status = 'EXPIRED';
END;
$$ LANGUAGE plpgsql;

-- Insert demo session function
CREATE OR REPLACE FUNCTION create_demo_session(
    p_user_id UUID,
    p_amount DECIMAL(15,2),
    p_type VARCHAR(20),
    p_payment_method VARCHAR(50),
    p_reference VARCHAR(50),
    p_ready_at TIMESTAMP WITH TIME ZONE
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO demo_sessions (
        user_id, 
        amount, 
        type, 
        payment_method, 
        reference, 
        ready_at
    ) VALUES (
        p_user_id, 
        p_amount, 
        p_type, 
        p_payment_method, 
        p_reference, 
        p_ready_at
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Get demo session function
CREATE OR REPLACE FUNCTION get_demo_session(p_reference VARCHAR(50))
RETURNS TABLE (
    id UUID,
    user_id UUID,
    amount DECIMAL(15,2),
    type VARCHAR(20),
    payment_method VARCHAR(50),
    reference VARCHAR(50),
    ready_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.user_id,
        ds.amount,
        ds.type,
        ds.payment_method,
        ds.reference,
        ds.ready_at,
        ds.status
    FROM demo_sessions ds
    WHERE ds.reference = p_reference;
END;
$$ LANGUAGE plpgsql;

-- Update demo session status function
CREATE OR REPLACE FUNCTION update_demo_session_status(
    p_reference VARCHAR(50),
    p_status VARCHAR(20)
)
RETURNS void AS $$
BEGIN
    UPDATE demo_sessions
    SET status = p_status, updated_at = NOW()
    WHERE reference = p_reference;
END;
$$ LANGUAGE plpgsql;