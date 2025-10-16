-- Backup Integrity Verification Script for MyPokies Platform
-- Run this monthly to verify backup quality and data integrity
-- Project: hupruyttzgeytlysobar (MyPokies on Supabase Pro)

-- ============================================================================
-- SECTION 1: DATABASE SIZE ANALYSIS
-- ============================================================================

-- Overall database metrics
SELECT
  '=== DATABASE SIZE METRICS ===' AS section,
  pg_size_pretty(pg_database_size(current_database())) AS database_size,
  pg_database_size(current_database()) / 1024 / 1024 AS size_mb,
  ROUND((pg_database_size(current_database()) / 1024.0 / 1024.0 / 1024.0), 2) AS size_gb;

-- Table sizes for critical tables (helps estimate recovery time)
SELECT
  '=== CRITICAL TABLE SIZES ===' AS section,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'transactions',
    'user_balances',
    'player_bonuses',
    'game_rounds',
    'player_sessions',
    'admin_audit_logs'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Growth rate analysis (compare with last month)
WITH current_sizes AS (
  SELECT
    'users' AS table_name, COUNT(*) AS record_count FROM users
  UNION ALL
  SELECT 'transactions', COUNT(*) FROM transactions
  UNION ALL
  SELECT 'user_balances', COUNT(*) FROM user_balances
  UNION ALL
  SELECT 'player_bonuses', COUNT(*) FROM player_bonuses
  UNION ALL
  SELECT 'game_rounds', COUNT(*) FROM game_rounds
)
SELECT
  '=== RECORD COUNTS ===' AS section,
  table_name,
  record_count,
  ROUND(record_count / 1000000.0, 2) AS millions
FROM current_sizes
ORDER BY record_count DESC;

-- ============================================================================
-- SECTION 2: DATA FRESHNESS VERIFICATION
-- ============================================================================

-- Verify critical tables have recent data (detect stale backups)
WITH table_freshness AS (
  SELECT
    'users' AS table_name,
    COUNT(*) AS total_records,
    MAX(created_at) AS most_recent_record,
    NOW() - MAX(created_at) AS time_since_last_insert,
    CASE
      WHEN NOW() - MAX(created_at) > INTERVAL '24 hours' THEN 'WARNING'
      WHEN NOW() - MAX(created_at) > INTERVAL '1 hour' THEN 'CHECK'
      ELSE 'OK'
    END AS status
  FROM users

  UNION ALL

  SELECT
    'transactions',
    COUNT(*),
    MAX(created_at),
    NOW() - MAX(created_at),
    CASE
      WHEN NOW() - MAX(created_at) > INTERVAL '1 hour' THEN 'WARNING'
      WHEN NOW() - MAX(created_at) > INTERVAL '15 minutes' THEN 'CHECK'
      ELSE 'OK'
    END
  FROM transactions

  UNION ALL

  SELECT
    'player_sessions',
    COUNT(*),
    MAX(created_at),
    NOW() - MAX(created_at),
    CASE
      WHEN NOW() - MAX(created_at) > INTERVAL '1 hour' THEN 'WARNING'
      WHEN NOW() - MAX(created_at) > INTERVAL '30 minutes' THEN 'CHECK'
      ELSE 'OK'
    END
  FROM player_sessions

  UNION ALL

  SELECT
    'game_rounds',
    COUNT(*),
    MAX(created_at),
    NOW() - MAX(created_at),
    CASE
      WHEN NOW() - MAX(created_at) > INTERVAL '1 hour' THEN 'WARNING'
      WHEN NOW() - MAX(created_at) > INTERVAL '15 minutes' THEN 'CHECK'
      ELSE 'OK'
    END
  FROM game_rounds

  UNION ALL

  SELECT
    'player_bonuses',
    COUNT(*),
    MAX(created_at),
    NOW() - MAX(created_at),
    CASE
      WHEN NOW() - MAX(created_at) > INTERVAL '24 hours' THEN 'WARNING'
      WHEN NOW() - MAX(created_at) > INTERVAL '6 hours' THEN 'CHECK'
      ELSE 'OK'
    END
  FROM player_bonuses
)
SELECT
  '=== DATA FRESHNESS CHECK ===' AS section,
  table_name,
  total_records,
  most_recent_record,
  EXTRACT(EPOCH FROM time_since_last_insert)/3600 AS hours_since_insert,
  status
FROM table_freshness
ORDER BY
  CASE status
    WHEN 'WARNING' THEN 1
    WHEN 'CHECK' THEN 2
    ELSE 3
  END;

-- ============================================================================
-- SECTION 3: DATA INTEGRITY CHECKS
-- ============================================================================

