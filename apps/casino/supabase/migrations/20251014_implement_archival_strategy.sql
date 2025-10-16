-- ============================================================================
-- ARCHIVAL STRATEGY FOR UNBOUNDED TABLES
-- ============================================================================
-- Purpose: Prevent database size explosion by archiving old data
-- Target tables: callback_logs, transactions, sms_messages, game_rounds
-- Strategy: Move data older than 90 days to archive tables
-- Expected savings: ~70-80% reduction in primary table sizes
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- STEP 1: CREATE ARCHIVE SCHEMA
-- ============================================================================

-- Create separate schema for archived data
CREATE SCHEMA IF NOT EXISTS archive;

-- Grant permissions
GRANT USAGE ON SCHEMA archive TO postgres;
GRANT CREATE ON SCHEMA archive TO postgres;

-- ============================================================================
-- STEP 2: CREATE ARCHIVE TABLES
-- ============================================================================

-- Archive table for callback_logs
CREATE TABLE IF NOT EXISTS archive.callback_logs (
    LIKE public.callback_logs INCLUDING ALL
);

-- Add archive metadata
ALTER TABLE archive.callback_logs
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS archive_batch_id UUID;

-- Archive table for transactions
CREATE TABLE IF NOT EXISTS archive.transactions (
    LIKE public.transactions INCLUDING ALL
);

ALTER TABLE archive.transactions
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS archive_batch_id UUID;

-- Archive table for game_rounds
CREATE TABLE IF NOT EXISTS archive.game_rounds (
    LIKE public.game_rounds INCLUDING ALL
);

ALTER TABLE archive.game_rounds
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS archive_batch_id UUID;

-- Archive table for round_actions (related to game_rounds)
CREATE TABLE IF NOT EXISTS archive.round_actions (
    LIKE public.round_actions INCLUDING ALL
);

ALTER TABLE archive.round_actions
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS archive_batch_id UUID;

-- Archive table for sms_messages (from admin schema)
CREATE TABLE IF NOT EXISTS archive.sms_messages (
    LIKE public.sms_messages INCLUDING ALL
);

ALTER TABLE archive.sms_messages
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS archive_batch_id UUID;

-- ============================================================================
-- STEP 3: CREATE ARCHIVAL METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS archive.archive_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    records_archived INTEGER NOT NULL,
    date_range_start TIMESTAMPTZ,
    date_range_end TIMESTAMPTZ,
    archive_reason TEXT DEFAULT 'Scheduled archival (>90 days old)',
    archived_by TEXT DEFAULT 'system',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT
);

CREATE INDEX idx_archive_batches_table ON archive.archive_batches(table_name, completed_at DESC);
CREATE INDEX idx_archive_batches_status ON archive.archive_batches(status);

-- ============================================================================
-- STEP 4: CREATE PARTITIONED ARCHIVE TABLES FOR HIGH-VOLUME DATA
-- ============================================================================

