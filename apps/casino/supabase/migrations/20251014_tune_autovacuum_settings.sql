-- ============================================================================
-- AUTOVACUUM TUNING FOR HIGH-WRITE TABLES
-- ============================================================================
-- Purpose: Optimize autovacuum settings to prevent table bloat and improve performance
-- Target tables: transactions, callback_logs, sms_messages, game_rounds
-- Expected impact: 50-70% reduction in dead tuples, faster queries, less disk usage
-- ============================================================================

-- ============================================================================
-- STEP 1: ANALYZE CURRENT TABLE BLOAT
-- ============================================================================

-- Function to check table bloat and dead tuple percentage
CREATE OR REPLACE FUNCTION public.analyze_table_bloat()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    table_size TEXT,
    dead_tuples BIGINT,
    live_tuples BIGINT,
    dead_tuple_percent NUMERIC,
    last_vacuum TIMESTAMPTZ,
    last_autovacuum TIMESTAMPTZ,
    vacuum_count BIGINT,
    autovacuum_count BIGINT,
    bloat_estimate TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname::TEXT,
        tablename::TEXT,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))::TEXT as table_size,
        n_dead_tup::BIGINT as dead_tuples,
        n_live_tup::BIGINT as live_tuples,
        CASE
            WHEN n_live_tup > 0 THEN
                ROUND((n_dead_tup::NUMERIC / (n_live_tup + n_dead_tup)) * 100, 2)
            ELSE 0
        END as dead_tuple_percent,
        last_vacuum::TIMESTAMPTZ,
        last_autovacuum::TIMESTAMPTZ,
        vacuum_count::BIGINT,
        autovacuum_count::BIGINT,
        CASE
            WHEN n_dead_tup > n_live_tup * 0.2 THEN 'HIGH - Needs vacuum'
            WHEN n_dead_tup > n_live_tup * 0.1 THEN 'MEDIUM - Monitor'
            ELSE 'LOW - Healthy'
        END::TEXT as bloat_estimate
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    AND tablename IN (
        'transactions',
        'callback_logs',
        'sms_messages',
        'game_rounds',
        'round_actions',
        'user_balances',
        'jackpot_tickets',
        'player_bonuses',
        'bonus_wagering_contributions'
    )
    ORDER BY
        CASE
            WHEN n_live_tup > 0 THEN n_dead_tup::NUMERIC / (n_live_tup + n_dead_tup)
            ELSE 0
        END DESC;
END;
$$;

-- ============================================================================
-- STEP 2: SET AGGRESSIVE AUTOVACUUM FOR HIGH-WRITE TABLES
-- ============================================================================

-- Transactions table - Very high write volume
ALTER TABLE public.transactions SET (
    -- Trigger autovacuum when 5% of rows are dead (instead of default 20%)
    autovacuum_vacuum_scale_factor = 0.05,
    -- Plus 1000 dead tuples (instead of default 50)
    autovacuum_vacuum_threshold = 1000,
    -- Trigger analyze when 5% of rows change (instead of default 10%)
    autovacuum_analyze_scale_factor = 0.05,
    -- Plus 1000 changed rows (instead of default 50)
    autovacuum_analyze_threshold = 1000,
    -- Allow more aggressive vacuuming
    autovacuum_vacuum_cost_delay = 2,
    autovacuum_vacuum_cost_limit = 400,
    -- Keep more free space for updates
    fillfactor = 90
);

-- Callback logs table - Very high write volume, rarely updated
ALTER TABLE public.callback_logs SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_threshold = 2000,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_analyze_threshold = 2000,
    autovacuum_vacuum_cost_delay = 2,
    autovacuum_vacuum_cost_limit = 400,
    -- Dense packing since rarely updated
    fillfactor = 95
);

-- Game rounds table - High write and update volume
ALTER TABLE public.game_rounds SET (
    autovacuum_vacuum_scale_factor = 0.08,
    autovacuum_vacuum_threshold = 500,
    autovacuum_analyze_scale_factor = 0.08,
    autovacuum_analyze_threshold = 500,
    autovacuum_vacuum_cost_delay = 2,
    autovacuum_vacuum_cost_limit = 300,
    -- Leave space for status updates
    fillfactor = 85
);

-- Round actions table - High write volume
ALTER TABLE public.round_actions SET (
    autovacuum_vacuum_scale_factor = 0.08,
    autovacuum_vacuum_threshold = 1000,
    autovacuum_analyze_scale_factor = 0.08,
    autovacuum_analyze_threshold = 1000,
    autovacuum_vacuum_cost_delay = 3,
    autovacuum_vacuum_cost_limit = 300,
    fillfactor = 95
);

