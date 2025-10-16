-- ============================================================================
-- ENABLE PG_STAT_STATEMENTS FOR QUERY MONITORING
-- ============================================================================
-- Purpose: Enable detailed query performance monitoring and optimization
-- Extension: pg_stat_statements - tracks execution statistics of all SQL statements
-- Expected impact: Identify slow queries, optimize performance bottlenecks
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE PG_STAT_STATEMENTS EXTENSION
-- ============================================================================

-- Enable the extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- STEP 2: CREATE MONITORING VIEWS
-- ============================================================================

-- View for slow queries (queries taking more than 100ms on average)
CREATE OR REPLACE VIEW public.slow_queries AS
SELECT
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
    ROUND(max_exec_time::numeric, 2) as max_time_ms,
    ROUND(min_exec_time::numeric, 2) as min_time_ms,
    ROUND(stddev_exec_time::numeric, 2) as stddev_time_ms,
    calls,
    ROUND((total_exec_time / NULLIF(calls, 0))::numeric, 2) as avg_time_per_call_ms,
    ROUND((100.0 * total_exec_time / NULLIF(SUM(total_exec_time) OVER (), 0))::numeric, 2) as percent_total_time,
    LEFT(query, 100) as query_preview
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Only queries averaging > 100ms
AND query NOT LIKE '%pg_stat_statements%'  -- Exclude monitoring queries
ORDER BY mean_exec_time DESC
LIMIT 50;

-- View for most frequently executed queries
CREATE OR REPLACE VIEW public.frequent_queries AS
SELECT
    calls,
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
    ROUND((calls::numeric / NULLIF(EXTRACT(EPOCH FROM (NOW() - stats_reset)), 0))::numeric, 2) as calls_per_second,
    ROUND((100.0 * calls / NULLIF(SUM(calls) OVER (), 0))::numeric, 2) as percent_total_calls,
    LEFT(query, 100) as query_preview
FROM pg_stat_statements
WHERE calls > 100  -- Only queries called more than 100 times
AND query NOT LIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 50;

