-- ============================================================================
-- TEST SCRIPT FOR ARCHIVAL STRATEGY
-- ============================================================================
-- Run this script to test the archival functionality
-- ============================================================================

-- 1. Check current table sizes and row counts
SELECT * FROM archive.get_archival_stats();

-- 2. Check oldest records in each table
SELECT 'callback_logs' as table_name, MIN(created_at) as oldest_record, COUNT(*) as total_records
FROM public.callback_logs
UNION ALL
SELECT 'transactions', MIN(created_at), COUNT(*)
FROM public.transactions
UNION ALL
SELECT 'game_rounds', MIN(started_at), COUNT(*)
FROM public.game_rounds;

-- 3. Run a test archival for callback_logs (archive records older than 90 days)
SELECT * FROM archive.archive_callback_logs(90, 100); -- Archive 100 records as a test

-- 4. Check archive batch results
SELECT * FROM archive.archive_batches
ORDER BY started_at DESC
LIMIT 5;

-- 5. Verify data was moved to archive
SELECT
    'Current' as location,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM public.callback_logs
UNION ALL
SELECT
    'Archived',
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM archive.callback_logs;

-- 6. Test the unified view (should show both current and archived data)
SELECT
    data_location,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM public.callback_logs_recent
GROUP BY data_location;

-- 7. Test a full archival run (all tables)
-- Uncomment to run:
-- SELECT * FROM archive.run_full_archival(90);

-- 8. Monitor table size reduction
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'archive')
AND tablename IN ('callback_logs', 'transactions', 'game_rounds', 'round_actions')
ORDER BY schemaname, tablename;

-- 9. Test data restoration (restore last 7 days of archived callback_logs)
-- Uncomment to test:
-- SELECT archive.restore_archived_data(
--     'callback_logs',
--     NOW() - INTERVAL '7 days',
--     NOW(),
--     NULL
-- );

-- 10. Check scheduled jobs
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
WHERE command LIKE '%archive%';

-- Expected results:
-- - Tables should show reduced row counts after archival
-- - Archive tables should contain the moved data
-- - Unified views should show both current and archived data
-- - Table sizes should be significantly reduced (70-80% for old data)
-- - Scheduled jobs should be active and configured correctly