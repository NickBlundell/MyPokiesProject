-- Phase 3: Data Archival System
-- Migration Date: 2025-01-14
-- Purpose: Implement data retention and archival strategy for old records

-- ============================================================================
-- PART 1: Archived Transactions Table
-- ============================================================================

-- Archive table for old transactions (keep recent transactions in main table)
CREATE TABLE IF NOT EXISTS archived_transactions (
    -- Same schema as transactions table
    id UUID PRIMARY KEY,
    user_id UUID,
    type VARCHAR(50),
    subtype VARCHAR(50),
    amount DECIMAL(20,2),
    currency VARCHAR(3),
    balance_before DECIMAL(20,2),
    balance_after DECIMAL(20,2),
    status VARCHAR(50),
    description TEXT,
    reference_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,

    -- Archive metadata
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by VARCHAR(50) DEFAULT 'system'
);

-- Indexes for archived transactions
CREATE INDEX idx_archived_transactions_user ON archived_transactions(user_id);
CREATE INDEX idx_archived_transactions_created ON archived_transactions(created_at DESC);
CREATE INDEX idx_archived_transactions_type ON archived_transactions(type, subtype);
CREATE INDEX idx_archived_transactions_archived ON archived_transactions(archived_at DESC);

-- ============================================================================
-- PART 2: Archived Game Rounds Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS archived_game_rounds (
    -- Same schema as game_rounds table
    id UUID PRIMARY KEY,
    user_id UUID,
    game_id VARCHAR(255),
    session_id UUID,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    bet_amount DECIMAL(20,2),
    win_amount DECIMAL(20,2),
    currency VARCHAR(3),
    status VARCHAR(50),
    game_state JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ,

    -- Archive metadata
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by VARCHAR(50) DEFAULT 'system'
);

-- Indexes for archived game rounds
CREATE INDEX idx_archived_game_rounds_user ON archived_game_rounds(user_id);
CREATE INDEX idx_archived_game_rounds_game ON archived_game_rounds(game_id);
CREATE INDEX idx_archived_game_rounds_completed ON archived_game_rounds(completed_at DESC);
CREATE INDEX idx_archived_game_rounds_archived ON archived_game_rounds(archived_at DESC);

-- ============================================================================
-- PART 3: Archived Player Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS archived_player_sessions (
    -- Same schema as player_sessions table
    id UUID PRIMARY KEY,
    player_id UUID,
    session_token VARCHAR(255),
    device_type VARCHAR(50),
    device_os VARCHAR(100),
    device_browser VARCHAR(100),
    device_model VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),
    started_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    page_views INTEGER,
    game_rounds_played INTEGER,
    total_wagered DECIMAL(20,2),
    total_won DECIMAL(20,2),
    deposits_made INTEGER,
    deposit_amount DECIMAL(20,2),
    is_active BOOLEAN,
    ended_reason VARCHAR(50),
    is_suspicious BOOLEAN,
    suspicious_reason TEXT,
    requires_verification BOOLEAN,
    referrer_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,

    -- Archive metadata
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by VARCHAR(50) DEFAULT 'system'
);

-- Indexes for archived sessions
CREATE INDEX idx_archived_sessions_player ON archived_player_sessions(player_id);
CREATE INDEX idx_archived_sessions_started ON archived_player_sessions(started_at DESC);
CREATE INDEX idx_archived_sessions_archived ON archived_player_sessions(archived_at DESC);

-- ============================================================================
-- PART 4: Archived Email Sends Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS archived_email_sends (
    -- Same schema as email_sends table
    id UUID PRIMARY KEY,
    campaign_id UUID,
    player_id UUID,
    recipient_email VARCHAR(255),
    subject_line TEXT,
    personalization_data JSONB,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    bounce_reason TEXT,
    bounce_type VARCHAR(20),
    opened_at TIMESTAMPTZ,
    first_click_at TIMESTAMPTZ,
    click_count INTEGER,
    links_clicked JSONB,
    converted_at TIMESTAMPTZ,
    conversion_type VARCHAR(50),
    conversion_value DECIMAL(20,2),
    unsubscribed_at TIMESTAMPTZ,
    unsubscribe_reason TEXT,
    status VARCHAR(20),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,

    -- Archive metadata
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by VARCHAR(50) DEFAULT 'system'
);