-- View for queries with high I/O impact
CREATE OR REPLACE VIEW public.high_io_queries AS
SELECT
    calls,
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
    shared_blks_hit + shared_blks_read as total_blocks,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_written,
    ROUND((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) as cache_hit_ratio,
    LEFT(query, 100) as query_preview
FROM pg_stat_statements
WHERE shared_blks_read > 1000  -- Queries reading more than 1000 blocks from disk
ORDER BY shared_blks_read DESC
LIMIT 50;

-- View for queries that might need indexes
CREATE OR REPLACE VIEW public.missing_indexes AS
WITH index_stats AS (
    SELECT
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        shared_blks_read,
        shared_blks_hit,
        -- Extract table names from queries (basic pattern matching)
        CASE
            WHEN query ~* 'FROM\s+(\w+)' THEN
                (regexp_match(query, 'FROM\s+(\w+)', 'i'))[1]
            WHEN query ~* 'UPDATE\s+(\w+)' THEN
                (regexp_match(query, 'UPDATE\s+(\w+)', 'i'))[1]
            WHEN query ~* 'DELETE\s+FROM\s+(\w+)' THEN
                (regexp_match(query, 'DELETE\s+FROM\s+(\w+)', 'i'))[1]
            ELSE NULL
        END as table_name,
        -- Extract WHERE conditions
        CASE
            WHEN query ~* 'WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)' THEN
                LEFT((regexp_match(query, 'WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)', 'i'))[1], 100)
            ELSE NULL
        END as where_clause
    FROM pg_stat_statements
    WHERE query ~* 'WHERE'  -- Only queries with WHERE clauses
    AND mean_exec_time > 50  -- Taking more than 50ms on average
    AND shared_blks_read > shared_blks_hit * 0.1  -- Low cache hit ratio
)
SELECT
    table_name,
    where_clause,
    calls,
    ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
    shared_blks_read as disk_reads,
    ROUND((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) as cache_hit_ratio,
    LEFT(query, 150) as query_preview
FROM index_stats
WHERE table_name IS NOT NULL
ORDER BY mean_exec_time DESC
LIMIT 30;

-- ============================================================================
-- STEP 3: CREATE ANALYSIS FUNCTIONS
-- ============================================================================

-- Function to analyze query performance by table
CREATE OR REPLACE FUNCTION public.analyze_query_performance_by_table()
RETURNS TABLE(
    table_name TEXT,
    total_queries BIGINT,
    total_time_ms NUMERIC,
    avg_time_ms NUMERIC,
    total_calls BIGINT,
    cache_hit_ratio NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH table_stats AS (
        SELECT
            CASE
                WHEN query ~* 'FROM\s+public\.(\w+)' THEN
                    (regexp_match(query, 'FROM\s+public\.(\w+)', 'i'))[1]
                WHEN query ~* 'FROM\s+(\w+)' THEN
                    (regexp_match(query, 'FROM\s+(\w+)', 'i'))[1]
                WHEN query ~* 'UPDATE\s+public\.(\w+)' THEN
                    (regexp_match(query, 'UPDATE\s+public\.(\w+)', 'i'))[1]
                WHEN query ~* 'UPDATE\s+(\w+)' THEN
                    (regexp_match(query, 'UPDATE\s+(\w+)', 'i'))[1]
                WHEN query ~* 'INSERT\s+INTO\s+public\.(\w+)' THEN
                    (regexp_match(query, 'INSERT\s+INTO\s+public\.(\w+)', 'i'))[1]
                WHEN query ~* 'INSERT\s+INTO\s+(\w+)' THEN
                    (regexp_match(query, 'INSERT\s+INTO\s+(\w+)', 'i'))[1]
                WHEN query ~* 'DELETE\s+FROM\s+public\.(\w+)' THEN
                    (regexp_match(query, 'DELETE\s+FROM\s+public\.(\w+)', 'i'))[1]
                WHEN query ~* 'DELETE\s+FROM\s+(\w+)' THEN
                    (regexp_match(query, 'DELETE\s+FROM\s+(\w+)', 'i'))[1]
                ELSE 'other'
            END as tbl_name,
            calls,
            total_exec_time,
            mean_exec_time,
            shared_blks_hit,
            shared_blks_read
        FROM pg_stat_statements
    )
    SELECT
        tbl_name::TEXT,
        COUNT(*)::BIGINT as total_queries,
        ROUND(SUM(total_exec_time)::numeric, 2) as total_time_ms,
        ROUND(AVG(mean_exec_time)::numeric, 2) as avg_time_ms,
        SUM(calls)::BIGINT as total_calls,
        ROUND((100.0 * SUM(shared_blks_hit) / NULLIF(SUM(shared_blks_hit + shared_blks_read), 0))::numeric, 2) as cache_hit_ratio
    FROM table_stats
    WHERE tbl_name IS NOT NULL
    GROUP BY tbl_name
    ORDER BY total_time_ms DESC;
END;
$$;

-- Function to get query optimization recommendations
CREATE OR REPLACE FUNCTION public.get_query_optimization_recommendations()
RETURNS TABLE(
    priority TEXT,
    recommendation TEXT,
    affected_queries INTEGER,
    potential_time_saved_ms NUMERIC,
    example_query TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Queries that could benefit from indexes
    WITH index_candidates AS (
        SELECT
            COUNT(*) as query_count,
            SUM(total_exec_time - (calls * 10)) as potential_savings,  -- Assume 10ms with index
            MAX(query) as example
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        AND shared_blks_read > shared_blks_hit * 0.2  -- Poor cache ratio
        AND query ~* 'WHERE'
    )
    SELECT
        'HIGH'::TEXT,
        'Add indexes for slow WHERE clauses'::TEXT,
        query_count::INTEGER,
        ROUND(potential_savings::numeric, 2),
        LEFT(example, 150)::TEXT
    FROM index_candidates
    WHERE query_count > 0

    UNION ALL

    -- Queries with SELECT *
    SELECT
        'MEDIUM'::TEXT,
        'Replace SELECT * with specific columns'::TEXT,
        COUNT(*)::INTEGER,
        ROUND(SUM(total_exec_time * 0.1)::numeric, 2),  -- Assume 10% improvement
        LEFT(MAX(query), 150)::TEXT
    FROM pg_stat_statements
    WHERE query ~* 'SELECT\s+\*'
    GROUP BY 1, 2
    HAVING COUNT(*) > 0

    UNION ALL

    -- N+1 query patterns
    SELECT
        'HIGH'::TEXT,
        'Potential N+1 query pattern detected'::TEXT,
        COUNT(*)::INTEGER,
        ROUND(SUM(total_exec_time * 0.8)::numeric, 2),  -- Assume 80% improvement with batching
        LEFT(MAX(query), 150)::TEXT
    FROM pg_stat_statements
    WHERE calls > 1000
    AND mean_exec_time < 10  -- Fast individual queries
    AND query ~* 'WHERE.*=\s*\$\d+'  -- Parameterized WHERE
    GROUP BY 1, 2
    HAVING COUNT(*) > 0

    UNION ALL

    -- Missing LIMIT clauses
    SELECT
        'LOW'::TEXT,
        'Add LIMIT clause to unbounded queries'::TEXT,
        COUNT(*)::INTEGER,
        ROUND(SUM(total_exec_time * 0.2)::numeric, 2),  -- Assume 20% improvement
        LEFT(MAX(query), 150)::TEXT
    FROM pg_stat_statements
    WHERE query ~* 'SELECT'
    AND query !~* 'LIMIT'
    AND query !~* 'COUNT\(\*\)'
    AND mean_exec_time > 50
    GROUP BY 1, 2
    HAVING COUNT(*) > 0

    ORDER BY priority, potential_time_saved_ms DESC;
END;
$$;

-- Function to track query performance over time
CREATE TABLE IF NOT EXISTS public.query_performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    query_hash BIGINT,
    query_text TEXT,
    calls BIGINT,
    total_time_ms NUMERIC,
    mean_time_ms NUMERIC,
    min_time_ms NUMERIC,
    max_time_ms NUMERIC,
    cache_hit_ratio NUMERIC
);

CREATE INDEX idx_query_perf_history_time ON public.query_performance_history(captured_at DESC);
CREATE INDEX idx_query_perf_history_hash ON public.query_performance_history(query_hash, captured_at DESC);

-- Function to capture query performance snapshot
CREATE OR REPLACE FUNCTION public.capture_query_performance_snapshot()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    INSERT INTO public.query_performance_history (
        query_hash,
        query_text,
        calls,
        total_time_ms,
        mean_time_ms,
        min_time_ms,
        max_time_ms,
        cache_hit_ratio
    )
    SELECT
        queryid,
        LEFT(query, 500),
        calls,
        ROUND(total_exec_time::numeric, 2),
        ROUND(mean_exec_time::numeric, 2),
        ROUND(min_exec_time::numeric, 2),
        ROUND(max_exec_time::numeric, 2),
        ROUND((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2)
    FROM pg_stat_statements
    WHERE calls > 10  -- Only track queries with significant usage
    AND total_exec_time > 100;  -- And meaningful execution time

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Clean up old history (keep 30 days)
    DELETE FROM public.query_performance_history
    WHERE captured_at < NOW() - INTERVAL '30 days';

    RETURN v_count;
END;
$$;

-- Function to analyze query performance trends
CREATE OR REPLACE FUNCTION public.analyze_query_trends(
    p_query_pattern TEXT DEFAULT '%',
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
    query_preview TEXT,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    trend TEXT,
    avg_time_start_ms NUMERIC,
    avg_time_end_ms NUMERIC,
    change_percent NUMERIC,
    total_calls BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH time_windows AS (
        SELECT
            query_hash,
            LEFT(MAX(query_text), 100) as query,
            MIN(captured_at) as first_capture,
            MAX(captured_at) as last_capture,
            -- First period (older half)
            AVG(CASE
                WHEN captured_at < NOW() - (p_days/2 || ' days')::INTERVAL
                THEN mean_time_ms
            END) as old_avg,
            -- Recent period (newer half)
            AVG(CASE
                WHEN captured_at >= NOW() - (p_days/2 || ' days')::INTERVAL
                THEN mean_time_ms
            END) as new_avg,
            SUM(calls) as total
        FROM public.query_performance_history
        WHERE captured_at > NOW() - (p_days || ' days')::INTERVAL
        AND query_text LIKE p_query_pattern
        GROUP BY query_hash
        HAVING COUNT(DISTINCT DATE(captured_at)) > 1
    )
    SELECT
        query::TEXT,
        first_capture::TIMESTAMPTZ,
        last_capture::TIMESTAMPTZ,
        CASE
            WHEN new_avg > old_avg * 1.2 THEN 'DEGRADING'
            WHEN new_avg < old_avg * 0.8 THEN 'IMPROVING'
            ELSE 'STABLE'
        END::TEXT as trend,
        ROUND(old_avg::numeric, 2),
        ROUND(new_avg::numeric, 2),
        ROUND(((new_avg - old_avg) / NULLIF(old_avg, 0) * 100)::numeric, 2),
        total::BIGINT
    FROM time_windows
    WHERE old_avg IS NOT NULL AND new_avg IS NOT NULL
    ORDER BY ABS(new_avg - old_avg) DESC;
END;
$$;

-- ============================================================================
-- STEP 4: CREATE QUERY ANALYSIS DASHBOARD FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.query_performance_dashboard()
RETURNS TABLE(
    metric_category TEXT,
    metric_name TEXT,
    metric_value TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_queries BIGINT;
    v_total_time NUMERIC;
    v_slowest_query TEXT;
    v_most_frequent TEXT;
BEGIN
    -- Get summary stats
    SELECT
        SUM(calls),
        ROUND(SUM(total_exec_time)::numeric, 2)
    INTO v_total_queries, v_total_time
    FROM pg_stat_statements;

    -- Get slowest query
    SELECT LEFT(query, 100)
    INTO v_slowest_query
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT 1;

    -- Get most frequent query
    SELECT LEFT(query, 100)
    INTO v_most_frequent
    FROM pg_stat_statements
    ORDER BY calls DESC
    LIMIT 1;

    RETURN QUERY
    -- Overall statistics
    SELECT
        'Overall Statistics'::TEXT,
        'Total Queries Tracked'::TEXT,
        v_total_queries::TEXT,
        'Since last reset'::TEXT

    UNION ALL
    SELECT
        'Overall Statistics'::TEXT,
        'Total Execution Time'::TEXT,
        ROUND((v_total_time / 1000 / 60)::numeric, 2) || ' minutes'::TEXT,
        'Cumulative time'::TEXT

    UNION ALL
    SELECT
        'Overall Statistics'::TEXT,
        'Average Query Time'::TEXT,
        ROUND((v_total_time / NULLIF(v_total_queries, 0))::numeric, 2) || ' ms'::TEXT,
        'Across all queries'::TEXT

    UNION ALL

    -- Slow query stats
    SELECT
        'Slow Queries'::TEXT,
        'Queries > 100ms'::TEXT,
        COUNT(*)::TEXT,
        'Need optimization'::TEXT
    FROM pg_stat_statements
    WHERE mean_exec_time > 100

    UNION ALL
    SELECT
        'Slow Queries'::TEXT,
        'Slowest Query'::TEXT,
        ROUND(MAX(mean_exec_time)::numeric, 2) || ' ms'::TEXT,
        v_slowest_query::TEXT
    FROM pg_stat_statements

    UNION ALL

    -- Cache performance
    SELECT
        'Cache Performance'::TEXT,
        'Overall Cache Hit Ratio'::TEXT,
        ROUND((100.0 * SUM(shared_blks_hit) / NULLIF(SUM(shared_blks_hit + shared_blks_read), 0))::numeric, 2) || '%'::TEXT,
        'Higher is better (target >95%)'::TEXT
    FROM pg_stat_statements

    UNION ALL

    -- High frequency
    SELECT
        'Query Patterns'::TEXT,
        'Most Frequent Query'::TEXT,
        MAX(calls)::TEXT || ' calls'::TEXT,
        v_most_frequent::TEXT
    FROM pg_stat_statements

    UNION ALL

    -- Index effectiveness
    SELECT
        'Index Usage'::TEXT,
        'Queries Needing Indexes'::TEXT,
        COUNT(*)::TEXT,
        'Low cache hit + high exec time'::TEXT
    FROM pg_stat_statements
    WHERE mean_exec_time > 50
    AND shared_blks_read > shared_blks_hit * 0.1

    ORDER BY metric_category, metric_name;
END;
$$;

-- ============================================================================
-- STEP 5: CREATE SCHEDULED JOBS
-- ============================================================================

-- Schedule performance snapshot capture (using pg_cron if available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Capture query performance every hour
        PERFORM cron.schedule(
            'capture-query-performance',
            '0 * * * *',
            'SELECT public.capture_query_performance_snapshot();'
        );

        -- Reset stats monthly (optional - removes historical data from pg_stat_statements)
        -- PERFORM cron.schedule(
        --     'reset-query-stats-monthly',
        --     '0 0 1 * *',
        --     'SELECT pg_stat_statements_reset();'
        -- );
    END IF;
END $$;

-- ============================================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to explain a specific query
CREATE OR REPLACE FUNCTION public.explain_query(
    p_query_pattern TEXT
)
RETURNS TABLE(
    query_text TEXT,
    execution_plan TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query TEXT;
    v_plan TEXT;
BEGIN
    -- Find the query
    SELECT query INTO v_query
    FROM pg_stat_statements
    WHERE query LIKE p_query_pattern
    ORDER BY calls DESC
    LIMIT 1;

    IF v_query IS NULL THEN
        RAISE NOTICE 'No query found matching pattern: %', p_query_pattern;
        RETURN;
    END IF;

    -- Get execution plan
    EXECUTE 'EXPLAIN (FORMAT TEXT, ANALYZE FALSE) ' || v_query INTO v_plan;

    RETURN QUERY SELECT v_query::TEXT, v_plan::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT v_query::TEXT, 'Error getting plan: ' || SQLERRM;
END;
$$;

-- Function to reset statistics
CREATE OR REPLACE FUNCTION public.reset_query_statistics()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM pg_stat_statements_reset();
    RETURN 'Query statistics have been reset';
END;
$$;

-- ============================================================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on views and functions
GRANT SELECT ON public.slow_queries TO service_role;
GRANT SELECT ON public.frequent_queries TO service_role;
GRANT SELECT ON public.high_io_queries TO service_role;
GRANT SELECT ON public.missing_indexes TO service_role;
GRANT SELECT ON public.query_performance_history TO service_role;

GRANT EXECUTE ON FUNCTION public.analyze_query_performance_by_table TO service_role;
GRANT EXECUTE ON FUNCTION public.get_query_optimization_recommendations TO service_role;
GRANT EXECUTE ON FUNCTION public.capture_query_performance_snapshot TO service_role;
GRANT EXECUTE ON FUNCTION public.analyze_query_trends TO service_role;
GRANT EXECUTE ON FUNCTION public.query_performance_dashboard TO service_role;
GRANT EXECUTE ON FUNCTION public.explain_query TO service_role;

-- Restrict reset function to admin only
GRANT EXECUTE ON FUNCTION public.reset_query_statistics TO postgres;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON EXTENSION pg_stat_statements IS 'Track execution statistics of all SQL statements';
COMMENT ON VIEW public.slow_queries IS 'Queries with average execution time > 100ms';
COMMENT ON VIEW public.frequent_queries IS 'Most frequently executed queries';
COMMENT ON VIEW public.high_io_queries IS 'Queries with high disk I/O';
COMMENT ON VIEW public.missing_indexes IS 'Queries that might benefit from indexes';
COMMENT ON FUNCTION public.query_performance_dashboard IS 'Comprehensive query performance metrics dashboard';
COMMENT ON FUNCTION public.analyze_query_trends IS 'Analyze query performance trends over time';

-- ============================================================================
-- INITIAL ANALYSIS
-- ============================================================================

-- Show current dashboard
SELECT * FROM public.query_performance_dashboard();

-- Get optimization recommendations
SELECT * FROM public.get_query_optimization_recommendations();

-- Check for slow queries
SELECT * FROM public.slow_queries LIMIT 10;