# Database Monitoring & Analytics Testing Plan

**Test Date:** _____________
**Tester:** _____________
**Environment:** Development / Staging / Production

---

## Pre-Migration Checklist

- [ ] Database backup completed
- [ ] Current database size documented: __________ MB
- [ ] Current connection count documented: __________
- [ ] Supabase project status: ACTIVE_HEALTHY
- [ ] Extensions verified: `pg_stat_statements`, `pgstattuple`
- [ ] Service role credentials available
- [ ] Maintenance window scheduled (if production)

---

## Migration Application Tests

### 1. Database Health Monitoring Migration

**File:** `20251014_database_health_monitoring.sql`

**Pre-Migration:**
```sql
-- Verify extensions
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pg_stat_statements', 'pgstattuple');
```

**Expected:** Both extensions should exist or be created

**Apply Migration:**
```bash
# Apply via Supabase MCP tool or psql
```

**Post-Migration Verification:**
```sql
-- Check monitoring schema exists
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'monitoring';
-- Expected: 1 row

-- Check monitoring views created
SELECT viewname FROM pg_views
WHERE schemaname = 'monitoring';
-- Expected: 10 views

-- Check monitoring functions created
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'monitoring';
-- Expected: 3 functions

-- Test health check function
SELECT count(*) FROM monitoring.health_check_summary();
-- Expected: 6 rows (one per check category)

-- Test alert function
SELECT * FROM monitoring.check_and_alert();
-- Expected: Results or 'OK' status
```

**Result:** ✅ Pass / ❌ Fail
**Notes:** ________________________________________________

---

### 2. Materialized Views for Analytics Migration

**File:** `20251014_materialized_views_analytics.sql`

**Apply Migration:**
```bash
# Apply via Supabase MCP tool or psql
```

**Post-Migration Verification:**
```sql
-- Check materialized views created
SELECT schemaname, matviewname, ispopulated
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname LIKE 'mv_%';
-- Expected: 3 rows (mv_player_lifetime_value, mv_game_performance, mv_campaign_roi)

-- Check refresh function exists
SELECT proname FROM pg_proc
WHERE proname = 'refresh_analytics_materialized_views';
-- Expected: 1 row

-- Test manual refresh
SELECT refresh_analytics_materialized_views();
-- Expected: Success

-- Check data populated
SELECT count(*) FROM mv_player_lifetime_value;
-- Expected: > 0 (equal to user count)

SELECT count(*) FROM mv_game_performance;
-- Expected: > 0 (equal to game count)

SELECT count(*) FROM mv_campaign_roi;
-- Expected: >= 0 (equal to campaign count)
```

**Result:** ✅ Pass / ❌ Fail
**Notes:** ________________________________________________

---

### 3. Partial Indexes Migration

**File:** `20251014_add_partial_status_indexes.sql`

**Pre-Migration Index Count:**
```sql
SELECT count(*) FROM pg_indexes
WHERE schemaname = 'public';
```
**Count:** __________

**Apply Migration:**
```bash
# Apply via Supabase MCP tool or psql
```

**Post-Migration Verification:**
```sql
-- Check partial indexes created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%WHERE%'
ORDER BY tablename, indexname;
-- Expected: 37 partial indexes

-- Check specific indexes exist
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_player_bonuses_status_active',
    'idx_transactions_status_completed',
    'idx_jackpot_tickets_draw_eligible_v2'
  );
-- Expected: 3 rows

-- Test index analysis function
SELECT * FROM analyze_partial_index_savings();
-- Expected: Results showing partial indexes
```

**Result:** ✅ Pass / ❌ Fail
**Notes:** ________________________________________________

---

### 4. Database Comments Migration

**File:** `20251014_add_database_comments.sql`

**Apply Migration:**
```bash
# Apply via Supabase MCP tool or psql
```