-- Create partitioned archive for transactions (monthly partitions)
CREATE TABLE IF NOT EXISTS archive.transactions_partitioned (
    LIKE archive.transactions INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create initial partitions for past months
CREATE TABLE IF NOT EXISTS archive.transactions_2024_10
    PARTITION OF archive.transactions_partitioned
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');

CREATE TABLE IF NOT EXISTS archive.transactions_2024_11
    PARTITION OF archive.transactions_partitioned
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE IF NOT EXISTS archive.transactions_2024_12
    PARTITION OF archive.transactions_partitioned
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS archive.transactions_2025_01
    PARTITION OF archive.transactions_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================================================
-- STEP 5: CREATE ARCHIVAL FUNCTIONS
-- ============================================================================

-- Function to archive callback_logs
CREATE OR REPLACE FUNCTION archive.archive_callback_logs(
    p_days_to_keep INTEGER DEFAULT 90,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(archived_count INTEGER, batch_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
    v_archived_count INTEGER;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    -- Calculate cutoff date
    v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_to_keep;
    v_batch_id := gen_random_uuid();

    -- Start batch record
    INSERT INTO archive.archive_batches (id, table_name, records_archived, date_range_end)
    VALUES (v_batch_id, 'callback_logs', 0, v_cutoff_date);

    -- Archive records in batches to avoid long locks
    WITH archived AS (
        DELETE FROM public.callback_logs
        WHERE created_at < v_cutoff_date
        AND id IN (
            SELECT id FROM public.callback_logs
            WHERE created_at < v_cutoff_date
            LIMIT p_batch_size
        )
        RETURNING *
    )
    INSERT INTO archive.callback_logs
    SELECT *, NOW(), v_batch_id FROM archived;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- Update batch record
    UPDATE archive.archive_batches
    SET records_archived = v_archived_count,
        completed_at = NOW(),
        status = 'completed'
    WHERE id = v_batch_id;

    RETURN QUERY SELECT v_archived_count, v_batch_id;
END;
$$;

-- Function to archive transactions
CREATE OR REPLACE FUNCTION archive.archive_transactions(
    p_days_to_keep INTEGER DEFAULT 90,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(archived_count INTEGER, batch_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
    v_archived_count INTEGER;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_to_keep;
    v_batch_id := gen_random_uuid();

    INSERT INTO archive.archive_batches (id, table_name, records_archived, date_range_end)
    VALUES (v_batch_id, 'transactions', 0, v_cutoff_date);

    -- Archive completed transactions only (keep active game rounds)
    WITH archived AS (
        DELETE FROM public.transactions t
        WHERE t.created_at < v_cutoff_date
        AND NOT EXISTS (
            SELECT 1 FROM public.game_rounds gr
            WHERE gr.id = t.game_round_id
            AND gr.status = 'active'
        )
        AND t.id IN (
            SELECT t2.id FROM public.transactions t2
            WHERE t2.created_at < v_cutoff_date
            AND NOT EXISTS (
                SELECT 1 FROM public.game_rounds gr2
                WHERE gr2.id = t2.game_round_id
                AND gr2.status = 'active'
            )
            LIMIT p_batch_size
        )
        RETURNING *
    )
    INSERT INTO archive.transactions_partitioned
    SELECT *, NOW(), v_batch_id FROM archived;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    UPDATE archive.archive_batches
    SET records_archived = v_archived_count,
        completed_at = NOW(),
        status = 'completed'
    WHERE id = v_batch_id;

    RETURN QUERY SELECT v_archived_count, v_batch_id;
END;
$$;

-- Function to archive game_rounds and related round_actions
CREATE OR REPLACE FUNCTION archive.archive_game_rounds(
    p_days_to_keep INTEGER DEFAULT 90,
    p_batch_size INTEGER DEFAULT 5000
)
RETURNS TABLE(archived_rounds INTEGER, archived_actions INTEGER, batch_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
    v_archived_rounds INTEGER;
    v_archived_actions INTEGER;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_to_keep;
    v_batch_id := gen_random_uuid();

    INSERT INTO archive.archive_batches (id, table_name, records_archived, date_range_end)
    VALUES (v_batch_id, 'game_rounds', 0, v_cutoff_date);

    -- Create temp table for rounds to archive
    CREATE TEMP TABLE temp_rounds_to_archive AS
    SELECT id FROM public.game_rounds
    WHERE (completed_at < v_cutoff_date OR (status = 'completed' AND started_at < v_cutoff_date))
    AND status != 'active'
    LIMIT p_batch_size;

    -- Archive round_actions first (child records)
    WITH archived_actions AS (
        DELETE FROM public.round_actions
        WHERE round_id IN (SELECT id FROM temp_rounds_to_archive)
        RETURNING *
    )
    INSERT INTO archive.round_actions
    SELECT *, NOW(), v_batch_id FROM archived_actions;

    GET DIAGNOSTICS v_archived_actions = ROW_COUNT;

    -- Archive game_rounds (parent records)
    WITH archived_rounds AS (
        DELETE FROM public.game_rounds
        WHERE id IN (SELECT id FROM temp_rounds_to_archive)
        RETURNING *
    )
    INSERT INTO archive.game_rounds
    SELECT *, NOW(), v_batch_id FROM archived_rounds;

    GET DIAGNOSTICS v_archived_rounds = ROW_COUNT;

    DROP TABLE temp_rounds_to_archive;

    UPDATE archive.archive_batches
    SET records_archived = v_archived_rounds,
        completed_at = NOW(),
        status = 'completed'
    WHERE id = v_batch_id;

    RETURN QUERY SELECT v_archived_rounds, v_archived_actions, v_batch_id;
END;
$$;

-- Function to archive sms_messages
CREATE OR REPLACE FUNCTION archive.archive_sms_messages(
    p_days_to_keep INTEGER DEFAULT 90,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(archived_count INTEGER, batch_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
    v_archived_count INTEGER;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_to_keep;
    v_batch_id := gen_random_uuid();

    -- Check if table exists (might be in admin schema)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sms_messages'
    ) THEN
        RETURN QUERY SELECT 0, v_batch_id;
    END IF;

    INSERT INTO archive.archive_batches (id, table_name, records_archived, date_range_end)
    VALUES (v_batch_id, 'sms_messages', 0, v_cutoff_date);

    WITH archived AS (
        DELETE FROM public.sms_messages
        WHERE created_at < v_cutoff_date
        AND id IN (
            SELECT id FROM public.sms_messages
            WHERE created_at < v_cutoff_date
            LIMIT p_batch_size
        )
        RETURNING *
    )
    INSERT INTO archive.sms_messages
    SELECT *, NOW(), v_batch_id FROM archived;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    UPDATE archive.archive_batches
    SET records_archived = v_archived_count,
        completed_at = NOW(),
        status = 'completed'
    WHERE id = v_batch_id;

    RETURN QUERY SELECT v_archived_count, v_batch_id;
END;
$$;

-- ============================================================================
-- STEP 6: MASTER ARCHIVAL FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION archive.run_full_archival(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE(
    table_name TEXT,
    archived_count INTEGER,
    batch_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Archive each table and collect results
    RETURN QUERY
    SELECT 'callback_logs'::TEXT, ac.archived_count, ac.batch_id
    FROM archive.archive_callback_logs(p_days_to_keep) ac

    UNION ALL

    SELECT 'transactions'::TEXT, at.archived_count, at.batch_id
    FROM archive.archive_transactions(p_days_to_keep) at

    UNION ALL

    SELECT 'game_rounds'::TEXT, agr.archived_rounds, agr.batch_id
    FROM archive.archive_game_rounds(p_days_to_keep) agr

    UNION ALL

    SELECT 'sms_messages'::TEXT, asm.archived_count, asm.batch_id
    FROM archive.archive_sms_messages(p_days_to_keep) asm;

    -- Analyze tables after archival for query optimizer
    ANALYZE public.callback_logs;
    ANALYZE public.transactions;
    ANALYZE public.game_rounds;
    ANALYZE public.round_actions;
END;
$$;

-- ============================================================================
-- STEP 7: CREATE VIEWS FOR UNIFIED DATA ACCESS
-- ============================================================================

-- Create view that unions current and archived data for reporting
CREATE OR REPLACE VIEW public.transactions_all AS
SELECT *, 'current'::TEXT as data_location FROM public.transactions
UNION ALL
SELECT
    id, tid, user_id, currency, type, subtype, amount,
    balance_before, balance_after, game_round_id, action_id,
    game_id, rollback_tid, promotion_id, created_at, processed_at,
    'archived'::TEXT as data_location
FROM archive.transactions_partitioned;

-- View for callback logs (last 180 days only for performance)
CREATE OR REPLACE VIEW public.callback_logs_recent AS
SELECT *, 'current'::TEXT as data_location FROM public.callback_logs
UNION ALL
SELECT
    id, request_type, user_id, tid, request_body, response_body,
    response_code, hmac_valid, ip_address, processing_time_ms,
    error_message, created_at,
    'archived'::TEXT as data_location
FROM archive.callback_logs
WHERE created_at > NOW() - INTERVAL '180 days';

-- ============================================================================
-- STEP 8: CREATE SCHEDULED JOBS (using pg_cron)
-- ============================================================================

-- Schedule daily archival at 3 AM UTC
SELECT cron.schedule(
    'archive-old-data-daily',
    '0 3 * * *',
    $$SELECT * FROM archive.run_full_archival(90);$$
);

-- Schedule weekly vacuum of archive tables (Sunday 4 AM UTC)
SELECT cron.schedule(
    'vacuum-archive-tables-weekly',
    '0 4 * * 0',
    $$
    VACUUM ANALYZE archive.callback_logs;
    VACUUM ANALYZE archive.transactions_partitioned;
    VACUUM ANALYZE archive.game_rounds;
    VACUUM ANALYZE archive.round_actions;
    VACUUM ANALYZE archive.sms_messages;
    $$
);

-- ============================================================================
-- STEP 9: CREATE MONITORING FUNCTIONS
-- ============================================================================

-- Function to check archive status and table sizes
CREATE OR REPLACE FUNCTION archive.get_archival_stats()
RETURNS TABLE(
    table_name TEXT,
    current_table_size TEXT,
    archive_table_size TEXT,
    current_row_count BIGINT,
    archive_row_count BIGINT,
    oldest_record_date TIMESTAMPTZ,
    last_archive_date TIMESTAMPTZ,
    last_archive_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH table_stats AS (
        SELECT
            'callback_logs' as tname,
            pg_size_pretty(pg_relation_size('public.callback_logs')) as current_size,
            pg_size_pretty(pg_relation_size('archive.callback_logs')) as archive_size,
            (SELECT COUNT(*) FROM public.callback_logs) as current_count,
            (SELECT COUNT(*) FROM archive.callback_logs) as archive_count,
            (SELECT MIN(created_at) FROM public.callback_logs) as oldest,
            (SELECT MAX(completed_at) FROM archive.archive_batches WHERE table_name = 'callback_logs') as last_archive,
            (SELECT records_archived FROM archive.archive_batches WHERE table_name = 'callback_logs' ORDER BY completed_at DESC LIMIT 1) as last_count

        UNION ALL

        SELECT
            'transactions',
            pg_size_pretty(pg_relation_size('public.transactions')),
            pg_size_pretty(pg_relation_size('archive.transactions_partitioned')),
            (SELECT COUNT(*) FROM public.transactions),
            (SELECT COUNT(*) FROM archive.transactions_partitioned),
            (SELECT MIN(created_at) FROM public.transactions),
            (SELECT MAX(completed_at) FROM archive.archive_batches WHERE table_name = 'transactions'),
            (SELECT records_archived FROM archive.archive_batches WHERE table_name = 'transactions' ORDER BY completed_at DESC LIMIT 1)

        UNION ALL

        SELECT
            'game_rounds',
            pg_size_pretty(pg_relation_size('public.game_rounds')),
            pg_size_pretty(pg_relation_size('archive.game_rounds')),
            (SELECT COUNT(*) FROM public.game_rounds),
            (SELECT COUNT(*) FROM archive.game_rounds),
            (SELECT MIN(started_at) FROM public.game_rounds),
            (SELECT MAX(completed_at) FROM archive.archive_batches WHERE table_name = 'game_rounds'),
            (SELECT records_archived FROM archive.archive_batches WHERE table_name = 'game_rounds' ORDER BY completed_at DESC LIMIT 1)
    )
    SELECT
        tname::TEXT,
        current_size::TEXT,
        archive_size::TEXT,
        current_count::BIGINT,
        archive_count::BIGINT,
        oldest::TIMESTAMPTZ,
        last_archive::TIMESTAMPTZ,
        last_count::INTEGER
    FROM table_stats;
END;
$$;

-- ============================================================================
-- STEP 10: CREATE RESTORE FUNCTION (for emergency data recovery)
-- ============================================================================

CREATE OR REPLACE FUNCTION archive.restore_archived_data(
    p_table_name TEXT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_batch_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_restored_count INTEGER;
BEGIN
    CASE p_table_name
        WHEN 'transactions' THEN
            WITH restored AS (
                DELETE FROM archive.transactions_partitioned
                WHERE created_at BETWEEN p_start_date AND p_end_date
                AND (p_batch_id IS NULL OR archive_batch_id = p_batch_id)
                RETURNING id, tid, user_id, currency, type, subtype, amount,
                    balance_before, balance_after, game_round_id, action_id,
                    game_id, rollback_tid, promotion_id, created_at, processed_at
            )
            INSERT INTO public.transactions
            SELECT id, tid, user_id, currency, type, subtype, amount,
                   balance_before, balance_after, game_round_id, action_id,
                   game_id, rollback_tid, promotion_id, created_at, processed_at
            FROM restored
            ON CONFLICT (tid) DO NOTHING;

        WHEN 'callback_logs' THEN
            WITH restored AS (
                DELETE FROM archive.callback_logs
                WHERE created_at BETWEEN p_start_date AND p_end_date
                AND (p_batch_id IS NULL OR archive_batch_id = p_batch_id)
                RETURNING id, request_type, user_id, tid, request_body, response_body,
                    response_code, hmac_valid, ip_address, processing_time_ms,
                    error_message, created_at
            )
            INSERT INTO public.callback_logs
            SELECT id, request_type, user_id, tid, request_body, response_body,
                   response_code, hmac_valid, ip_address, processing_time_ms,
                   error_message, created_at
            FROM restored
            ON CONFLICT (id) DO NOTHING;

        ELSE
            RAISE EXCEPTION 'Unsupported table: %', p_table_name;
    END CASE;

    GET DIAGNOSTICS v_restored_count = ROW_COUNT;
    RETURN v_restored_count;
END;
$$;

-- ============================================================================
-- STEP 11: GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on archive schema to service role
GRANT USAGE ON SCHEMA archive TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA archive TO service_role;

-- Grant execute on archival functions to postgres role only
GRANT EXECUTE ON FUNCTION archive.archive_callback_logs TO postgres;
GRANT EXECUTE ON FUNCTION archive.archive_transactions TO postgres;
GRANT EXECUTE ON FUNCTION archive.archive_game_rounds TO postgres;
GRANT EXECUTE ON FUNCTION archive.archive_sms_messages TO postgres;
GRANT EXECUTE ON FUNCTION archive.run_full_archival TO postgres;
GRANT EXECUTE ON FUNCTION archive.get_archival_stats TO postgres;
GRANT EXECUTE ON FUNCTION archive.restore_archived_data TO postgres;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON SCHEMA archive IS 'Archive schema for old data to prevent primary table bloat';
COMMENT ON FUNCTION archive.run_full_archival IS 'Master function to archive all old data. Run daily via pg_cron.';
COMMENT ON FUNCTION archive.get_archival_stats IS 'Monitor archival status and table sizes';
COMMENT ON FUNCTION archive.restore_archived_data IS 'Emergency function to restore archived data back to primary tables';

-- ============================================================================
-- INITIAL ARCHIVAL RUN (commented out for safety)
-- ============================================================================
-- Uncomment and run manually after verifying setup:
-- SELECT * FROM archive.run_full_archival(90);