-- Check for data anomalies that might indicate corruption or issues
WITH integrity_checks AS (
  -- Check 1: Negative balances (should never happen)
  SELECT
    'Negative balances' AS check_name,
    COUNT(*) AS issue_count,
    'CRITICAL' AS severity,
    STRING_AGG(CAST(user_id AS TEXT), ', ' ORDER BY user_id LIMIT 10) AS sample_ids
  FROM user_balances
  WHERE balance < 0

  UNION ALL

  -- Check 2: Orphaned transactions (transactions without valid user)
  SELECT
    'Orphaned transactions',
    COUNT(*),
    'HIGH',
    STRING_AGG(CAST(t.id AS TEXT), ', ' ORDER BY t.id LIMIT 10)
  FROM transactions t
  LEFT JOIN users u ON t.user_id = u.id
  WHERE u.id IS NULL

  UNION ALL

  -- Check 3: Future dated records (indicates time sync issues)
  SELECT
    'Future dated transactions',
    COUNT(*),
    'MEDIUM',
    STRING_AGG(CAST(id AS TEXT), ', ' ORDER BY id LIMIT 10)
  FROM transactions
  WHERE created_at > NOW() + INTERVAL '5 minutes'

  UNION ALL

  -- Check 4: Orphaned bonuses (bonuses without valid user)
  SELECT
    'Orphaned bonuses',
    COUNT(*),
    'HIGH',
    STRING_AGG(CAST(pb.id AS TEXT), ', ' ORDER BY pb.id LIMIT 10)
  FROM player_bonuses pb
  LEFT JOIN users u ON pb.user_id = u.id
  WHERE u.id IS NULL

  UNION ALL

  -- Check 5: Duplicate user emails (violates uniqueness)
  SELECT
    'Duplicate user emails',
    COUNT(*),
    'CRITICAL',
    STRING_AGG(email, ', ' ORDER BY email LIMIT 10)
  FROM (
    SELECT email, COUNT(*) as cnt
    FROM users
    GROUP BY email
    HAVING COUNT(*) > 1
  ) dupes

  UNION ALL

  -- Check 6: Balance mismatches (calculated vs stored)
  SELECT
    'Balance discrepancies',
    COUNT(*),
    'CRITICAL',
    STRING_AGG(CAST(user_id AS TEXT), ', ' ORDER BY user_id LIMIT 10)
  FROM (
    SELECT
      ub.user_id,
      ub.balance AS stored_balance,
      COALESCE(SUM(
        CASE
          WHEN t.type IN ('deposit', 'bonus_credit', 'win') THEN t.amount
          WHEN t.type IN ('withdrawal', 'bet', 'bonus_debit') THEN -t.amount
          ELSE 0
        END
      ), 0) AS calculated_balance
    FROM user_balances ub
    LEFT JOIN transactions t ON ub.user_id = t.user_id
    GROUP BY ub.user_id, ub.balance
    HAVING ABS(ub.balance - COALESCE(SUM(
      CASE
        WHEN t.type IN ('deposit', 'bonus_credit', 'win') THEN t.amount
        WHEN t.type IN ('withdrawal', 'bet', 'bonus_debit') THEN -t.amount
        ELSE 0
      END
    ), 0)) > 0.01
  ) mismatches

  UNION ALL

  -- Check 7: Invalid game round states
  SELECT
    'Invalid game rounds',
    COUNT(*),
    'MEDIUM',
    STRING_AGG(CAST(id AS TEXT), ', ' ORDER BY id LIMIT 10)
  FROM game_rounds
  WHERE status NOT IN ('pending', 'active', 'completed', 'cancelled', 'error')

  UNION ALL

  -- Check 8: Sessions without end time (older than 24 hours)
  SELECT
    'Stale open sessions',
    COUNT(*),
    'LOW',
    STRING_AGG(CAST(id AS TEXT), ', ' ORDER BY id LIMIT 10)
  FROM player_sessions
  WHERE ended_at IS NULL
    AND created_at < NOW() - INTERVAL '24 hours'
)
SELECT
  '=== INTEGRITY CHECK RESULTS ===' AS section,
  check_name,
  issue_count,
  severity,
  CASE
    WHEN issue_count > 0 THEN 'FAILED - Investigate: ' || COALESCE(sample_ids, 'Check details')
    ELSE 'PASSED'
  END AS result
FROM integrity_checks
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    ELSE 4
  END,
  issue_count DESC;

-- ============================================================================
-- SECTION 4: REFERENTIAL INTEGRITY VERIFICATION
-- ============================================================================