**Post-Migration Verification:**
```sql
-- Check table comments added
SELECT count(*)
FROM pg_tables pt
LEFT JOIN pg_description d ON d.objoid = (pt.schemaname||'.'||pt.tablename)::regclass
WHERE pt.schemaname = 'public'
  AND d.description IS NOT NULL;
-- Expected: > 40 tables with comments

-- Check specific table comment
SELECT obj_description('users'::regclass);
-- Expected: Comment text about users table

-- Check column comments added
SELECT count(*)
FROM information_schema.columns c
JOIN pg_class pc ON pc.relname = c.table_name
LEFT JOIN pg_description d ON d.objoid = pc.oid AND d.objsubid = c.ordinal_position
WHERE c.table_schema = 'public'
  AND d.description IS NOT NULL;
-- Expected: > 150 columns with comments
```

**Result:** ✅ Pass / ❌ Fail
**Notes:** ________________________________________________

---

## Functional Testing

### Test 1: Health Monitoring System

#### 1.1 Connection Pool Monitoring
```sql
-- View current connection status
SELECT * FROM monitoring.connection_status;
```
**Expected:** Current connection counts and usage percentage
**Result:** ✅ Pass / ❌ Fail

#### 1.2 Table Bloat Monitoring
```sql
-- Check table bloat detection
SELECT * FROM monitoring.table_bloat
ORDER BY bloat_percentage DESC
LIMIT 5;
```
**Expected:** Tables with bloat percentages and severity
**Result:** ✅ Pass / ❌ Fail

#### 1.3 Slow Query Detection
```sql
-- View slow queries (if any)
SELECT * FROM monitoring.slow_queries
LIMIT 5;
```
**Expected:** Query statistics or empty result
**Result:** ✅ Pass / ❌ Fail

#### 1.4 Missing Index Detection
```sql
-- Check for missing indexes
SELECT * FROM monitoring.missing_indexes
LIMIT 5;
```
**Expected:** Tables with high sequential scan rates
**Result:** ✅ Pass / ❌ Fail

#### 1.5 Database Size Tracking
```sql
-- View current database size
SELECT * FROM monitoring.database_size;
```
**Expected:** Current size in human-readable format
**Result:** ✅ Pass / ❌ Fail

#### 1.6 Health Check History
```sql
-- Run scheduled health check
SELECT monitoring.run_scheduled_health_check();

-- Verify history was recorded
SELECT * FROM monitoring.health_check_history
ORDER BY created_at DESC
LIMIT 5;
```
**Expected:** History records created
**Result:** ✅ Pass / ❌ Fail

---

### Test 2: Materialized Views

#### 2.1 Player Lifetime Value View
```sql
-- Query top 10 players by net revenue
SELECT username, net_revenue, total_deposited, current_tier
FROM mv_player_lifetime_value
ORDER BY net_revenue DESC
LIMIT 10;
```
**Expected:** Player data with calculated metrics
**Result:** ✅ Pass / ❌ Fail

#### 2.2 Player Segmentation
```sql
-- Check player segmentation
SELECT player_value_segment, COUNT(*), AVG(net_revenue)
FROM mv_player_lifetime_value
GROUP BY player_value_segment
ORDER BY player_value_segment;
```
**Expected:** Counts for each segment (WHALE, VIP, etc.)
**Result:** ✅ Pass / ❌ Fail

#### 2.3 Activity Status Distribution
```sql
-- Check activity status distribution
SELECT activity_status, COUNT(*)
FROM mv_player_lifetime_value
GROUP BY activity_status
ORDER BY activity_status;
```
**Expected:** Counts for ACTIVE, DORMANT, AT_RISK, etc.
**Result:** ✅ Pass / ❌ Fail

#### 2.4 Game Performance View
```sql
-- Query top performing games
SELECT game_name, gross_revenue, unique_players, actual_rtp
FROM mv_game_performance
ORDER BY gross_revenue DESC
LIMIT 10;
```
**Expected:** Game performance metrics
**Result:** ✅ Pass / ❌ Fail