-- Indexes for archived email sends
CREATE INDEX idx_archived_email_sends_campaign ON archived_email_sends(campaign_id);
CREATE INDEX idx_archived_email_sends_player ON archived_email_sends(player_id);
CREATE INDEX idx_archived_email_sends_sent ON archived_email_sends(sent_at DESC);
CREATE INDEX idx_archived_email_sends_archived ON archived_email_sends(archived_at DESC);

-- ============================================================================
-- PART 5: Data Retention Policy Table
-- ============================================================================

-- Table to define retention policies for different data types
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Policy details
    table_name VARCHAR(100) UNIQUE NOT NULL,
    retention_days INTEGER NOT NULL CHECK (retention_days > 0),
    archive_enabled BOOLEAN DEFAULT TRUE,
    delete_after_archive BOOLEAN DEFAULT TRUE,

    -- Archival frequency
    archival_frequency VARCHAR(20) DEFAULT 'daily' CHECK (
        archival_frequency IN ('hourly', 'daily', 'weekly', 'monthly')
    ),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_archived_at TIMESTAMPTZ,
    last_archived_count INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (table_name, retention_days, archive_enabled, delete_after_archive, archival_frequency, notes)
VALUES
    ('transactions', 730, TRUE, TRUE, 'monthly', 'Keep 2 years of transaction history in main table'),
    ('game_rounds', 365, TRUE, TRUE, 'monthly', 'Keep 1 year of game rounds in main table'),
    ('player_sessions', 180, TRUE, TRUE, 'monthly', 'Keep 6 months of session data in main table'),
    ('email_sends', 365, TRUE, TRUE, 'monthly', 'Keep 1 year of email tracking data'),
    ('admin_audit_logs', 1095, FALSE, FALSE, 'monthly', 'Keep 3 years of audit logs (no archival)'),
    ('support_tickets', 1825, FALSE, FALSE, 'monthly', 'Keep 5 years of support tickets (no archival)'),
    ('compliance_checks', 2555, FALSE, FALSE, 'monthly', 'Keep 7 years of compliance records (legal requirement)')
ON CONFLICT (table_name) DO NOTHING;

GRANT SELECT ON data_retention_policies TO service_role;

-- ============================================================================
-- PART 6: Archival Functions
-- ============================================================================

