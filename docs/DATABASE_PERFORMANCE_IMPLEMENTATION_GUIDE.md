# Database Performance Optimizations - Implementation Guide

## Overview

This guide provides step-by-step instructions for deploying the five major database performance optimizations to your Supabase project.

## Prerequisites

- Supabase project ID: `hupruyttzgeytlysobar`
- Database access with superuser privileges
- Supabase CLI installed: `npm install -g supabase`
- PostgreSQL client (`psql`) or Supabase SQL Editor access

## Implementation Order

**IMPORTANT**: These migrations must be deployed in order due to dependencies.

## Step 1: Backup Current Database

```bash
# Create a backup before making any changes
supabase db dump -f backup_before_optimizations.sql

# Or via direct connection
pg_dump $DATABASE_URL > backup_before_optimizations.sql
```

## Step 2: Deploy Archival Strategy (Migration 1)

**File**: `20251014_implement_archival_strategy.sql`

### Steps:

1. **Review the migration file**:
   ```bash
   cat apps/casino/supabase/migrations/20251014_implement_archival_strategy.sql
   ```

2. **Deploy via Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/hupruyttzgeytlysobar/sql
   - Copy and paste the entire migration
   - Click "Run"

   OR via CLI:
   ```bash
   supabase db push
   ```

3. **Verify installation**:
   ```sql
   -- Check if archive schema exists
   SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'archive';

   -- Check archival functions
   \df archive.*

   -- View initial statistics
   SELECT * FROM archive.get_archival_stats();
   ```

4. **Test archival (optional)**:
   ```bash
   psql $DATABASE_URL -f scripts/test_archival_strategy.sql
   ```

5. **Expected Results**:
   - Archive schema created
   - Archive tables created for: callback_logs, transactions, game_rounds, sms_messages
   - Archival functions available
   - Cron jobs scheduled

### Post-Deployment:

```sql
-- Run a manual archival test (small batch)
SELECT * FROM archive.archive_callback_logs(90, 100);

-- Check the results
SELECT * FROM archive.archive_batches ORDER BY started_at DESC LIMIT 5;
```

## Step 3: Deploy Column-Level Encryption (Migration 2)

**File**: `20251014_add_column_level_encryption.sql`

### Steps:

1. **CRITICAL**: Set up encryption key in Supabase Vault FIRST:
   - Go to: https://supabase.com/dashboard/project/hupruyttzgeytlysobar/settings/vault
   - Create a new secret named: `pii_encryption_key`
   - Generate a secure 32-character key:
     ```bash
     openssl rand -base64 32
     ```
   - Store the key securely

2. **Deploy the migration**:
   ```bash
   # Via SQL Editor or CLI
   supabase db push
   ```

3. **Verify installation**:
   ```sql
   -- Check if pgcrypto is enabled
   SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

   -- Check encryption schema
   SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'encryption';

   -- Test encryption/decryption
   SELECT
       'test@example.com' as original,
       encryption.encrypt_pii('test@example.com') as encrypted,
       encryption.decrypt_pii(encryption.encrypt_pii('test@example.com')) as decrypted;
   ```

4. **Test encryption**:
   ```bash
   psql $DATABASE_URL -f scripts/test_encryption.sql
   ```

5. **Migrate existing data** (AFTER testing):
   ```sql
   -- This will encrypt all existing PII data
   -- RUN THIS CAREFULLY - backup first!
   SELECT * FROM encryption.migrate_existing_pii_data();

   -- Verify encryption status
   SELECT * FROM encryption.check_encryption_status();
   ```

### Post-Deployment:

```sql
-- Check that data is encrypted
SELECT
    id,
    email,  -- Should be NULL
    phone,  -- Should be NULL
    email_encrypted IS NOT NULL as has_encrypted_email,
    phone_encrypted IS NOT NULL as has_encrypted_phone
FROM public.users
LIMIT 10;

-- Test decrypted view access
SELECT * FROM public.users_decrypted LIMIT 5;
```

## Step 4: Configure Connection Pooling (Migration 3)

**File**: `20251014_configure_connection_pooling.sql`

### Steps:

