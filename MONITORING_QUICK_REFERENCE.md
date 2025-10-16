# Database Monitoring Quick Reference Guide

Quick commands and queries for daily database monitoring and maintenance.

---

## Health Check Commands

### Quick Health Overview
```sql
-- Get current health status across all checks
SELECT * FROM monitoring.health_check_summary();
```

### Check for Critical Alerts
```sql
-- Show only critical and warning alerts
SELECT * FROM monitoring.check_and_alert()
WHERE alert_level IN ('CRITICAL', 'WARNING');
```

### View Health History
```sql
-- Health checks from last 24 hours
SELECT check_name, status, severity, details, created_at
FROM monitoring.health_check_history
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Connection Pool Monitoring

### Current Connection Status
```sql
SELECT * FROM monitoring.connection_status;
```

### Active Connections by User
```sql
SELECT usename, count(*) as connection_count, state
FROM pg_stat_activity
WHERE pid != pg_backend_pid()
GROUP BY usename, state
ORDER BY connection_count DESC;
```

### Kill Idle Connections (if needed)
```sql
-- Terminate idle connections over 1 hour old
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '1 hour'
  AND pid != pg_backend_pid();
```

---

## Table Bloat Monitoring

### Tables with Highest Bloat
```sql
SELECT schemaname, tablename, table_size_mb, bloat_percentage, bloat_severity
FROM monitoring.table_bloat
WHERE bloat_percentage > 20
ORDER BY bloat_percentage DESC
LIMIT 10;
```

### Vacuum Table with High Bloat
```sql
-- Manually vacuum a specific table
VACUUM (ANALYZE, VERBOSE) table_name;

-- Full vacuum (locks table, use during maintenance window)
VACUUM FULL table_name;
```

---

## Index Health Monitoring

### Indexes with Highest Bloat
```sql
SELECT schemaname, table_name, index_name, index_size_mb, bloat_percentage
FROM monitoring.index_bloat
WHERE bloat_percentage > 30
ORDER BY bloat_percentage DESC
LIMIT 10;
```

### Reindex Bloated Index
```sql
-- Reindex concurrently (no locking)
REINDEX INDEX CONCURRENTLY index_name;

-- Reindex table (during maintenance window)
REINDEX TABLE table_name;
```

### Unused Indexes
```sql
-- Find indexes that are never used
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

---

## Slow Query Monitoring

### Top 10 Slowest Queries
```sql
SELECT query_preview, mean_exec_time_ms, calls, total_exec_time_ms
FROM monitoring.slow_queries
ORDER BY mean_exec_time_ms DESC
LIMIT 10;
```

### Currently Running Slow Queries
```sql
SELECT * FROM monitoring.long_running_queries;
```

### Kill Long Running Query (if needed)
```sql
-- Terminate a specific query by PID
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid = <specific_pid>;
```

---

## Missing Index Detection

### Tables Needing Indexes
```sql
SELECT schemaname, tablename, seq_scan, idx_scan, index_recommendation
FROM monitoring.missing_indexes
WHERE index_recommendation LIKE 'CRITICAL%' OR index_recommendation LIKE 'HIGH%'
ORDER BY seq_scan DESC;
```

### Create Index Based on Recommendation
```sql
-- Example: Add composite index for common query pattern
CREATE INDEX CONCURRENTLY idx_table_column1_column2
ON table_name(column1, column2);
```

---

## Database Size Monitoring

### Current Database Size
```sql
SELECT * FROM monitoring.database_size;
```

### Largest Tables by Size
```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### Table Row Counts
```sql
SELECT
    schemaname,
    tablename,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

---

## Autovacuum Monitoring

### Tables Needing Vacuum
```sql
SELECT schemaname, tablename, n_dead_tup, dead_tuple_percentage, vacuum_recommendation
FROM monitoring.autovacuum_status
WHERE vacuum_recommendation != 'OK'
ORDER BY n_dead_tup DESC;
```

