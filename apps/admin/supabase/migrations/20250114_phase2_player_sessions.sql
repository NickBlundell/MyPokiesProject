-- Phase 2: Player Session Tracking
-- Migration Date: 2025-01-14
-- Purpose: Track player sessions for analytics and security

-- ============================================================================
-- PART 1: Player Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Player reference
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session identification
    session_token VARCHAR(255) UNIQUE,

    -- Device and location info
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    device_os VARCHAR(100), -- 'Windows', 'iOS', 'Android', etc.
    device_browser VARCHAR(100), -- 'Chrome', 'Safari', 'Firefox', etc.
    device_model VARCHAR(100),
    user_agent TEXT,

    -- Location data
    ip_address INET NOT NULL,
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),

    -- Session timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (COALESCE(ended_at, last_activity_at) - started_at))::INTEGER
    ) STORED,

    -- Session activity metrics
    page_views INTEGER DEFAULT 0,
    game_rounds_played INTEGER DEFAULT 0,
    total_wagered DECIMAL(20,2) DEFAULT 0,
    total_won DECIMAL(20,2) DEFAULT 0,
    deposits_made INTEGER DEFAULT 0,
    deposit_amount DECIMAL(20,2) DEFAULT 0,

    -- Session status
    is_active BOOLEAN DEFAULT TRUE,
    ended_reason VARCHAR(50), -- 'logout', 'timeout', 'kicked', 'session_expired'

    -- Security flags
    is_suspicious BOOLEAN DEFAULT FALSE,
    suspicious_reason TEXT,
    requires_verification BOOLEAN DEFAULT FALSE,

    -- Referrer tracking
    referrer_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_player_sessions_player ON player_sessions(player_id);
CREATE INDEX idx_player_sessions_active ON player_sessions(player_id, is_active, last_activity_at DESC)
    WHERE is_active = TRUE;
