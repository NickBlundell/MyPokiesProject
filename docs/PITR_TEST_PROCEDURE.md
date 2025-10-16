# Point-in-Time Recovery Test Procedure

## Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Access to Supabase Dashboard (https://app.supabase.com)
- Admin credentials for MyPokies project
- Test database or staging environment recommended
- Project ID: `hupruyttzgeytlysobar`

## Test Environment Setup

### Option A: Use Staging Branch (Recommended)
1. Create a development branch for testing
2. Perform PITR tests on branch without affecting production
3. Delete branch after testing

### Option B: Production Testing (Off-Peak Hours Only)
1. Schedule during maintenance window
2. Use test accounts only
3. Notify stakeholders before testing

## Test Scenario 1: Recover from Accidental Data Deletion

### Step 1: Record Current State (Before)
```sql
-- Record timestamp for recovery point
SELECT NOW() AS recovery_point;
-- Example: 2025-10-14 10:30:45.123456+00

-- Document current record counts
SELECT
  'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'user_balances', COUNT(*) FROM user_balances
UNION ALL
SELECT 'player_bonuses', COUNT(*) FROM player_bonuses;

-- Create test data snapshot
SELECT * FROM users WHERE email LIKE 'test%' LIMIT 5;
```

### Step 2: Simulate Data Loss
```sql
-- IMPORTANT: Only use test data!
-- Create backup of test records first
CREATE TEMP TABLE backup_test_users AS
SELECT * FROM users WHERE email LIKE 'test%';

-- Simulate accidental deletion
DELETE FROM users WHERE email LIKE 'test%' RETURNING id, email;

-- Verify deletion
SELECT COUNT(*) FROM users WHERE email LIKE 'test%';
-- Should return 0
```

### Step 3: Perform PITR Recovery

#### Via Supabase Dashboard
1. Navigate to: https://app.supabase.com/project/hupruyttzgeytlysobar
2. Go to Database → Backups
3. Click "Point in Time Recovery"
4. Select recovery timestamp from Step 1
5. Review affected data warning
6. Confirm recovery operation
7. Monitor progress (5-30 minutes depending on database size)

#### Via Supabase CLI (Alternative)
```bash
# Login to Supabase
supabase login

# Initiate PITR
supabase db restore --project-ref hupruyttzgeytlysobar \
  --timestamp "2025-10-14T10:30:45.123456Z"
```

### Step 4: Verify Recovery
```sql
-- Reconnect to database after recovery
-- Check if test users are restored
SELECT COUNT(*) FROM users WHERE email LIKE 'test%';

-- Compare with original counts
SELECT
  'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'user_balances', COUNT(*) FROM user_balances
UNION ALL
SELECT 'player_bonuses', COUNT(*) FROM player_bonuses;

-- Verify specific test records
SELECT * FROM users WHERE email LIKE 'test%' LIMIT 5;

-- Check for data integrity
SELECT
  u.id,
  u.email,
  ub.balance,
  COUNT(t.id) AS transaction_count
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.email LIKE 'test%'
GROUP BY u.id, u.email, ub.balance;
```

### Step 5: Application Testing
```bash
# Test application connectivity
curl https://hupruyttzgeytlysobar.supabase.co/rest/v1/users \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test authentication
curl https://hupruyttzgeytlysobar.supabase.co/auth/v1/health

# Verify game functionality (if applicable)
# Run application-specific health checks
```

### Step 6: Document Results

#### Recovery Metrics Template
```markdown
Test Date: __________
Tester: __________
Test Type: PITR - Accidental Deletion

Recovery Metrics:
- Start Time: __________
- Recovery Initiated: __________
- Recovery Completed: __________
- Total Recovery Time: __________ minutes
- Data Loss Window: __________ minutes

Verification Results:
- [ ] All test records restored
- [ ] Record counts match original
- [ ] No orphaned relationships
- [ ] Application connects successfully
- [ ] Authentication working
- [ ] Transactions intact
- [ ] User balances correct

Issues Encountered:
- None / List any issues

Notes:
_________________________________
```

## Test Scenario 2: Recover from Data Corruption

### Preparation
```sql
-- Create corruption detection baseline
CREATE TABLE corruption_test_baseline AS
SELECT
  MD5(CAST(ROW_TO_JSON(users) AS TEXT)) AS user_checksum,
  id AS user_id
FROM users
WHERE created_at > NOW() - INTERVAL '1 day';
```

### Simulate Corruption
```sql
-- Record recovery timestamp
SELECT NOW() AS recovery_point;

-- Simulate data corruption (test accounts only)
UPDATE user_balances
SET balance = -99999.99
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'corruption.test%'
);

-- Verify corruption
SELECT * FROM user_balances WHERE balance < 0;
```

### Recovery and Verification
Follow same PITR steps as Scenario 1, then:
```sql
-- Verify corruption is resolved
SELECT COUNT(*) FROM user_balances WHERE balance < 0;
-- Should return 0

-- Compare checksums
SELECT
  COUNT(*) AS corrupted_records
FROM users u
JOIN corruption_test_baseline ctb ON u.id = ctb.user_id
WHERE MD5(CAST(ROW_TO_JSON(u) AS TEXT)) != ctb.user_checksum;
```

## Test Scenario 3: Recovery Time Under Load

### Stress Test Setup
```sql
-- Generate load before recovery
INSERT INTO transactions (user_id, type, amount, created_at)
SELECT
  (SELECT id FROM users ORDER BY RANDOM() LIMIT 1),
  'test_load',
  RANDOM() * 100,
  NOW() - (RANDOM() * INTERVAL '1 hour')
FROM generate_series(1, 10000);
```

### Measure Recovery Performance
1. Note database size before recovery
2. Initiate PITR during peak hours
3. Measure time to completion
4. Calculate throughput (GB/minute)

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Recovery Taking Too Long
- Check database size: Large databases take longer
- Verify network connectivity
- Check Supabase status page
- Contact support if > 2 hours

#### Issue: Data Missing After Recovery
- Verify correct timestamp selected
- Check if data existed at recovery point
- Review transaction logs
- Confirm PITR window (30 days max)

#### Issue: Application Won't Connect
- Update connection pooler settings
- Restart application servers
- Clear connection pools
- Verify SSL certificates

#### Issue: Partial Recovery
- PITR is all-or-nothing
- Cannot recover single tables
- Consider alternative: restore to new project, extract needed data

## Best Practices

1. **Always Test on Staging First**
   - Create branch for testing
   - Validate procedure before production

2. **Document Everything**
   - Recovery timestamps
   - Actions taken
   - Results observed
   - Time measurements

3. **Coordinate with Team**
   - Notify before testing
   - Have rollback plan
   - Assign clear roles

4. **Regular Testing Schedule**
   - Monthly PITR tests minimum
   - Rotate test scenarios
   - Update procedures based on findings

## Emergency Contacts

- Supabase Support: support@supabase.io
- Supabase Status: https://status.supabase.com
- Project Dashboard: https://app.supabase.com/project/hupruyttzgeytlysobar
- Internal Escalation: [Your contact list]

## Appendix: Useful Queries

### Pre-Recovery Checks
```sql
-- Database size check
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Last transaction time
SELECT MAX(created_at) FROM transactions;
```

### Post-Recovery Validation
```sql
-- Verify sequences are correct
SELECT
  schemaname,
  sequencename,
  last_value
FROM pg_sequences
WHERE schemaname = 'public';

-- Check for constraint violations
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE NOT convalidated;

-- Verify indexes are valid
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Version History
- v1.0 - Initial procedure (October 2025)
- Last Updated: October 2025
- Next Review: November 2025