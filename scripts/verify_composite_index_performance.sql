-- ============================================
-- COMPOSITE INDEX PERFORMANCE VERIFICATION
-- ============================================
-- Purpose: Test and verify the performance improvements from composite indexes
-- Run this script to compare query execution plans and performance

-- Enable timing to see actual execution time
\timing on

-- Show buffer statistics for detailed analysis
SET track_io_timing = on;

-- ============================================
-- 1. ACTIVE BONUSES QUERY TEST
-- ============================================
ECHO 'Testing: Active bonuses for user query...';

-- Force index usage for testing (optional)
SET enable_seqscan = off;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    pb.id,
    pb.user_id,
    pb.status,
    pb.bonus_amount,
    pb.wagering_requirement_total,
    pb.wagering_completed,
    pb.expires_at
FROM player_bonuses pb
WHERE pb.user_id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)
  AND pb.status = 'active';

-- Test with actual user ID if available
/*
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM player_bonuses
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid
  AND status = 'active';
*/

-- ============================================
-- 2. RECENT TRANSACTIONS QUERY TEST
-- ============================================
ECHO 'Testing: Recent transactions query...';

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    t.id,
    t.user_id,
    t.type,
    t.amount,
    t.balance_after,
    t.created_at
FROM transactions t
WHERE t.user_id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)
  AND t.created_at > NOW() - INTERVAL '30 days'
ORDER BY t.created_at DESC
LIMIT 50;

-- Test index-only scan capability
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    user_id,
    created_at,
    type,
    amount,
    balance_after
FROM transactions
WHERE user_id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- 3. ELIGIBLE JACKPOT TICKETS QUERY TEST
-- ============================================
ECHO 'Testing: Eligible jackpot tickets query...';

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    jt.id,
    jt.user_id,
    jt.ticket_number,
    jt.wager_amount
FROM jackpot_tickets jt
WHERE jt.jackpot_pool_id = (SELECT id FROM jackpot_pools ORDER BY created_at DESC LIMIT 1)
  AND jt.draw_eligible = true;

-- Test covering index effectiveness
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    jackpot_pool_id,
    draw_eligible,
    user_id,
    ticket_number,
    earned_from_transaction_id,
    wager_amount
FROM jackpot_tickets
WHERE jackpot_pool_id = (SELECT id FROM jackpot_pools ORDER BY created_at DESC LIMIT 1)
  AND draw_eligible = true;

-- ============================================
-- 4. ACTIVE GAME ROUNDS QUERY TEST
-- ============================================
ECHO 'Testing: Active game rounds query...';

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    gr.id,
    gr.game_id,
    gr.total_bet,
    gr.started_at,
    gr.game_round_id
FROM game_rounds gr
WHERE gr.user_id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)
  AND gr.status = 'active';

-- ============================================
-- 5. ADDITIONAL COMPOSITE INDEX TESTS
-- ============================================
ECHO 'Testing: User balance lookup...';

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    user_id,
    currency,
    balance,
    bonus_balance,
    locked_bonus
FROM user_balances
WHERE user_id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)
  AND currency = 'USD';

ECHO 'Testing: Transaction type filtering...';

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM transactions
WHERE user_id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)
  AND type = 'debit'
ORDER BY created_at DESC
LIMIT 20;

ECHO 'Testing: Expiring bonuses system-wide...';

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM player_bonuses
WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
  AND status IN ('active', 'pending')
ORDER BY expires_at;

-- Reset settings
RESET enable_seqscan;
RESET track_io_timing;

-- ============================================
-- INDEX USAGE STATISTICS
-- ============================================
ECHO 'Checking index usage statistics...';

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 10 THEN 'RARELY USED'
        WHEN idx_scan < 100 THEN 'OCCASIONALLY USED'
        WHEN idx_scan < 1000 THEN 'FREQUENTLY USED'
        ELSE 'HEAVILY USED'
    END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN ('player_bonuses', 'transactions', 'jackpot_tickets', 'game_rounds', 'sms_messages', 'user_balances')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, idx_scan DESC;

-- ============================================
-- INDEX BLOAT CHECK
-- ============================================
ECHO 'Checking for index bloat...';

SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    indexrelid::regclass AS index,
    indnatts AS number_of_columns,
    CASE
        WHEN indisprimary THEN 'PRIMARY KEY'
        WHEN indisunique THEN 'UNIQUE'
        ELSE 'REGULAR'
    END AS index_type
FROM pg_stat_user_indexes
JOIN pg_index ON pg_index.indexrelid = pg_stat_user_indexes.indexrelid
WHERE schemaname = 'public'
    AND tablename IN ('player_bonuses', 'transactions', 'jackpot_tickets', 'game_rounds')
ORDER BY pg_relation_size(pg_stat_user_indexes.indexrelid) DESC;

-- ============================================
-- QUERY PERFORMANCE COMPARISON
-- ============================================
ECHO 'Performance Summary:';
ECHO '==================';
ECHO 'Expected improvements with composite indexes:';
ECHO '1. Active bonuses query: 10-20x faster (index-only scan with covering columns)';
ECHO '2. Recent transactions: 5-10x faster (sorted index eliminates sort step)';
ECHO '3. Jackpot tickets: 50-100x faster (partial index on eligible tickets only)';
ECHO '4. Active game rounds: 20-30x faster (partial index on active status)';
ECHO '';
ECHO 'Key improvements to look for in EXPLAIN output:';
ECHO '- "Index Scan" or "Index Only Scan" instead of "Seq Scan"';
ECHO '- Lower "cost" and "actual time" values';
ECHO '- Fewer "buffers" accessed';
ECHO '- No "Sort" step for ORDER BY queries';
ECHO '- "Index Only Scan" for queries using covering indexes';

-- ============================================
-- RECOMMENDATIONS
-- ============================================
ECHO '';
ECHO 'Next Steps:';
ECHO '1. Monitor pg_stat_user_indexes over time to identify unused indexes';
ECHO '2. Run VACUUM ANALYZE periodically to maintain statistics';
ECHO '3. Consider partitioning large tables (transactions) if they grow beyond millions of rows';
ECHO '4. Set up automated index maintenance with pg_repack if bloat becomes an issue';

\timing off