### Vacuum History
```sql
SELECT schemaname, tablename, last_vacuum, last_autovacuum, vacuum_count, autovacuum_count
FROM pg_stat_user_tables
ORDER BY last_autovacuum DESC NULLS LAST;
```

### Force Vacuum on High Dead Tuple Table
```sql
-- Aggressive vacuum for table with many dead tuples
VACUUM (ANALYZE, VERBOSE) table_name;
```

---

## Lock Monitoring

### Current Blocking Locks
```sql
SELECT * FROM monitoring.blocking_locks;
```

### All Current Locks
```sql
SELECT
    locktype,
    database,
    relation::regclass AS table,
    mode,
    granted,
    pid
FROM pg_locks
WHERE NOT granted
ORDER BY pid;
```

---

## Materialized View Management

### Check Materialized View Status
```sql
-- View all materialized views and their population status
SELECT schemaname, matviewname, ispopulated
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
```

### Manually Refresh All Analytics Views
```sql
-- Refresh all analytics materialized views
SELECT refresh_analytics_materialized_views();
```

### Refresh Individual View
```sql
-- Refresh specific view concurrently (no locking)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_player_lifetime_value;
```

### View Refresh History
```sql
SELECT details->>'views_refreshed', details->>'refreshed_at', created_at
FROM monitoring.health_check_history
WHERE check_name = 'Materialized Views Refresh'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Partial Index Analysis

### View Partial Index Efficiency
```sql
SELECT * FROM analyze_partial_index_savings();
```

### Index Usage Statistics
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%status%'
ORDER BY idx_scan DESC;
```

---

## Analytics Dashboard Queries

### Top 10 Players by Revenue
```sql
SELECT username, email, net_revenue, total_deposited, current_tier
FROM mv_player_lifetime_value
ORDER BY net_revenue DESC
LIMIT 10;
```

### At-Risk VIP Players
```sql
SELECT username, email, phone, days_since_last_bet, total_deposited
FROM mv_player_lifetime_value
WHERE activity_status = 'AT_RISK'
  AND player_value_segment IN ('VIP', 'WHALE')
ORDER BY total_deposited DESC;
```

### Top Performing Games
```sql
SELECT game_name, game_provider, gross_revenue, unique_players, actual_rtp
FROM mv_game_performance
WHERE performance_tier IN ('TOP_PERFORMER', 'HIGH_PERFORMER')
ORDER BY gross_revenue DESC
LIMIT 20;
```

### Underperforming Games
```sql
SELECT game_name, game_provider, unique_players, total_wagered, popularity_status
FROM mv_game_performance
WHERE is_active = true
  AND performance_tier = 'LOW_PERFORMER'
ORDER BY last_played_at DESC;
```

### Best ROI Marketing Campaigns
```sql
SELECT
    campaign_name,
    campaign_type,
    roi_percentage_7d,
    conversion_rate_7d,
    total_deposits_7d,
    effectiveness_rating
FROM mv_campaign_roi
WHERE effectiveness_rating IN ('EXCELLENT', 'GOOD')
ORDER BY roi_percentage_7d DESC;
```

### Player Segmentation Breakdown
```sql
SELECT
    player_value_segment,
    COUNT(*) AS player_count,
    SUM(net_revenue) AS total_revenue,
    AVG(net_revenue) AS avg_revenue_per_player,
    SUM(total_deposited) AS total_deposits
FROM mv_player_lifetime_value
GROUP BY player_value_segment
ORDER BY total_revenue DESC;
```

---

## Scheduled Maintenance Commands

### Daily Health Check
```sql
-- Run and review daily health check
SELECT * FROM monitoring.health_check_summary()
WHERE status != 'OK';
```

### Weekly Performance Review
```sql
-- Review slow queries from past week
SELECT query_preview, mean_exec_time_ms, calls
FROM monitoring.slow_queries
WHERE mean_exec_time_ms > 1000
ORDER BY mean_exec_time_ms DESC;

-- Check table bloat trends
SELECT schemaname, tablename, bloat_percentage
FROM monitoring.table_bloat
WHERE bloat_percentage > 20;
```