1. **Update environment variables**:

   Edit `apps/casino/.env.local`:
   ```bash
   # Add pooled connection URL
   SUPABASE_POOLED_URL=postgresql://postgres.hupruyttzgeytlysobar:Msnrocks4u%40@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres

   # Keep existing variables
   DATABASE_URL=postgresql://postgres.hupruyttzgeytlysobar:Msnrocks4u%40@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://hupruyttzgeytlysobar.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

   Edit `apps/admin/.env.local` with the same changes.

2. **Deploy the migration**:
   ```bash
   supabase db push
   ```

3. **Verify installation**:
   ```sql
   -- Check connection monitoring functions
   SELECT * FROM public.get_connection_stats();

   -- Check connection details
   SELECT * FROM public.get_connection_details();

   -- Verify no issues
   SELECT * FROM public.check_connection_health();
   ```

4. **Configure Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/hupruyttzgeytlysobar/settings/database
   - Under "Connection Pooling":
     - Mode: Transaction
     - Pool Size: 15
     - Max Client Connections: 100

5. **Update application code** (if needed):
   - Update Supabase clients to use pooled connections
   - See `docs/CONNECTION_POOLING_SETUP.md` for details

### Post-Deployment:

```sql
-- Monitor connections over 10 minutes
SELECT * FROM public.connection_pool_stats;

-- Record baseline
SELECT public.record_connection_history();