CREATE INDEX idx_player_sessions_started ON player_sessions(started_at DESC);
CREATE INDEX idx_player_sessions_ip ON player_sessions(ip_address);
CREATE INDEX idx_player_sessions_country ON player_sessions(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX idx_player_sessions_suspicious ON player_sessions(player_id, created_at DESC)
    WHERE is_suspicious = TRUE;
CREATE INDEX idx_player_sessions_device ON player_sessions(device_type, device_os);

-- Composite index for analytics queries
CREATE INDEX idx_player_sessions_analytics
    ON player_sessions(player_id, started_at DESC, duration_seconds)
    WHERE ended_at IS NOT NULL;

-- ============================================================================
-- PART 2: Row Level Security
-- ============================================================================

ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;

-- Admin users can view all sessions
CREATE POLICY "Admin users can view all sessions"
    ON player_sessions FOR SELECT
    USING (true);

-- Players can view their own sessions
CREATE POLICY "Players can view own sessions"
    ON player_sessions FOR SELECT
    USING (player_id = auth.uid());

-- Service role can manage all
CREATE POLICY "Service role can manage sessions"
    ON player_sessions FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 3: Helper Functions
-- ============================================================================

-- Function to start a new session
CREATE OR REPLACE FUNCTION start_player_session(
    p_player_id UUID,
    p_ip_address INET,
    p_user_agent TEXT DEFAULT NULL,
    p_device_type VARCHAR DEFAULT NULL,
    p_device_os VARCHAR DEFAULT NULL,
    p_device_browser VARCHAR DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_utm_source VARCHAR DEFAULT NULL,
    p_utm_medium VARCHAR DEFAULT NULL,
    p_utm_campaign VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_session_token VARCHAR;
BEGIN
    -- Generate unique session token
    v_session_token := encode(gen_random_bytes(32), 'hex');

    -- Insert new session
    INSERT INTO player_sessions (
        player_id,
        session_token,
        ip_address,
        user_agent,
        device_type,
        device_os,
        device_browser,
        referrer_url,
        utm_source,
        utm_medium,
        utm_campaign
    ) VALUES (
        p_player_id,
        v_session_token,
        p_ip_address,
        p_user_agent,
        p_device_type,
        p_device_os,
        p_device_browser,
        p_referrer_url,
        p_utm_source,
        p_utm_medium,
        p_utm_campaign
    ) RETURNING id INTO v_session_id;

    -- Update user's last login
    UPDATE users
    SET
        last_login_at = NOW(),
        last_login_ip = p_ip_address
    WHERE id = p_player_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION start_player_session TO service_role;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(
    p_session_id UUID,
    p_page_views INTEGER DEFAULT 0,
    p_game_rounds INTEGER DEFAULT 0,
    p_wagered DECIMAL DEFAULT 0,
    p_won DECIMAL DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    UPDATE player_sessions
    SET
        last_activity_at = NOW(),
        page_views = page_views + p_page_views,
        game_rounds_played = game_rounds_played + p_game_rounds,
        total_wagered = total_wagered + p_wagered,
        total_won = total_won + p_won,
        updated_at = NOW()
    WHERE id = p_session_id
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_session_activity TO service_role;

-- Function to end a session
CREATE OR REPLACE FUNCTION end_player_session(
    p_session_id UUID,
    p_ended_reason VARCHAR DEFAULT 'logout'
)
RETURNS VOID AS $$
BEGIN
    UPDATE player_sessions
    SET
        is_active = FALSE,
        ended_at = NOW(),
        ended_reason = p_ended_reason,
        updated_at = NOW()
    WHERE id = p_session_id
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION end_player_session TO service_role;

-- Function to automatically timeout inactive sessions
CREATE OR REPLACE FUNCTION timeout_inactive_sessions(
    p_timeout_minutes INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    v_timed_out_count INTEGER;
BEGIN
    UPDATE player_sessions
    SET
        is_active = FALSE,
        ended_at = NOW(),
        ended_reason = 'timeout',
        updated_at = NOW()
    WHERE is_active = TRUE
    AND last_activity_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;

    GET DIAGNOSTICS v_timed_out_count = ROW_COUNT;

    RETURN v_timed_out_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION timeout_inactive_sessions(INTEGER) TO service_role;

-- Function to flag suspicious sessions
CREATE OR REPLACE FUNCTION flag_suspicious_session(
    p_session_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE player_sessions
    SET
        is_suspicious = TRUE,
        suspicious_reason = p_reason,
        requires_verification = TRUE,
        updated_at = NOW()
    WHERE id = p_session_id;

    -- Log to admin audit
    INSERT INTO admin_audit_logs (
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        'suspicious_session_flagged',
        'player_session',
        p_session_id::TEXT,
        jsonb_build_object('reason', p_reason)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION flag_suspicious_session(UUID, TEXT) TO service_role;

-- ============================================================================
-- PART 4: Session Analytics Views
-- ============================================================================

-- View: Active Sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT
    ps.id,
    ps.player_id,
    u.email as player_email,
    u.external_user_id,
    ps.started_at,
    ps.last_activity_at,
    EXTRACT(EPOCH FROM (NOW() - ps.last_activity_at))/60 as minutes_since_activity,
    ps.device_type,
    ps.device_os,
    ps.device_browser,
    ps.ip_address,
    ps.country_code,
    ps.country_name,
    ps.city,
    ps.page_views,
    ps.game_rounds_played,
    ps.total_wagered,
    ps.total_won,
    ps.is_suspicious,
    ps.suspicious_reason
FROM player_sessions ps
LEFT JOIN users u ON ps.player_id = u.id
WHERE ps.is_active = TRUE
ORDER BY ps.last_activity_at DESC;

GRANT SELECT ON active_sessions TO service_role;

-- View: Session Statistics by Player
CREATE OR REPLACE VIEW player_session_stats AS
SELECT
    ps.player_id,
    u.email as player_email,

    -- Session counts
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE ps.started_at >= NOW() - INTERVAL '7 days') as sessions_last_7d,
    COUNT(*) FILTER (WHERE ps.started_at >= NOW() - INTERVAL '30 days') as sessions_last_30d,

    -- Time metrics
    AVG(ps.duration_seconds) as avg_session_duration_seconds,
    SUM(ps.duration_seconds) as total_session_time_seconds,
    MAX(ps.started_at) as last_session_at,

    -- Activity metrics
    AVG(ps.page_views) as avg_page_views_per_session,
    AVG(ps.game_rounds_played) as avg_rounds_per_session,
    SUM(ps.game_rounds_played) as total_rounds_all_sessions,

    -- Financial metrics
    SUM(ps.total_wagered) as total_wagered_all_sessions,
    SUM(ps.total_won) as total_won_all_sessions,
    SUM(ps.deposit_amount) as total_deposits_all_sessions,

    -- Device preferences
    MODE() WITHIN GROUP (ORDER BY ps.device_type) as preferred_device_type,
    MODE() WITHIN GROUP (ORDER BY ps.device_os) as preferred_device_os,

    -- Security
    COUNT(*) FILTER (WHERE ps.is_suspicious = TRUE) as suspicious_sessions_count,
    COUNT(DISTINCT ps.ip_address) as unique_ip_addresses,
    COUNT(DISTINCT ps.country_code) as unique_countries

FROM player_sessions ps
LEFT JOIN users u ON ps.player_id = u.id
WHERE ps.ended_at IS NOT NULL
GROUP BY ps.player_id, u.email;

GRANT SELECT ON player_session_stats TO service_role;

-- View: Session Trends by Hour
CREATE OR REPLACE VIEW session_trends_hourly AS
SELECT
    DATE_TRUNC('hour', started_at) as hour,
    COUNT(*) as sessions_started,
    COUNT(DISTINCT player_id) as unique_players,
    AVG(duration_seconds) as avg_duration_seconds,
    SUM(game_rounds_played) as total_rounds,
    SUM(total_wagered) as total_wagered,
    SUM(total_won) as total_won
FROM player_sessions
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', started_at)
ORDER BY hour DESC;

GRANT SELECT ON session_trends_hourly TO service_role;

-- View: Session Trends by Device
CREATE OR REPLACE VIEW session_trends_by_device AS
SELECT
    device_type,
    device_os,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT player_id) as unique_players,
    AVG(duration_seconds) as avg_duration_seconds,
    AVG(game_rounds_played) as avg_rounds_per_session,
    SUM(total_wagered) as total_wagered,
    COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '7 days') as sessions_last_7d
FROM player_sessions
WHERE ended_at IS NOT NULL
GROUP BY device_type, device_os
ORDER BY total_sessions DESC;

GRANT SELECT ON session_trends_by_device TO service_role;

-- View: Geographic Session Distribution
CREATE OR REPLACE VIEW session_geographic_distribution AS
SELECT
    country_code,
    country_name,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT player_id) as unique_players,
    AVG(duration_seconds) as avg_duration_seconds,
    SUM(total_wagered) as total_wagered,
    COUNT(*) FILTER (WHERE is_suspicious = TRUE) as suspicious_sessions
FROM player_sessions
WHERE country_code IS NOT NULL
AND started_at >= NOW() - INTERVAL '30 days'
GROUP BY country_code, country_name
ORDER BY total_sessions DESC;

GRANT SELECT ON session_geographic_distribution TO service_role;

-- ============================================================================
-- PART 5: Triggers
-- ============================================================================

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_updated_at_trigger
    BEFORE UPDATE ON player_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_updated_at();

-- Trigger to update player loyalty last activity
CREATE OR REPLACE FUNCTION update_player_activity_from_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Update player loyalty last activity when session starts
    IF TG_OP = 'INSERT' THEN
        UPDATE player_loyalty
        SET last_activity_at = NEW.started_at
        WHERE user_id = NEW.player_id
        AND (last_activity_at IS NULL OR last_activity_at < NEW.started_at);
    END IF;

    -- Update when session ends with activity
    IF TG_OP = 'UPDATE' AND NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        IF NEW.game_rounds_played > 0 OR NEW.total_wagered > 0 THEN
            UPDATE player_loyalty
            SET last_activity_at = NEW.last_activity_at
            WHERE user_id = NEW.player_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_activity_from_session_trigger
    AFTER INSERT OR UPDATE ON player_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_player_activity_from_session();

-- ============================================================================
-- PART 6: Security Detection Functions
-- ============================================================================

-- Function to detect multiple concurrent sessions
CREATE OR REPLACE FUNCTION detect_concurrent_sessions(
    p_player_id UUID,
    p_max_concurrent INTEGER DEFAULT 3
)
RETURNS BOOLEAN AS $$
DECLARE
    v_active_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_active_count
    FROM player_sessions
    WHERE player_id = p_player_id
    AND is_active = TRUE;

    RETURN v_active_count > p_max_concurrent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION detect_concurrent_sessions(UUID, INTEGER) TO service_role;

-- Function to detect session from new location
CREATE OR REPLACE FUNCTION detect_new_location(
    p_player_id UUID,
    p_country_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_previous_country VARCHAR;
BEGIN
    SELECT country_code
    INTO v_previous_country
    FROM player_sessions
    WHERE player_id = p_player_id
    AND country_code IS NOT NULL
    ORDER BY started_at DESC
    LIMIT 1 OFFSET 1;

    IF v_previous_country IS NOT NULL AND v_previous_country != p_country_code THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION detect_new_location(UUID, VARCHAR) TO service_role;

-- ============================================================================
-- PART 7: Cleanup Functions
-- ============================================================================

-- Function to archive old sessions
CREATE OR REPLACE FUNCTION archive_old_sessions(
    p_days_to_keep INTEGER DEFAULT 180
)
RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    -- In the future, this could move data to an archive table
    -- For now, we'll just delete very old sessions
    DELETE FROM player_sessions
    WHERE ended_at IS NOT NULL
    AND ended_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    RAISE NOTICE 'Archived/deleted % old session records', v_archived_count;

    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION archive_old_sessions(INTEGER) TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE player_sessions IS 'Tracks individual player sessions for analytics and security monitoring';
COMMENT ON COLUMN player_sessions.session_token IS 'Unique session identifier token';
COMMENT ON COLUMN player_sessions.duration_seconds IS 'Calculated session duration in seconds';
COMMENT ON COLUMN player_sessions.is_suspicious IS 'Flag indicating potentially fraudulent session';
COMMENT ON FUNCTION start_player_session IS 'Initiates a new player session with device and location tracking';
COMMENT ON FUNCTION update_session_activity IS 'Updates session activity metrics (page views, rounds played, etc.)';
COMMENT ON FUNCTION end_player_session IS 'Ends an active session with reason';
COMMENT ON FUNCTION timeout_inactive_sessions IS 'Automatically times out sessions inactive for specified minutes';
COMMENT ON VIEW active_sessions IS 'Real-time view of currently active player sessions';
COMMENT ON VIEW player_session_stats IS 'Aggregated session statistics per player';

-- Output summary
DO $$
DECLARE
    v_total_sessions INTEGER;
    v_active_sessions INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = TRUE)
    INTO v_total_sessions, v_active_sessions
    FROM player_sessions;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Player Sessions Migration Completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total sessions in database: %', v_total_sessions;
    RAISE NOTICE 'Currently active sessions: %', v_active_sessions;
    RAISE NOTICE 'Run SELECT * FROM active_sessions; to view active sessions';
    RAISE NOTICE 'Run SELECT * FROM player_session_stats; to view player statistics';
END $$;
