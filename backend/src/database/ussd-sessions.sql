-- USSD Sessions Table
-- Stores USSD session data in database instead of in-memory Map

CREATE TABLE IF NOT EXISTS ussd_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    menu_level VARCHAR(50) DEFAULT 'MAIN',
    menu_path TEXT[] DEFAULT ARRAY['MAIN'],
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    input_data JSONB DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_phone ON ussd_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_session_id ON ussd_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_expires ON ussd_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_user ON ussd_sessions(user_id);

-- Function to create/update USSD session
CREATE OR REPLACE FUNCTION upsert_ussd_session(
    p_phone VARCHAR(20),
    p_session VARCHAR(100),
    p_menu_level VARCHAR(50),
    p_menu_path TEXT[],
    p_user_id UUID DEFAULT NULL,
    p_input_data JSONB DEFAULT '{}',
    p_language VARCHAR(10) DEFAULT 'en',
    p_ttl_minutes INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_expires TIMESTAMP := NOW() + (p_ttl_minutes || ' minutes')::INTERVAL;
BEGIN
    INSERT INTO ussd_sessions (
        phone_number,
        session_id,
        menu_level,
        menu_path,
        user_id,
        input_data,
        language,
        expires_at
    ) VALUES (
        p_phone,
        p_session,
        p_menu_level,
        p_menu_path,
        p_user_id,
        p_input_data,
        p_language,
        v_expires
    )
    ON CONFLICT (session_id) DO UPDATE
    SET menu_level = p_menu_level,
        menu_path = p_menu_path,
        user_id = COALESCE(p_user_id, ussd_sessions.user_id),
        input_data = p_input_data,
        last_activity_at = NOW(),
        expires_at = v_expires
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get USSD session
CREATE OR REPLACE FUNCTION get_ussd_session(p_session VARCHAR(100))
RETURNS TABLE (
    id UUID,
    phone_number VARCHAR(20),
    session_id VARCHAR(100),
    menu_level VARCHAR(50),
    menu_path TEXT[],
    user_id UUID,
    input_data JSONB,
    language VARCHAR(10),
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        us.phone_number,
        us.session_id,
        us.menu_level,
        us.menu_path,
        us.user_id,
        us.input_data,
        us.language,
        us.expires_at
    FROM ussd_sessions us
    WHERE us.session_id = p_session
    AND us.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update session menu
CREATE OR REPLACE FUNCTION update_ussd_menu(
    p_session VARCHAR(100),
    p_menu_level VARCHAR(50),
    p_menu_path TEXT[],
    p_input_data JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE ussd_sessions
    SET menu_level = p_menu_level,
        menu_path = p_menu_path,
        input_data = COALESCE(p_input_data, input_data),
        last_activity_at = NOW()
    WHERE session_id = p_session
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_ussd_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM ussd_sessions 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clear session
CREATE OR REPLACE FUNCTION clear_ussd_session(p_session VARCHAR(100))
RETURNS void AS $$
BEGIN
    DELETE FROM ussd_sessions WHERE session_id = p_session;
END;
$$ LANGUAGE plpgsql;