-- Check foreign key relationships
WITH fk_checks AS (
  SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    CASE
      WHEN NOT convalidated THEN 'NOT VALIDATED'
      ELSE 'VALIDATED'
    END AS status
  FROM pg_constraint
  WHERE contype = 'f'
    AND connamespace = 'public'::regnamespace
)
SELECT
  '=== FOREIGN KEY INTEGRITY ===' AS section,
  constraint_name,
  table_name,
  referenced_table,
  status
FROM fk_checks
WHERE status = 'NOT VALIDATED'
LIMIT 20;

-- ============================================================================
-- SECTION 5: SEQUENCE HEALTH CHECK
-- ============================================================================

-- Verify sequences haven't been corrupted or reset
WITH sequence_check AS (
  SELECT
    sequencename,
    last_value,
    CASE
      WHEN sequencename LIKE '%_id_seq' THEN
        CASE
          WHEN last_value < 1 THEN 'ERROR: Negative/Zero value'
          WHEN last_value > 9223372036854775807 / 2 THEN 'WARNING: Approaching max value'
          ELSE 'OK'
        END
      ELSE 'OK'
    END AS status
  FROM pg_sequences
  WHERE schemaname = 'public'
)
SELECT
  '=== SEQUENCE HEALTH ===' AS section,
  sequencename,
  last_value,
  status
FROM sequence_check
WHERE status != 'OK'
LIMIT 20;

-- ============================================================================
-- SECTION 6: INDEX HEALTH CHECK
-- ============================================================================

-- Check for invalid or bloated indexes
SELECT
  '=== INDEX HEALTH ===' AS section,
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS scans_count,
  CASE
    WHEN idx_scan = 0 AND pg_relation_size(indexrelid) > 1048576 THEN 'UNUSED - Consider dropping'
    WHEN pg_relation_size(indexrelid) > pg_relation_size(indrelid) THEN 'BLOATED - Consider rebuild'
    ELSE 'OK'
  END AS status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (idx_scan = 0 OR pg_relation_size(indexrelid) > pg_relation_size(indrelid))
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- ============================================================================
-- SECTION 7: BACKUP READINESS SCORE
-- ============================================================================

-- Calculate overall backup readiness score
WITH scores AS (
  SELECT
    -- Data freshness score (max 25 points)
    CASE
      WHEN (SELECT MAX(NOW() - created_at) FROM transactions) < INTERVAL '1 hour' THEN 25
      WHEN (SELECT MAX(NOW() - created_at) FROM transactions) < INTERVAL '6 hours' THEN 15
      ELSE 5
    END AS freshness_score,

    -- Integrity score (max 50 points)
    CASE
      WHEN (SELECT COUNT(*) FROM user_balances WHERE balance < 0) = 0 THEN 50
      WHEN (SELECT COUNT(*) FROM user_balances WHERE balance < 0) < 10 THEN 25
      ELSE 0
    END AS integrity_score,

    -- Size score (max 25 points - smaller is better for recovery time)
    CASE
      WHEN pg_database_size(current_database()) < 10737418240 THEN 25  -- < 10GB
      WHEN pg_database_size(current_database()) < 107374182400 THEN 15 -- < 100GB
      ELSE 5
    END AS size_score
)
SELECT
  '=== BACKUP READINESS SCORE ===' AS section,
  freshness_score,
  integrity_score,
  size_score,
  (freshness_score + integrity_score + size_score) AS total_score,
  CASE
    WHEN (freshness_score + integrity_score + size_score) >= 90 THEN 'EXCELLENT - Ready for backup'
    WHEN (freshness_score + integrity_score + size_score) >= 70 THEN 'GOOD - Minor issues to address'
    WHEN (freshness_score + integrity_score + size_score) >= 50 THEN 'FAIR - Review issues before backup'
    ELSE 'POOR - Critical issues need resolution'
  END AS assessment
FROM scores;

-- ============================================================================
-- SECTION 8: RECOMMENDATIONS
-- ============================================================================

SELECT '=== VERIFICATION COMPLETE ===' AS status, NOW() AS completed_at;

-- Summary recommendations based on checks
SELECT
  '=== RECOMMENDED ACTIONS ===' AS section,
  CASE
    WHEN EXISTS (SELECT 1 FROM user_balances WHERE balance < 0)
      THEN '1. CRITICAL: Fix negative balances immediately'
    ELSE NULL
  END AS action_1,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE u.id IS NULL
    )
      THEN '2. HIGH: Clean up orphaned transactions'
    ELSE NULL
  END AS action_2,
  CASE
    WHEN pg_database_size(current_database()) > 107374182400
      THEN '3. MEDIUM: Consider archiving old data (DB > 100GB)'
    ELSE NULL
  END AS action_3;

-- End of verification script
-- Next run due: [Monthly - same date next month]