#### 2.5 Game Performance Classification
```sql
-- Check performance tier distribution
SELECT performance_tier, COUNT(*), SUM(gross_revenue)
FROM mv_game_performance
GROUP BY performance_tier
ORDER BY performance_tier;
```
**Expected:** Games grouped by performance tier
**Result:** ✅ Pass / ❌ Fail

#### 2.6 Campaign ROI View
```sql
-- Query campaign ROI metrics
SELECT campaign_name, roi_percentage_7d, conversion_rate_7d, effectiveness_rating
FROM mv_campaign_roi
ORDER BY roi_percentage_7d DESC
LIMIT 10;
```
**Expected:** Campaign metrics or empty if no campaigns
**Result:** ✅ Pass / ❌ Fail

#### 2.7 Materialized View Refresh
```sql
-- Test manual refresh
SELECT refresh_analytics_materialized_views();

-- Verify last_calculated_at updated
SELECT last_calculated_at
FROM mv_player_lifetime_value
LIMIT 1;
```
**Expected:** Timestamp should be recent (within seconds)
**Result:** ✅ Pass / ❌ Fail

---

### Test 3: Partial Indexes

#### 3.1 Active Bonus Query Performance
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM player_bonuses
WHERE status = 'active'
LIMIT 100;
```
**Expected:** Index Scan on idx_player_bonuses_status_active
**Result:** ✅ Pass / ❌ Fail
**Execution Time:** __________ ms

#### 3.2 Eligible Jackpot Ticket Query
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM jackpot_tickets
WHERE draw_eligible = true
LIMIT 100;
```
**Expected:** Index Scan on idx_jackpot_tickets_draw_eligible_v2
**Result:** ✅ Pass / ❌ Fail
**Execution Time:** __________ ms

#### 3.3 Open Support Tickets Query
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM support_tickets
WHERE status = 'open'
LIMIT 100;
```
**Expected:** Index Scan on idx_support_tickets_status_open
**Result:** ✅ Pass / ❌ Fail
**Execution Time:** __________ ms

#### 3.4 Recent Completed Transactions
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM transactions
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '7 days'
LIMIT 100;
```
**Expected:** Index Scan on partial index
**Result:** ✅ Pass / ❌ Fail
**Execution Time:** __________ ms

#### 3.5 Index Usage Statistics
```sql
-- Check partial index usage after running queries
SELECT indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE indexname LIKE '%status%'
  AND schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 10;
```
**Expected:** idx_scan > 0 for recently used indexes
**Result:** ✅ Pass / ❌ Fail

---

### Test 4: Database Comments

#### 4.1 View Table Comments
```sql
-- Check users table comment
SELECT obj_description('users'::regclass);
```
**Expected:** Descriptive comment about users table
**Result:** ✅ Pass / ❌ Fail

#### 4.2 View Column Comments
```sql
-- Check column comments for transactions table
SELECT
    column_name,
    col_description('transactions'::regclass::oid, ordinal_position) AS comment
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
  AND col_description('transactions'::regclass::oid, ordinal_position) IS NOT NULL
ORDER BY ordinal_position;
```
**Expected:** Multiple columns with descriptive comments
**Result:** ✅ Pass / ❌ Fail

#### 4.3 View Function Comments
```sql
-- Check monitoring function comments
SELECT
    proname,
    obj_description(oid) AS comment
FROM pg_proc
WHERE pronamespace = 'monitoring'::regnamespace
  AND obj_description(oid) IS NOT NULL;
```
**Expected:** Function descriptions
**Result:** ✅ Pass / ❌ Fail

---

## Performance Testing

### Benchmark 1: Dashboard Query Performance

#### Before Materialized Views (Baseline)
```sql
-- Complex player analytics query
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    u.id,
    u.username,
    COUNT(DISTINCT t.id) FILTER (WHERE t.transaction_type = 'deposit') AS deposits,
    SUM(t.amount) FILTER (WHERE t.transaction_type = 'deposit') AS total_deposited,
    COUNT(DISTINCT gr.id) AS total_bets
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'completed'
LEFT JOIN game_rounds gr ON u.id = gr.user_id AND gr.status = 'completed'
GROUP BY u.id, u.username
LIMIT 100;
```
**Execution Time:** __________ ms