### Monthly Cleanup Tasks
```sql
-- Clean up old health check history (keep last 30 days)
DELETE FROM monitoring.health_check_history
WHERE created_at < NOW() - INTERVAL '30 days';

-- Reindex heavily used indexes
REINDEX INDEX CONCURRENTLY idx_transactions_status_completed;
REINDEX INDEX CONCURRENTLY idx_player_bonuses_status_active;
```

---

## Emergency Procedures

### Database Running Out of Space
```bash
# 1. Check current size
SELECT * FROM monitoring.database_size;

# 2. Identify large tables
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;

# 3. Run archival if configured
SELECT archive_old_data();

# 4. Vacuum to reclaim space
VACUUM FULL;
```

### Too Many Connections
```sql
-- 1. Check connection status
SELECT * FROM monitoring.connection_status;

-- 2. View connections by application
SELECT application_name, count(*), state
FROM pg_stat_activity
GROUP BY application_name, state;

-- 3. Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '30 minutes';
```

### Blocking Locks Issue
```sql
-- 1. Find blocking queries
SELECT * FROM monitoring.blocking_locks;

-- 2. Kill blocking query if needed
SELECT pg_terminate_backend(blocking_pid)
FROM monitoring.blocking_locks
WHERE blocked_duration > interval '5 minutes';
```

### Slow Query Performance
```sql
-- 1. Identify slowest query
SELECT * FROM monitoring.slow_queries LIMIT 1;

-- 2. Explain query plan
EXPLAIN (ANALYZE, BUFFERS) <paste_slow_query_here>;

-- 3. Check if missing index
SELECT * FROM monitoring.missing_indexes
WHERE tablename = '<table_from_slow_query>';
```

---

## Alerting Thresholds

Configure alerts for these conditions:

| Metric | Warning | Critical |
|--------|---------|----------|
| Connection Pool | >75% | >90% |
| Table Bloat | >30% | >40% |
| Database Size | >400MB | >450MB |
| Query Time | >1s avg | >5s avg |
| Dead Tuples | >10% | >20% |
| Blocking Locks | >5 mins | >15 mins |

---

## Useful psql Commands

```bash
# Connect to database
psql "postgresql://user:pass@host:5432/database"

# List all tables with sizes
\dt+ public.*

# List all indexes
\di+ public.*

# Describe table structure
\d+ table_name

# List all views
\dv+

# List all materialized views
\dm+

# List all functions
\df+ monitoring.*

# Execute query from file
\i /path/to/query.sql

# Output query results to file
\o output.txt
SELECT * FROM monitoring.health_check_summary();
\o
```

---

## Best Practices

1. **Run health checks daily** - Review `monitoring.health_check_summary()` every morning
2. **Monitor trends** - Watch health check history for patterns
3. **Vacuum regularly** - Set up autovacuum and monitor its effectiveness
4. **Refresh MVs hourly** - Keep analytics data fresh
5. **Index maintenance** - Reindex bloated indexes monthly
6. **Connection management** - Monitor pool usage and configure limits
7. **Archive old data** - Move historical data to archive tables
8. **Document issues** - Log any manual interventions in health_check_history

---

## Support Contacts

- **Database Issues:** Check monitoring views first
- **Performance Issues:** Review slow_queries and missing_indexes
- **Space Issues:** Check database_size and table_bloat
- **Connection Issues:** Review connection_status

---

## Additional Resources

- Full implementation details: `DATABASE_MONITORING_IMPLEMENTATION_SUMMARY.md`
- Migration files: `/apps/casino/supabase/migrations/20251014_*.sql`
- Monitoring schema: `monitoring.*`
- Analytics views: `mv_player_lifetime_value`, `mv_game_performance`, `mv_campaign_roi`