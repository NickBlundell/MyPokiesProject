-- ============================================================================
-- DATABASE HEALTH MONITORING SYSTEM
-- ============================================================================
-- Comprehensive monitoring for table bloat, slow queries, connection exhaustion
-- Includes alerting functions and scheduled health checks
-- Run health checks every 15 minutes via pg_cron or external scheduler

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgstattuple;

-- ============================================================================
-- MONITORING SCHEMA
-- ============================================================================
-- Create a dedicated schema for monitoring to keep it organized
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Grant usage to authenticated users for dashboard access
GRANT USAGE ON SCHEMA monitoring TO authenticated;

-- ============================================================================
-- TABLE BLOAT MONITORING
-- ============================================================================
-- Monitor dead tuples and table bloat percentages
CREATE OR REPLACE VIEW monitoring.table_bloat AS
WITH constants AS (
    SELECT current_setting('block_size')::numeric AS bs,
           23 AS hdr, 4 AS ma
),
bloat_info AS (
    SELECT
        schemaname,
        tablename,
        cc.relpages,
        bs,
        CEIL((cc.reltuples*((datahdr+ma-
            (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)) AS otta
    FROM (
        SELECT
            ma,bs,schemaname,tablename,
            (datawidth+(hdr+ma-(CASE WHEN hdr%ma=0 THEN ma ELSE hdr%ma END)))::numeric AS datahdr,
            (maxfracsum*(nullhdr+ma-(CASE WHEN nullhdr%ma=0 THEN ma ELSE nullhdr%ma END))) AS nullhdr2
        FROM (
            SELECT
                schemaname, tablename, hdr, ma, bs,
                SUM((1-null_frac)*avg_width) AS datawidth,
                MAX(null_frac) AS maxfracsum,
                hdr+(
                    SELECT 1+count(*)/8
                    FROM pg_stats s2
                    WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
                ) AS nullhdr
            FROM pg_stats s, constants
            GROUP BY 1,2,3,4,5
        ) AS foo
    ) AS rs
    JOIN pg_class cc ON cc.relname = rs.tablename
    JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname
    WHERE cc.relpages > 0
)
SELECT
    schemaname,
    tablename,
    ROUND((cc.relpages::float*bs)/(1024*1024),2) AS table_size_mb,
    ROUND(((cc.relpages-otta)*bs)/(1024*1024),2) AS bloat_size_mb,
    ROUND(CASE WHEN otta=0 THEN 0.0 ELSE ((cc.relpages::float-otta)/cc.relpages)*100 END,2) AS bloat_percentage,
    CASE
        WHEN ROUND(CASE WHEN otta=0 THEN 0.0 ELSE ((cc.relpages::float-otta)/cc.relpages)*100 END,2) > 40 THEN 'CRITICAL'
        WHEN ROUND(CASE WHEN otta=0 THEN 0.0 ELSE ((cc.relpages::float-otta)/cc.relpages)*100 END,2) > 30 THEN 'HIGH'
        WHEN ROUND(CASE WHEN otta=0 THEN 0.0 ELSE ((cc.relpages::float-otta)/cc.relpages)*100 END,2) > 20 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS bloat_severity
FROM bloat_info, pg_class cc
JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = schemaname
WHERE cc.relname = tablename AND cc.relpages > 10
ORDER BY bloat_percentage DESC;

-- ============================================================================
-- INDEX BLOAT MONITORING
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.index_bloat AS
WITH btree_index_atts AS (
    SELECT nspname,
           indexrelname as index_name,
           relname as table_name,
           indexrelid,
           indrelid,
           tableoid,
           index_oid
    FROM pg_stat_user_indexes
    JOIN pg_index USING (indexrelid)
    JOIN pg_class c ON c.oid = indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE indisunique = false
),
index_item_sizes AS (
    SELECT
        ind_atts.nspname,
        ind_atts.index_name,
        ind_atts.table_name,
        ind_atts.indexrelid,
        ind_atts.reltuples,
        ind_atts.relpages,
        current_setting('block_size')::numeric AS bs,
        CASE WHEN version() ~ 'mingw32' OR version() ~ '64-bit|x86_64|ppc64|ia64|amd64' THEN 8 ELSE 4 END AS maxalign,
        24 AS pagehdr,
        CASE WHEN max(coalesce(s.stanullfrac,0)) = 0 THEN 2 ELSE 6 END AS index_tuple_hdr,
        sum((1-coalesce(s.stanullfrac,0)) * coalesce(s.stawidth, 2048)) AS nulldatawidth
    FROM (
        SELECT
            pg_stats.schemaname AS nspname,
            ic.indexrelname AS index_name,
            ic.relname AS table_name,
            ic.indexrelid,
            ic.reltuples,
            ic.relpages,
            a.attnum,
            pg_stats.tablename,
            pg_stats.attname,
            pg_stats.stanullfrac,
            pg_stats.stawidth
        FROM pg_attribute a
        JOIN (
            SELECT nspname, index_name, table_name, indexrelid,
                   indrelid, tableoid, index_oid,
                   unnest(indkey::int[]) AS attnum,
                   pg_class.reltuples, pg_class.relpages
            FROM btree_index_atts
            JOIN pg_class ON pg_class.oid = btree_index_atts.indexrelid
        ) ic ON a.attnum = ic.attnum AND a.attrelid = ic.indrelid
        JOIN pg_stats ON pg_stats.schemaname = ic.nspname
                      AND pg_stats.tablename = ic.table_name
                      AND pg_stats.attname = a.attname
    ) ind_atts
    GROUP BY 1,2,3,4,5,6
),
index_aligned AS (
    SELECT
        nspname,
        index_name,
        table_name,
        bs*(relpages)::bigint AS index_bytes,
        COALESCE(
            CEIL(reltuples*
                (6 + maxalign -
                 CASE WHEN index_tuple_hdr%maxalign = 0 THEN maxalign
                      ELSE index_tuple_hdr%maxalign END +
                 nulldatawidth + maxalign -
                 CASE WHEN nulldatawidth::int%maxalign = 0 THEN maxalign
                      ELSE nulldatawidth::int%maxalign END
                )::numeric / (bs - pagehdr::numeric))
            * bs, 0
        ) AS expected_bytes
    FROM index_item_sizes
)
SELECT
    nspname AS schemaname,
    table_name,
    index_name,
    ROUND(index_bytes/(1024*1024)::numeric,2) AS index_size_mb,
    ROUND((index_bytes-expected_bytes)/(1024*1024)::numeric,2) AS bloat_size_mb,
    ROUND(
        CASE WHEN index_bytes = 0 THEN 0
             ELSE ((index_bytes-expected_bytes)::numeric*100/index_bytes)
        END, 2
    ) AS bloat_percentage,
    CASE
        WHEN ROUND(CASE WHEN index_bytes = 0 THEN 0 ELSE ((index_bytes-expected_bytes)::numeric*100/index_bytes) END, 2) > 50 THEN 'CRITICAL'
        WHEN ROUND(CASE WHEN index_bytes = 0 THEN 0 ELSE ((index_bytes-expected_bytes)::numeric*100/index_bytes) END, 2) > 30 THEN 'HIGH'
        WHEN ROUND(CASE WHEN index_bytes = 0 THEN 0 ELSE ((index_bytes-expected_bytes)::numeric*100/index_bytes) END, 2) > 20 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS bloat_severity
FROM index_aligned
WHERE index_bytes > 1024*1024  -- Only show indexes larger than 1MB
ORDER BY bloat_percentage DESC;

-- ============================================================================
-- SLOW QUERY MONITORING
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.slow_queries AS
SELECT
    round(total_exec_time::numeric, 2) AS total_exec_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_exec_time_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_exec_time_ms,
    calls,
    round((total_exec_time / calls)::numeric, 2) AS avg_exec_time_ms,
    round((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage_cpu,
    queryid,
    substring(query, 1, 200) AS query_preview
FROM pg_stat_statements
WHERE
    -- Exclude internal/system queries
    query NOT LIKE '%pg_stat%'
    AND query NOT LIKE '%monitoring.%'
    -- Only show queries that take more than 100ms on average
    AND mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 50;

-- ============================================================================
-- CONNECTION POOL MONITORING
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.connection_status AS
SELECT
    count(*) AS total_connections,
    count(*) FILTER (WHERE state = 'active') AS active_connections,
    count(*) FILTER (WHERE state = 'idle') AS idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
    count(*) FILTER (WHERE state = 'idle in transaction (aborted)') AS idle_in_transaction_aborted,
    count(*) FILTER (WHERE wait_event_type IS NOT NULL) AS waiting_connections,
    max(extract(epoch FROM (now() - state_change))::int) AS max_idle_seconds,
    current_setting('max_connections')::int AS max_connections,
    round(100.0 * count(*) / current_setting('max_connections')::int, 2) AS connection_usage_percentage,
    CASE
        WHEN count(*) >= current_setting('max_connections')::int * 0.9 THEN 'CRITICAL'
        WHEN count(*) >= current_setting('max_connections')::int * 0.75 THEN 'HIGH'
        WHEN count(*) >= current_setting('max_connections')::int * 0.5 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS connection_pressure
FROM pg_stat_activity
WHERE pid != pg_backend_pid();

-- ============================================================================
-- LONG RUNNING QUERIES MONITORING
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.long_running_queries AS
SELECT
    pid,
    now() - query_start AS duration,
    state,
    wait_event_type,
    wait_event,
    usename,
    application_name,
    client_addr,
    substring(query, 1, 200) AS query_preview
FROM pg_stat_activity
WHERE
    state != 'idle'
    AND query NOT LIKE '%monitoring.%'
    AND now() - query_start > interval '1 minute'
ORDER BY duration DESC;

-- ============================================================================
-- MISSING INDEX DETECTION
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.missing_indexes AS
WITH table_scans AS (
    SELECT
        schemaname,
        tablename,
        n_tup_ins + n_tup_upd + n_tup_del AS total_writes,
        seq_scan,
        idx_scan,
        n_live_tup::numeric AS table_rows,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
    FROM pg_stat_user_tables
)
SELECT
    schemaname,
    tablename,
    table_rows,
    table_size,
    seq_scan,
    idx_scan,
    round(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS seq_scan_percentage,
    total_writes,
    CASE
        WHEN seq_scan > idx_scan * 5 AND table_rows > 10000 THEN 'CRITICAL - Index likely needed'
        WHEN seq_scan > idx_scan * 2 AND table_rows > 5000 THEN 'HIGH - Consider adding index'
        WHEN seq_scan > idx_scan AND table_rows > 1000 THEN 'MEDIUM - Monitor for patterns'
        ELSE 'LOW - Acceptable'
    END AS index_recommendation
FROM table_scans
WHERE table_rows > 100
    AND seq_scan > 100
ORDER BY seq_scan - idx_scan DESC
LIMIT 20;

-- ============================================================================
-- DATABASE SIZE MONITORING
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.database_size AS
SELECT
    current_database() AS database_name,
    pg_size_pretty(pg_database_size(current_database())) AS total_size,
    pg_database_size(current_database()) AS size_bytes,
    pg_size_pretty(sum(pg_total_relation_size(c.oid)) FILTER (WHERE n.nspname = 'public')) AS public_schema_size,
    pg_size_pretty(sum(pg_total_relation_size(c.oid)) FILTER (WHERE n.nspname NOT IN ('public', 'pg_catalog', 'information_schema'))) AS other_schemas_size,
    count(DISTINCT n.nspname) FILTER (WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')) AS user_schema_count,
    count(DISTINCT c.oid) FILTER (WHERE c.relkind = 'r') AS table_count,
    count(DISTINCT c.oid) FILTER (WHERE c.relkind = 'i') AS index_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace;

-- ============================================================================
-- AUTOVACUUM MONITORING
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.autovacuum_status AS
SELECT
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_percentage,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count,
    CASE
        WHEN n_dead_tup > n_live_tup * 0.2 AND n_live_tup > 1000 THEN 'NEEDS VACUUM - High dead tuples'
        WHEN last_autovacuum IS NULL AND n_live_tup > 10000 THEN 'NEEDS VACUUM - Never vacuumed'
        WHEN last_autovacuum < now() - interval '7 days' AND n_live_tup > 10000 THEN 'NEEDS VACUUM - Stale'
        ELSE 'OK'
    END AS vacuum_recommendation
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_dead_tup DESC;

-- ============================================================================
-- LOCK MONITORING
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.blocking_locks AS
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.application_name AS blocked_application,
    blocking_activity.application_name AS blocking_application,
    substring(blocked_activity.query, 1, 100) AS blocked_query,
    substring(blocking_activity.query, 1, 100) AS blocking_query,
    now() - blocked_activity.query_start AS blocked_duration
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================================================
-- REPLICATION LAG MONITORING (if replication is set up)
-- ============================================================================
CREATE OR REPLACE VIEW monitoring.replication_status AS
SELECT
    application_name,
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    write_lag,
    flush_lag,
    replay_lag,
    sync_state,
    sync_priority
FROM pg_stat_replication;

-- ============================================================================
-- HEALTH CHECK SUMMARY FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION monitoring.health_check_summary()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    severity TEXT,
    details JSONB,
    checked_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Connection pool status
    RETURN QUERY
    SELECT
        'Connection Pool'::TEXT,
        CASE
            WHEN connection_usage_percentage > 90 THEN 'CRITICAL'
            WHEN connection_usage_percentage > 75 THEN 'WARNING'
            ELSE 'OK'
        END,
        connection_pressure,
        jsonb_build_object(
            'total_connections', total_connections,
            'active_connections', active_connections,
            'idle_connections', idle_connections,
            'usage_percentage', connection_usage_percentage,
            'max_connections', max_connections
        ),
        now()
    FROM monitoring.connection_status;

    -- Table bloat status
    RETURN QUERY
    SELECT
        'Table Bloat'::TEXT,
        CASE
            WHEN MAX(bloat_percentage) > 40 THEN 'CRITICAL'
            WHEN MAX(bloat_percentage) > 30 THEN 'WARNING'
            ELSE 'OK'
        END,
        CASE
            WHEN MAX(bloat_percentage) > 40 THEN 'CRITICAL'
            WHEN MAX(bloat_percentage) > 30 THEN 'HIGH'
            WHEN MAX(bloat_percentage) > 20 THEN 'MEDIUM'
            ELSE 'LOW'
        END,
        jsonb_build_object(
            'worst_table', (SELECT tablename FROM monitoring.table_bloat ORDER BY bloat_percentage DESC LIMIT 1),
            'worst_bloat_percentage', MAX(bloat_percentage),
            'tables_over_20_percent', COUNT(*) FILTER (WHERE bloat_percentage > 20)
        ),
        now()
    FROM monitoring.table_bloat;

    -- Slow queries status
    RETURN QUERY
    SELECT
        'Slow Queries'::TEXT,
        CASE
            WHEN COUNT(*) FILTER (WHERE mean_exec_time_ms > 5000) > 0 THEN 'CRITICAL'
            WHEN COUNT(*) FILTER (WHERE mean_exec_time_ms > 1000) > 5 THEN 'WARNING'
            ELSE 'OK'
        END,
        CASE
            WHEN COUNT(*) FILTER (WHERE mean_exec_time_ms > 5000) > 0 THEN 'CRITICAL'
            WHEN COUNT(*) FILTER (WHERE mean_exec_time_ms > 1000) > 5 THEN 'HIGH'
            ELSE 'LOW'
        END,
        jsonb_build_object(
            'queries_over_5s', COUNT(*) FILTER (WHERE mean_exec_time_ms > 5000),
            'queries_over_1s', COUNT(*) FILTER (WHERE mean_exec_time_ms > 1000),
            'slowest_query_ms', MAX(mean_exec_time_ms)
        ),
        now()
    FROM monitoring.slow_queries;

    -- Database size status
    RETURN QUERY
    WITH size_info AS (
        SELECT * FROM monitoring.database_size
    )
    SELECT
        'Database Size'::TEXT,
        CASE
            WHEN size_bytes > 400 * 1024 * 1024 THEN 'WARNING' -- 400MB warning for free tier
            ELSE 'OK'
        END,
        CASE
            WHEN size_bytes > 450 * 1024 * 1024 THEN 'CRITICAL' -- 450MB critical for free tier
            WHEN size_bytes > 400 * 1024 * 1024 THEN 'HIGH'
            ELSE 'LOW'
        END,
        jsonb_build_object(
            'total_size', total_size,
            'size_bytes', size_bytes,
            'table_count', table_count,
            'index_count', index_count,
            'percentage_of_free_tier', ROUND((size_bytes::numeric / (500 * 1024 * 1024)) * 100, 2)
        ),
        now()
    FROM size_info;

    -- Autovacuum status
    RETURN QUERY
    SELECT
        'Autovacuum'::TEXT,
        CASE
            WHEN COUNT(*) FILTER (WHERE vacuum_recommendation != 'OK') > 10 THEN 'CRITICAL'
            WHEN COUNT(*) FILTER (WHERE vacuum_recommendation != 'OK') > 5 THEN 'WARNING'
            ELSE 'OK'
        END,
        CASE
            WHEN COUNT(*) FILTER (WHERE vacuum_recommendation != 'OK') > 10 THEN 'CRITICAL'
            WHEN COUNT(*) FILTER (WHERE vacuum_recommendation != 'OK') > 5 THEN 'HIGH'
            ELSE 'LOW'
        END,
        jsonb_build_object(
            'tables_needing_vacuum', COUNT(*) FILTER (WHERE vacuum_recommendation != 'OK'),
            'worst_dead_tuple_percentage', MAX(dead_tuple_percentage),
            'tables_never_vacuumed', COUNT(*) FILTER (WHERE last_autovacuum IS NULL AND n_live_tup > 10000)
        ),
        now()
    FROM monitoring.autovacuum_status;

    -- Lock monitoring
    RETURN QUERY
    SELECT
        'Database Locks'::TEXT,
        CASE
            WHEN COUNT(*) > 0 THEN 'WARNING'
            ELSE 'OK'
        END,
        CASE
            WHEN COUNT(*) > 5 THEN 'CRITICAL'
            WHEN COUNT(*) > 0 THEN 'HIGH'
            ELSE 'LOW'
        END,
        jsonb_build_object(
            'blocking_lock_count', COUNT(*),
            'longest_blocked_duration', MAX(blocked_duration)
        ),
        now()
    FROM monitoring.blocking_locks;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ALERTING FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION monitoring.check_and_alert()
RETURNS TABLE (
    alert_level TEXT,
    alert_message TEXT,
    alert_details JSONB
) AS $$
DECLARE
    v_connection_usage NUMERIC;
    v_max_bloat NUMERIC;
    v_slow_query_count INTEGER;
    v_blocking_locks INTEGER;
BEGIN
    -- Check connection pool
    SELECT connection_usage_percentage INTO v_connection_usage
    FROM monitoring.connection_status;

    IF v_connection_usage > 90 THEN
        RETURN QUERY
        SELECT
            'CRITICAL'::TEXT,
            format('Connection pool nearly exhausted: %s%% used', v_connection_usage),
            jsonb_build_object('connection_usage_percentage', v_connection_usage);
    ELSIF v_connection_usage > 75 THEN
        RETURN QUERY
        SELECT
            'WARNING'::TEXT,
            format('High connection pool usage: %s%%', v_connection_usage),
            jsonb_build_object('connection_usage_percentage', v_connection_usage);
    END IF;

    -- Check table bloat
    SELECT MAX(bloat_percentage) INTO v_max_bloat
    FROM monitoring.table_bloat;

    IF v_max_bloat > 40 THEN
        RETURN QUERY
        SELECT
            'CRITICAL'::TEXT,
            format('Severe table bloat detected: %s%%', v_max_bloat),
            (SELECT jsonb_build_object(
                'table', tablename,
                'bloat_percentage', bloat_percentage,
                'bloat_size_mb', bloat_size_mb
            ) FROM monitoring.table_bloat ORDER BY bloat_percentage DESC LIMIT 1);
    END IF;

    -- Check slow queries
    SELECT COUNT(*) INTO v_slow_query_count
    FROM monitoring.slow_queries
    WHERE mean_exec_time_ms > 5000;

    IF v_slow_query_count > 0 THEN
        RETURN QUERY
        SELECT
            'WARNING'::TEXT,
            format('%s queries averaging over 5 seconds', v_slow_query_count),
            (SELECT jsonb_agg(jsonb_build_object(
                'query', substring(query_preview, 1, 100),
                'mean_time_ms', mean_exec_time_ms,
                'calls', calls
            )) FROM (
                SELECT * FROM monitoring.slow_queries
                WHERE mean_exec_time_ms > 5000
                LIMIT 5
            ) sq);
    END IF;

    -- Check for blocking locks
    SELECT COUNT(*) INTO v_blocking_locks
    FROM monitoring.blocking_locks;

    IF v_blocking_locks > 0 THEN
        RETURN QUERY
        SELECT
            'WARNING'::TEXT,
            format('%s blocking locks detected', v_blocking_locks),
            (SELECT jsonb_agg(jsonb_build_object(
                'blocked_pid', blocked_pid,
                'blocking_pid', blocking_pid,
                'blocked_duration', blocked_duration::TEXT
            )) FROM monitoring.blocking_locks);
    END IF;

    -- If no alerts, return OK status
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            'OK'::TEXT,
            'All database health checks passed',
            jsonb_build_object('checked_at', now());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HEALTH CHECK HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS monitoring.health_check_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_name TEXT NOT NULL,
    status TEXT NOT NULL,
    severity TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient history queries
CREATE INDEX idx_health_check_history_created ON monitoring.health_check_history(created_at DESC);
CREATE INDEX idx_health_check_history_severity ON monitoring.health_check_history(severity) WHERE severity IN ('CRITICAL', 'HIGH');

-- ============================================================================
-- SCHEDULED HEALTH CHECK FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION monitoring.run_scheduled_health_check()
RETURNS void AS $$
BEGIN
    -- Insert health check results into history
    INSERT INTO monitoring.health_check_history (check_name, status, severity, details, created_at)
    SELECT check_name, status, severity, details, checked_at
    FROM monitoring.health_check_summary();

    -- Clean up old history (keep last 7 days)
    DELETE FROM monitoring.health_check_history
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant read access to monitoring views for authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO authenticated;
GRANT SELECT ON monitoring.table_bloat TO authenticated;
GRANT SELECT ON monitoring.index_bloat TO authenticated;
GRANT SELECT ON monitoring.slow_queries TO authenticated;
GRANT SELECT ON monitoring.connection_status TO authenticated;
GRANT SELECT ON monitoring.long_running_queries TO authenticated;
GRANT SELECT ON monitoring.missing_indexes TO authenticated;
GRANT SELECT ON monitoring.database_size TO authenticated;
GRANT SELECT ON monitoring.autovacuum_status TO authenticated;
GRANT SELECT ON monitoring.blocking_locks TO authenticated;
GRANT SELECT ON monitoring.replication_status TO authenticated;
GRANT SELECT ON monitoring.health_check_history TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION monitoring.health_check_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION monitoring.check_and_alert() TO authenticated;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE monitoring.health_check_history ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to health_check_history"
    ON monitoring.health_check_history
    FOR ALL
    USING (auth.role() = 'service_role');

-- Authenticated users can view all history (read-only)
CREATE POLICY "Authenticated users can view health check history"
    ON monitoring.health_check_history
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON SCHEMA monitoring IS 'Database health monitoring and performance tracking';
COMMENT ON VIEW monitoring.table_bloat IS 'Monitors table bloat percentage and dead tuples';
COMMENT ON VIEW monitoring.index_bloat IS 'Monitors index bloat and recommends maintenance';
COMMENT ON VIEW monitoring.slow_queries IS 'Tracks queries with high average execution time';
COMMENT ON VIEW monitoring.connection_status IS 'Monitors database connection pool usage';
COMMENT ON VIEW monitoring.long_running_queries IS 'Shows queries running longer than 1 minute';
COMMENT ON VIEW monitoring.missing_indexes IS 'Detects tables with high sequential scan rates';
COMMENT ON VIEW monitoring.database_size IS 'Tracks overall database size and object counts';
COMMENT ON VIEW monitoring.autovacuum_status IS 'Monitors autovacuum effectiveness and dead tuples';
COMMENT ON VIEW monitoring.blocking_locks IS 'Shows current lock conflicts and blocked queries';
COMMENT ON VIEW monitoring.replication_status IS 'Monitors replication lag if replication is configured';
COMMENT ON FUNCTION monitoring.health_check_summary() IS 'Returns comprehensive health check summary';
COMMENT ON FUNCTION monitoring.check_and_alert() IS 'Checks for critical issues and returns alerts';
COMMENT ON FUNCTION monitoring.run_scheduled_health_check() IS 'Scheduled function to run health checks and store history';
COMMENT ON TABLE monitoring.health_check_history IS 'Historical record of all health check results';

-- ============================================================================
-- SCHEDULE HEALTH CHECKS (using pg_cron or external scheduler)
-- ============================================================================
-- To schedule with pg_cron (if available):
-- SELECT cron.schedule('health-check', '*/15 * * * *', 'SELECT monitoring.run_scheduled_health_check();');

-- For external scheduling, call this function every 15 minutes:
-- SELECT monitoring.run_scheduled_health_check();