#### After Materialized Views
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, username, total_deposit_count, total_deposited, total_bets_placed
FROM mv_player_lifetime_value
LIMIT 100;
```
**Execution Time:** __________ ms
**Improvement:** __________x faster

---

### Benchmark 2: Game Analytics Performance

#### Before Materialized Views
```sql
-- Complex game performance query
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    g.id,
    g.game_name,
    COUNT(DISTINCT gr.user_id) AS unique_players,
    SUM(gr.bet_amount) AS total_wagered,
    SUM(gr.win_amount) AS total_won
FROM games g
LEFT JOIN game_rounds gr ON g.id = gr.game_id AND gr.status = 'completed'
GROUP BY g.id, g.game_name
ORDER BY SUM(gr.bet_amount) DESC
LIMIT 20;
```
**Execution Time:** __________ ms

#### After Materialized Views
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT game_id, game_name, unique_players, total_wagered, total_won
FROM mv_game_performance
ORDER BY total_wagered DESC
LIMIT 20;
```
**Execution Time:** __________ ms
**Improvement:** __________x faster

---

### Benchmark 3: Index Efficiency

#### Measure Index Size Reduction
```sql
-- Full index size (hypothetical)
SELECT pg_size_pretty(pg_relation_size('idx_player_bonuses_status'));

-- Partial index size
SELECT pg_size_pretty(pg_relation_size('idx_player_bonuses_status_active'));
```
**Size Reduction:** __________%

---

## Stress Testing

### Test 1: Concurrent Health Checks
```bash
# Run 10 concurrent health checks
for i in {1..10}; do
  psql -c "SELECT monitoring.health_check_summary();" &
done
wait
```
**Result:** ✅ Pass / ❌ Fail
**Notes:** ________________________________________________

### Test 2: Concurrent MV Refreshes
```bash
# Test concurrent refresh requests (should queue, not fail)
for i in {1..5}; do
  psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_player_lifetime_value;" &
done
wait
```
**Result:** ✅ Pass / ❌ Fail
**Notes:** ________________________________________________

---

## Rollback Testing

### Test Rollback Procedure
```sql
-- Document rollback steps if needed
-- DROP MATERIALIZED VIEW mv_player_lifetime_value;
-- DROP MATERIALIZED VIEW mv_game_performance;
-- DROP MATERIALIZED VIEW mv_campaign_roi;
-- DROP SCHEMA monitoring CASCADE;
-- DROP INDEX CONCURRENTLY idx_player_bonuses_status_active;
-- ... (other partial indexes)
```

**Rollback Tested:** ✅ Yes / ❌ No
**Rollback Successful:** ✅ Yes / ❌ No

---

## Post-Migration Checklist

- [ ] All 4 migrations applied successfully
- [ ] All monitoring views return data
- [ ] Health check functions work correctly
- [ ] Materialized views populated with data
- [ ] Partial indexes created and being used
- [ ] Database comments visible in psql
- [ ] Performance benchmarks show improvement
- [ ] No errors in database logs
- [ ] Scheduled refresh configured (if applicable)
- [ ] Monitoring dashboard updated (if applicable)
- [ ] Team trained on new monitoring tools
- [ ] Documentation distributed to team

---

## Known Issues and Workarounds

### Issue 1: Materialized View Refresh Locks
**Issue:** Refresh without CONCURRENTLY causes read locks
**Workaround:** Always use CONCURRENTLY or schedule during off-peak
**Status:** ________________________________________________

### Issue 2: Large Materialized View Size
**Issue:** MVs consume significant disk space
**Workaround:** Monitor database size, consider refresh frequency
**Status:** ________________________________________________

---

## Sign-Off

**Tester:** _________________________ **Date:** _____________

**Reviewer:** _________________________ **Date:** _____________

**Approved for Production:** ✅ Yes / ❌ No

**Notes:** ________________________________________________
________________________________________________
________________________________________________