-- User balances table - Very high update frequency
ALTER TABLE public.user_balances SET (
    -- Very aggressive settings due to constant updates
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_vacuum_threshold = 100,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_analyze_threshold = 100,
    autovacuum_vacuum_cost_delay = 1,
    autovacuum_vacuum_cost_limit = 500,
    -- Leave lots of space for updates
    fillfactor = 75
);

-- Jackpot tickets table - High write volume during peak
ALTER TABLE public.jackpot_tickets SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_vacuum_threshold = 2000,
    autovacuum_analyze_scale_factor = 0.1,
    autovacuum_analyze_threshold = 2000,
    autovacuum_vacuum_cost_delay = 3,
    autovacuum_vacuum_cost_limit = 250,
    fillfactor = 95
);

-- Player bonuses table - Moderate write and update volume
ALTER TABLE public.player_bonuses SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_vacuum_threshold = 500,
    autovacuum_analyze_scale_factor = 0.1,
    autovacuum_analyze_threshold = 500,
    autovacuum_vacuum_cost_delay = 3,
    autovacuum_vacuum_cost_limit = 200,
    fillfactor = 85
);

-- Bonus wagering contributions - High write volume
ALTER TABLE public.bonus_wagering_contributions SET (
    autovacuum_vacuum_scale_factor = 0.08,
    autovacuum_vacuum_threshold = 1000,
    autovacuum_analyze_scale_factor = 0.08,
    autovacuum_analyze_threshold = 1000,
    autovacuum_vacuum_cost_delay = 3,
    autovacuum_vacuum_cost_limit = 250,
    fillfactor = 95
);

-- SMS messages table (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sms_messages'
    ) THEN
        ALTER TABLE public.sms_messages SET (
            autovacuum_vacuum_scale_factor = 0.1,
            autovacuum_vacuum_threshold = 1000,
            autovacuum_analyze_scale_factor = 0.1,
            autovacuum_analyze_threshold = 1000,
            autovacuum_vacuum_cost_delay = 3,
            autovacuum_vacuum_cost_limit = 200,
            fillfactor = 95
        );
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE MONITORING FUNCTIONS
-- ============================================================================