-- Function to archive old transactions
CREATE OR REPLACE FUNCTION archive_old_transactions(
    p_retention_days INTEGER DEFAULT 730,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(
    archived_count INTEGER,
    deleted_count INTEGER
) AS $$
DECLARE
    v_archived_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

    -- Insert into archive table
    INSERT INTO archived_transactions
    SELECT
        t.*,
        NOW() as archived_at,
        'system' as archived_by
    FROM transactions t
    WHERE t.created_at < v_cutoff_date
    LIMIT p_batch_size;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- Delete from main table if successfully archived
    IF v_archived_count > 0 THEN
        DELETE FROM transactions
        WHERE id IN (
            SELECT id FROM archived_transactions
            WHERE archived_at >= NOW() - INTERVAL '1 minute'
            LIMIT p_batch_size
        );

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;

    RETURN QUERY SELECT v_archived_count, v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION archive_old_transactions(INTEGER, INTEGER) TO service_role;

-- Function to archive old game rounds
CREATE OR REPLACE FUNCTION archive_old_game_rounds(
    p_retention_days INTEGER DEFAULT 365,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(
    archived_count INTEGER,
    deleted_count INTEGER
) AS $$
DECLARE
    v_archived_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

    -- Insert into archive table
    INSERT INTO archived_game_rounds
    SELECT
        gr.*,
        NOW() as archived_at,
        'system' as archived_by
    FROM game_rounds gr
    WHERE gr.completed_at < v_cutoff_date
    AND gr.status = 'completed'
    LIMIT p_batch_size;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- Delete from main table
    IF v_archived_count > 0 THEN
        DELETE FROM game_rounds
        WHERE id IN (
            SELECT id FROM archived_game_rounds
            WHERE archived_at >= NOW() - INTERVAL '1 minute'
            LIMIT p_batch_size
        );

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;

    RETURN QUERY SELECT v_archived_count, v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION archive_old_game_rounds(INTEGER, INTEGER) TO service_role;

-- Function to archive old player sessions
CREATE OR REPLACE FUNCTION archive_old_player_sessions(
    p_retention_days INTEGER DEFAULT 180,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(
    archived_count INTEGER,
    deleted_count INTEGER
) AS $$
DECLARE
    v_archived_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

    -- Insert into archive table
    INSERT INTO archived_player_sessions
    SELECT
        ps.*,
        NOW() as archived_at,
        'system' as archived_by
    FROM player_sessions ps
    WHERE ps.ended_at < v_cutoff_date
    AND ps.is_active = FALSE
    LIMIT p_batch_size;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- Delete from main table
    IF v_archived_count > 0 THEN
        DELETE FROM player_sessions
        WHERE id IN (
            SELECT id FROM archived_player_sessions
            WHERE archived_at >= NOW() - INTERVAL '1 minute'
            LIMIT p_batch_size
        );

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;

    RETURN QUERY SELECT v_archived_count, v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION archive_old_player_sessions(INTEGER, INTEGER) TO service_role;

-- Function to archive old email sends
CREATE OR REPLACE FUNCTION archive_old_email_sends(
    p_retention_days INTEGER DEFAULT 365,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(
    archived_count INTEGER,
    deleted_count INTEGER
) AS $$
DECLARE
    v_archived_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

    -- Insert into archive table
    INSERT INTO archived_email_sends
    SELECT
        es.*,
        NOW() as archived_at,
        'system' as archived_by
    FROM email_sends es
    WHERE es.sent_at < v_cutoff_date
    LIMIT p_batch_size;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- Delete from main table
    IF v_archived_count > 0 THEN
        DELETE FROM email_sends
        WHERE id IN (
            SELECT id FROM archived_email_sends
            WHERE archived_at >= NOW() - INTERVAL '1 minute'
            LIMIT p_batch_size
        );

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;

    RETURN QUERY SELECT v_archived_count, v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION archive_old_email_sends(INTEGER, INTEGER) TO service_role;

-- ============================================================================
-- PART 7: Master Archival Function
-- ============================================================================

-- Master function to run all archival processes based on retention policies
CREATE OR REPLACE FUNCTION run_data_archival()
RETURNS TABLE(
    table_name VARCHAR,
    archived_count INTEGER,
    deleted_count INTEGER,
    status VARCHAR
) AS $$
DECLARE
    v_policy RECORD;
    v_result RECORD;
BEGIN
    FOR v_policy IN
        SELECT * FROM data_retention_policies
        WHERE is_active = TRUE AND archive_enabled = TRUE
    LOOP
        BEGIN
            CASE v_policy.table_name
                WHEN 'transactions' THEN
                    SELECT * INTO v_result FROM archive_old_transactions(v_policy.retention_days, 10000);

                WHEN 'game_rounds' THEN
                    SELECT * INTO v_result FROM archive_old_game_rounds(v_policy.retention_days, 10000);

                WHEN 'player_sessions' THEN
                    SELECT * INTO v_result FROM archive_old_player_sessions(v_policy.retention_days, 10000);

                WHEN 'email_sends' THEN
                    SELECT * INTO v_result FROM archive_old_email_sends(v_policy.retention_days, 10000);

                ELSE
                    v_result.archived_count := 0;
                    v_result.deleted_count := 0;
            END CASE;

            -- Update policy last_archived info
            UPDATE data_retention_policies
            SET
                last_archived_at = NOW(),
                last_archived_count = v_result.archived_count
            WHERE id = v_policy.id;

            RETURN QUERY SELECT
                v_policy.table_name,
                v_result.archived_count,
                v_result.deleted_count,
                'success'::VARCHAR;

        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT
                v_policy.table_name,
                0,
                0,
                ('error: ' || SQLERRM)::VARCHAR;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION run_data_archival() TO service_role;

-- ============================================================================
-- PART 8: Archive Statistics View
-- ============================================================================

CREATE OR REPLACE VIEW archive_statistics AS
SELECT
    'transactions' as table_name,
    (SELECT COUNT(*) FROM transactions) as active_records,
    (SELECT COUNT(*) FROM archived_transactions) as archived_records,
    (SELECT pg_size_pretty(pg_total_relation_size('transactions'))) as active_size,
    (SELECT pg_size_pretty(pg_total_relation_size('archived_transactions'))) as archived_size
UNION ALL
SELECT
    'game_rounds',
    (SELECT COUNT(*) FROM game_rounds),
    (SELECT COUNT(*) FROM archived_game_rounds),
    (SELECT pg_size_pretty(pg_total_relation_size('game_rounds'))),
    (SELECT pg_size_pretty(pg_total_relation_size('archived_game_rounds')))
UNION ALL
SELECT
    'player_sessions',
    (SELECT COUNT(*) FROM player_sessions),
    (SELECT COUNT(*) FROM archived_player_sessions),
    (SELECT pg_size_pretty(pg_total_relation_size('player_sessions'))),
    (SELECT pg_size_pretty(pg_total_relation_size('archived_player_sessions')))
UNION ALL
SELECT
    'email_sends',
    (SELECT COUNT(*) FROM email_sends),
    (SELECT COUNT(*) FROM archived_email_sends),
    (SELECT pg_size_pretty(pg_total_relation_size('email_sends'))),
    (SELECT pg_size_pretty(pg_total_relation_size('archived_email_sends')));

GRANT SELECT ON archive_statistics TO service_role;

-- ============================================================================
-- PART 9: Archive Query Helper Functions
-- ============================================================================

-- Function to query transactions across both active and archived tables
CREATE OR REPLACE FUNCTION get_all_transactions(
    p_user_id UUID,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date TIMESTAMPTZ DEFAULT NOW(),
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    type VARCHAR,
    subtype VARCHAR,
    amount DECIMAL,
    created_at TIMESTAMPTZ,
    is_archived BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    (
        SELECT t.id, t.user_id, t.type, t.subtype, t.amount, t.created_at, FALSE as is_archived
        FROM transactions t
        WHERE t.user_id = p_user_id
        AND (p_from_date IS NULL OR t.created_at >= p_from_date)
        AND t.created_at <= p_to_date

        UNION ALL

        SELECT at.id, at.user_id, at.type, at.subtype, at.amount, at.created_at, TRUE as is_archived
        FROM archived_transactions at
        WHERE at.user_id = p_user_id
        AND (p_from_date IS NULL OR at.created_at >= p_from_date)
        AND at.created_at <= p_to_date
    )
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_transactions(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO service_role;

-- ============================================================================
-- PART 10: Scheduled Job Setup (pg_cron)
-- ============================================================================

-- Note: Uncomment if pg_cron extension is available

/*
-- Run archival process monthly on the 1st day at 2 AM
SELECT cron.schedule(
    'monthly_data_archival',
    '0 2 1 * *',
    $$SELECT run_data_archival()$$
);
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE archived_transactions IS 'Archive storage for old transaction records';
COMMENT ON TABLE archived_game_rounds IS 'Archive storage for old game round records';
COMMENT ON TABLE archived_player_sessions IS 'Archive storage for old player session records';
COMMENT ON TABLE archived_email_sends IS 'Archive storage for old email send records';
COMMENT ON TABLE data_retention_policies IS 'Defines retention policies for different data types';
COMMENT ON FUNCTION run_data_archival() IS 'Master function to run all archival processes based on retention policies';
COMMENT ON FUNCTION get_all_transactions IS 'Query transactions across both active and archived tables';
COMMENT ON VIEW archive_statistics IS 'Statistics showing active vs archived record counts and sizes';

-- Output summary
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Data Archival System Migration Completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Archive tables created:';
    RAISE NOTICE '  - archived_transactions';
    RAISE NOTICE '  - archived_game_rounds';
    RAISE NOTICE '  - archived_player_sessions';
    RAISE NOTICE '  - archived_email_sends';
    RAISE NOTICE '';
    RAISE NOTICE 'Retention policies configured for:';
    RAISE NOTICE '  - Transactions: 2 years';
    RAISE NOTICE '  - Game rounds: 1 year';
    RAISE NOTICE '  - Player sessions: 6 months';
    RAISE NOTICE '  - Email sends: 1 year';
    RAISE NOTICE '';
    RAISE NOTICE 'To run archival manually: SELECT * FROM run_data_archival();';
    RAISE NOTICE 'To view statistics: SELECT * FROM archive_statistics;';
END $$;