-- Wait 5 minutes, then check again
SELECT * FROM public.connection_history ORDER BY recorded_at DESC LIMIT 10;
```

## Step 5: Tune Autovacuum Settings (Migration 4)

**File**: `20251014_tune_autovacuum_settings.sql`

### Steps:

1. **Check current bloat status**:
   ```sql
   -- Before optimization
   SELECT
       schemaname,
       tablename,
       n_dead_tup,
       n_live_tup,
       ROUND((n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) as dead_pct
   FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   ORDER BY n_dead_tup DESC;
   ```

2. **Deploy the migration**:
   ```bash
   supabase db push
   ```

3. **Verify installation**:
   ```sql
   -- Check autovacuum settings were applied
   SELECT
       c.relname,
       c.reloptions
   FROM pg_class c
   WHERE c.relname IN ('transactions', 'callback_logs', 'user_balances', 'game_rounds')
   AND c.relkind = 'r';

   -- Run bloat analysis
   SELECT * FROM public.analyze_table_bloat();
   ```

4. **Optional: Run manual vacuum on high-bloat tables**:
   ```sql
   -- Check which tables need immediate attention
   SELECT * FROM public.get_autovacuum_recommendations();

   -- Run manual vacuum if needed
   CALL public.vacuum_high_bloat_tables(0.1, true);
   ```

### Post-Deployment:

Monitor over 24-48 hours:

```sql
-- Check bloat reduction
SELECT * FROM public.analyze_table_bloat();

-- Monitor autovacuum activity
SELECT * FROM public.monitor_autovacuum_activity();

-- Check health
SELECT * FROM public.check_vacuum_health();
```

## Step 6: Enable pg_stat_statements (Migration 5)

**File**: `20251014_enable_pg_stat_statements.sql`

### Steps:

1. **Enable extension** (may require Supabase support):

   Option A - Via Dashboard:
   - Go to: https://supabase.com/dashboard/project/hupruyttzgeytlysobar/database/extensions
   - Search for "pg_stat_statements"
   - Click "Enable"

   Option B - Via SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

2. **Deploy the migration**:
   ```bash
   supabase db push
   ```

3. **Verify installation**:
   ```sql
   -- Check extension is enabled
   SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';

   -- Check views exist
   \dv public.slow_queries
   \dv public.frequent_queries
   \dv public.high_io_queries

   -- View dashboard
   SELECT * FROM public.query_performance_dashboard();
   ```

4. **Let it collect data** (wait 1 hour):
   ```sql
   -- After some time, check what's being tracked
   SELECT COUNT(*) as tracked_queries FROM pg_stat_statements;

   -- View slow queries
   SELECT * FROM public.slow_queries LIMIT 10;
   ```

### Post-Deployment:

```sql
-- Capture initial snapshot
SELECT public.capture_query_performance_snapshot();

-- Get recommendations
SELECT * FROM public.get_query_optimization_recommendations();

-- Check for missing indexes
SELECT * FROM public.missing_indexes LIMIT 10;
```

## Verification Checklist

After all migrations are deployed:

- [ ] Archive schema exists and functions work
- [ ] Encryption is active and data is protected
- [ ] Connection pooling is configured and monitoring
- [ ] Autovacuum settings are applied and working
- [ ] pg_stat_statements is tracking queries
- [ ] No critical alerts from health checks
- [ ] Scheduled jobs are configured (check `cron.job`)
- [ ] All test scripts pass

### Run Complete Health Check:

```sql
-- 1. Archival
SELECT * FROM archive.get_archival_stats();

-- 2. Encryption
SELECT * FROM encryption.check_encryption_status();

-- 3. Connections
SELECT * FROM public.get_connection_stats();
SELECT * FROM public.check_connection_health();

-- 4. Vacuum
SELECT * FROM public.analyze_table_bloat();
SELECT * FROM public.check_vacuum_health();

-- 5. Query Performance
SELECT * FROM public.query_performance_dashboard();
SELECT * FROM public.slow_queries LIMIT 5;
```

All should return "HEALTHY" or positive results.

## Monitoring Schedule

### Daily (Automated)
- Archival runs at 3 AM UTC
- Connection history captured every 5 minutes
- Query snapshots captured hourly

### Weekly (Manual)
- Review slow queries
- Check archival statistics
- Verify no connection leaks
- Review bloat metrics

### Monthly (Manual)
- Review and implement query optimizations
- Check encryption key rotation needs
- Analyze long-term performance trends
- Update autovacuum settings if needed

## Rollback Procedures

If you need to rollback any optimization:

### Rollback Archival:
```sql
-- Drop archive schema
DROP SCHEMA IF EXISTS archive CASCADE;

-- Remove scheduled jobs
SELECT cron.unschedule('archive-old-data-daily');
SELECT cron.unschedule('vacuum-archive-tables-weekly');
```

### Rollback Encryption:
```sql
-- WARNING: This will remove encrypted data!
-- Restore plaintext from backup first if needed
DROP SCHEMA IF EXISTS encryption CASCADE;
```

### Rollback Connection Pooling:
```sql
-- Remove monitoring tables
DROP TABLE IF EXISTS public.connection_history CASCADE;

-- Drop views and functions
DROP VIEW IF EXISTS public.connection_pool_stats CASCADE;
```

### Rollback Autovacuum:
```sql
-- Reset to default settings
ALTER TABLE public.transactions RESET (
    autovacuum_vacuum_scale_factor,
    autovacuum_vacuum_threshold,
    autovacuum_analyze_scale_factor,
    autovacuum_analyze_threshold
);
-- Repeat for other tables
```

### Rollback pg_stat_statements:
```sql
DROP EXTENSION IF EXISTS pg_stat_statements CASCADE;
```

## Troubleshooting

### Issue: Migration fails with "extension not found"

**Solution**: Some extensions require enabling in Supabase dashboard first:
1. Go to Database → Extensions
2. Enable required extension
3. Retry migration

### Issue: "Permission denied" errors

**Solution**: Ensure you're using service role key:
```bash
export DATABASE_URL="postgresql://postgres.hupruyttzgeytlysobar:Msnrocks4u%40@..."
```

### Issue: Archival job not running

**Solution**: Check if pg_cron is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not, enable it
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Issue: Encryption key not found

**Solution**: Verify Vault configuration:
1. Check Supabase Dashboard → Settings → Vault
2. Ensure secret named `pii_encryption_key` exists
3. Update `encryption.get_encryption_key()` function

### Issue: High connection usage after pooling

**Solution**: Adjust pool settings:
```sql
SELECT * FROM public.get_pool_recommendations();
SELECT * FROM public.find_connection_leaks();
```

## Support & Documentation

- **Main Summary**: `docs/DATABASE_PERFORMANCE_SUMMARY.md`
- **Connection Pooling**: `docs/CONNECTION_POOLING_SETUP.md`
- **Test Scripts**: `scripts/test_*.sql`
- **Supabase Docs**: https://supabase.com/docs

## Success Metrics

Track these metrics before and after deployment:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Average query time | < 50ms | `SELECT * FROM public.slow_queries` |
| Connection errors | < 5/day | `SELECT * FROM public.check_connection_health()` |
| Dead tuple % | < 10% | `SELECT * FROM public.analyze_table_bloat()` |
| Database size | Stable growth | `SELECT pg_size_pretty(pg_database_size(current_database()))` |
| Cache hit ratio | > 95% | Check `public.query_performance_dashboard()` |

## Conclusion

After completing all steps:

1. Monitor for 24 hours to ensure stability
2. Review performance improvements
3. Implement any recommended optimizations
4. Schedule regular reviews per monitoring schedule
5. Update todo.md to mark optimizations as complete

---

**Implementation Date**: October 14, 2025
**Expected Duration**: 2-3 hours for full deployment
**Status**: Ready for deployment