-- Function to monitor autovacuum activity
CREATE OR REPLACE FUNCTION public.monitor_autovacuum_activity()
RETURNS TABLE(
    pid INTEGER,
    table_name TEXT,
    phase TEXT,
    heap_blks_total BIGINT,
    heap_blks_scanned BIGINT,
    heap_blks_vacuumed BIGINT,
    progress_percent NUMERIC,
    duration INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.pid,
        c.relname::TEXT as table_name,
        p.phase::TEXT,
        p.heap_blks_total,
        p.heap_blks_scanned,
        p.heap_blks_vacuumed,
        CASE
            WHEN p.heap_blks_total > 0 THEN
                ROUND((p.heap_blks_scanned::NUMERIC / p.heap_blks_total) * 100, 2)
            ELSE 0
        END as progress_percent,
        (NOW() - a.xact_start)::INTERVAL as duration
    FROM pg_stat_progress_vacuum p
    JOIN pg_stat_activity a ON p.pid = a.pid
    LEFT JOIN pg_class c ON p.relid = c.oid
    WHERE a.query LIKE '%autovacuum%';
END;
$$;

-- Function to get autovacuum recommendations
CREATE OR REPLACE FUNCTION public.get_autovacuum_recommendations()
RETURNS TABLE(
    table_name TEXT,
    current_dead_tuples BIGINT,
    current_scale_factor NUMERIC,
    recommended_scale_factor NUMERIC,
    current_threshold INTEGER,
    recommended_threshold INTEGER,
    recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH table_stats AS (
        SELECT
            tablename,
            n_dead_tup,
            n_live_tup,
            n_tup_ins + n_tup_upd + n_tup_del as total_changes,
            last_autovacuum,
            COALESCE(
                (SELECT option_value::NUMERIC
                 FROM pg_options_to_table(reloptions)
                 WHERE option_name = 'autovacuum_vacuum_scale_factor'),
                current_setting('autovacuum_vacuum_scale_factor')::NUMERIC
            ) as current_scale,
            COALESCE(
                (SELECT option_value::INTEGER
                 FROM pg_options_to_table(reloptions)
                 WHERE option_name = 'autovacuum_vacuum_threshold'),
                current_setting('autovacuum_vacuum_threshold')::INTEGER
            ) as current_threshold
        FROM pg_stat_user_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public'
        AND n_live_tup > 10000  -- Only tables with significant data
    )
    SELECT
        tablename::TEXT,
        n_dead_tup::BIGINT,
        current_scale::NUMERIC,
        CASE
            -- Very high update tables
            WHEN tablename IN ('user_balances') THEN 0.02
            -- High write tables
            WHEN tablename IN ('transactions', 'callback_logs') THEN 0.05
            -- Medium write tables
            WHEN tablename IN ('game_rounds', 'round_actions') THEN 0.08
            -- Standard tables
            ELSE 0.10
        END::NUMERIC as recommended_scale,
        current_threshold::INTEGER,
        CASE
            WHEN tablename IN ('user_balances') THEN 100
            WHEN tablename IN ('transactions', 'callback_logs') THEN 1000
            WHEN tablename IN ('game_rounds', 'round_actions') THEN 500
            ELSE 500
        END::INTEGER as recommended_threshold,
        CASE
            WHEN n_dead_tup > n_live_tup * 0.2 THEN 'URGENT: Run VACUUM manually, adjust settings'
            WHEN n_dead_tup > n_live_tup * 0.1 THEN 'WARNING: Increase vacuum frequency'
            WHEN last_autovacuum < NOW() - INTERVAL '24 hours' THEN 'CHECK: No vacuum in 24h, verify settings'
            ELSE 'OK: Settings appear appropriate'
        END::TEXT as recommendation
    FROM table_stats
    ORDER BY n_dead_tup DESC;
END;
$$;

-- Function to estimate bloat reduction after vacuum
CREATE OR REPLACE FUNCTION public.estimate_bloat_reduction()
RETURNS TABLE(
    table_name TEXT,
    current_size TEXT,
    dead_tuple_size TEXT,
    estimated_size_after_vacuum TEXT,
    potential_space_saved TEXT,
    reduction_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH bloat_calc AS (
        SELECT
            schemaname,
            tablename,
            pg_total_relation_size(schemaname||'.'||tablename) as total_size,
            n_dead_tup,
            n_live_tup,
            -- Estimate 8KB per dead tuple (conservative)
            n_dead_tup * 8192 as dead_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        AND n_dead_tup > 1000  -- Only tables with significant dead tuples
    )
    SELECT
        tablename::TEXT,
        pg_size_pretty(total_size)::TEXT as current_size,
        pg_size_pretty(dead_size)::TEXT as dead_tuple_size,
        pg_size_pretty(total_size - dead_size)::TEXT as estimated_size_after_vacuum,
        pg_size_pretty(dead_size)::TEXT as potential_space_saved,
        ROUND((dead_size::NUMERIC / NULLIF(total_size, 0)) * 100, 2) as reduction_percentage
    FROM bloat_calc
    ORDER BY dead_size DESC;
END;
$$;

-- ============================================================================
-- STEP 4: CREATE MANUAL VACUUM PROCEDURES
-- ============================================================================

-- Procedure to perform targeted vacuum on high-bloat tables
CREATE OR REPLACE PROCEDURE public.vacuum_high_bloat_tables(
    p_dead_tuple_threshold NUMERIC DEFAULT 0.1,
    p_analyze BOOLEAN DEFAULT TRUE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_table RECORD;
    v_command TEXT;
BEGIN
    FOR v_table IN
        SELECT
            schemaname,
            tablename,
            n_dead_tup,
            n_live_tup,
            ROUND((n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0)), 3) as dead_ratio
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        AND n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0) > p_dead_tuple_threshold
        AND n_dead_tup > 1000
        ORDER BY n_dead_tup DESC
    LOOP
        v_command := 'VACUUM';
        IF p_analyze THEN
            v_command := v_command || ' ANALYZE';
        END IF;
        v_command := v_command || ' ' || v_table.schemaname || '.' || v_table.tablename;

        RAISE NOTICE 'Vacuuming table % (% dead tuples, % ratio)',
            v_table.tablename, v_table.n_dead_tup, v_table.dead_ratio;

        EXECUTE v_command;
    END LOOP;
END;
$$;

-- ============================================================================
-- STEP 5: CREATE VACUUM HISTORY TRACKING
-- ============================================================================

-- Table to track vacuum operations
CREATE TABLE IF NOT EXISTS public.vacuum_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    vacuum_type TEXT CHECK (vacuum_type IN ('manual', 'auto', 'full')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    dead_tuples_before BIGINT,
    dead_tuples_after BIGINT,
    size_before BIGINT,
    size_after BIGINT,
    duration INTERVAL
);

CREATE INDEX idx_vacuum_history_table_time ON public.vacuum_history(table_name, started_at DESC);

-- Function to record vacuum operation
CREATE OR REPLACE FUNCTION public.record_vacuum_operation(
    p_table_name TEXT,
    p_vacuum_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_dead_tuples BIGINT;
    v_table_size BIGINT;
BEGIN
    -- Get current stats
    SELECT n_dead_tup, pg_total_relation_size(schemaname||'.'||tablename)
    INTO v_dead_tuples, v_table_size
    FROM pg_stat_user_tables
    WHERE tablename = p_table_name
    AND schemaname = 'public';

    -- Insert record
    INSERT INTO public.vacuum_history (
        table_name,
        vacuum_type,
        dead_tuples_before,
        size_before
    )
    VALUES (
        p_table_name,
        p_vacuum_type,
        v_dead_tuples,
        v_table_size
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ============================================================================
-- STEP 6: CREATE SCHEDULED MAINTENANCE
-- ============================================================================

-- Schedule aggressive vacuum for critical tables (using pg_cron if available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Vacuum user_balances every hour (very high update rate)
        PERFORM cron.schedule(
            'vacuum-user-balances',
            '0 * * * *',
            'VACUUM ANALYZE public.user_balances;'
        );

        -- Vacuum transactions every 4 hours
        PERFORM cron.schedule(
            'vacuum-transactions',
            '0 */4 * * *',
            'VACUUM ANALYZE public.transactions;'
        );

        -- Vacuum callback_logs daily at 2 AM
        PERFORM cron.schedule(
            'vacuum-callback-logs',
            '0 2 * * *',
            'VACUUM ANALYZE public.callback_logs;'
        );

        -- Run bloat reduction weekly
        PERFORM cron.schedule(
            'vacuum-high-bloat-weekly',
            '0 3 * * 0',
            'CALL public.vacuum_high_bloat_tables(0.1, true);'
        );
    END IF;
END $$;

-- ============================================================================
-- STEP 7: CREATE ALERTS FOR VACUUM ISSUES
-- ============================================================================

-- Function to check for vacuum issues
CREATE OR REPLACE FUNCTION public.check_vacuum_health()
RETURNS TABLE(
    alert_level TEXT,
    table_name TEXT,
    issue TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Tables with high bloat
    SELECT
        'CRITICAL'::TEXT,
        tablename::TEXT,
        'High bloat detected'::TEXT,
        format('Dead tuples: %s (%s%% of table)', n_dead_tup,
            ROUND((n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 1))::TEXT
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    AND n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0) > 0.2
    AND n_dead_tup > 10000

    UNION ALL

    -- Tables not vacuumed in 24 hours
    SELECT
        'WARNING'::TEXT,
        tablename::TEXT,
        'No recent vacuum'::TEXT,
        format('Last vacuum: %s ago',
            COALESCE(age(NOW(), GREATEST(last_vacuum, last_autovacuum)), INTERVAL '999 days'))::TEXT
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    AND tablename IN ('transactions', 'user_balances', 'callback_logs', 'game_rounds')
    AND COALESCE(GREATEST(last_vacuum, last_autovacuum), '1970-01-01') < NOW() - INTERVAL '24 hours'

    UNION ALL

    -- Tables with disabled autovacuum
    SELECT
        'WARNING'::TEXT,
        c.relname::TEXT,
        'Autovacuum may be disabled'::TEXT,
        'Check table storage parameters'::TEXT
    FROM pg_class c
    WHERE c.relkind = 'r'
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND EXISTS (
        SELECT 1 FROM pg_options_to_table(c.reloptions)
        WHERE option_name = 'autovacuum_enabled' AND option_value = 'false'
    );

    -- Return healthy status if no issues found
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            'HEALTHY'::TEXT,
            'all'::TEXT,
            'No vacuum issues detected'::TEXT,
            'All tables within acceptable bloat levels'::TEXT;
    END IF;
END;
$$;

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.analyze_table_bloat TO service_role;
GRANT EXECUTE ON FUNCTION public.monitor_autovacuum_activity TO service_role;
GRANT EXECUTE ON FUNCTION public.get_autovacuum_recommendations TO service_role;
GRANT EXECUTE ON FUNCTION public.estimate_bloat_reduction TO service_role;
GRANT EXECUTE ON FUNCTION public.check_vacuum_health TO service_role;
GRANT SELECT, INSERT ON public.vacuum_history TO service_role;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.analyze_table_bloat IS 'Analyze table bloat and dead tuple percentages';
COMMENT ON FUNCTION public.monitor_autovacuum_activity IS 'Monitor currently running autovacuum operations';
COMMENT ON FUNCTION public.get_autovacuum_recommendations IS 'Get recommendations for autovacuum settings';
COMMENT ON PROCEDURE public.vacuum_high_bloat_tables IS 'Manually vacuum tables with high bloat';
COMMENT ON FUNCTION public.check_vacuum_health IS 'Check for vacuum-related issues and generate alerts';

-- ============================================================================
-- INITIAL ANALYSIS
-- ============================================================================

-- Run initial bloat analysis
SELECT * FROM public.analyze_table_bloat();

-- Check current autovacuum settings effectiveness
SELECT * FROM public.get_autovacuum_recommendations();

-- Check for any immediate issues
SELECT * FROM public.check_vacuum_health();