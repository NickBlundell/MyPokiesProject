# Soft Delete Implementation Guide

## Overview

This document provides comprehensive guidance on the soft delete strategy implemented for MyPokies Casino critical tables. The implementation ensures data retention, regulatory compliance, and maintains complete audit trails while preventing accidental data loss.

## Migration Details

**Migration File**: `/apps/casino/supabase/migrations/20251014_implement_soft_delete.sql`

**Date**: October 14, 2025

**Lines of Code**: 699 lines

## Tables Covered

The soft delete strategy has been implemented for the following critical tables:

1. **users** - Casino user accounts
2. **transactions** - All financial transactions
3. **player_bonuses** - Bonus instances
4. **user_balances** - User wallet balances
5. **game_rounds** - Game session data
6. **promotion_wins** - Promotion win records

## Soft Delete Columns

Each table now includes three additional columns:

```sql
deleted_at TIMESTAMPTZ       -- Timestamp when record was deleted (NULL = active)
deleted_by UUID              -- Reference to admin_users(id) who performed deletion
deletion_reason TEXT         -- Required reason for audit trail
```

### Column Descriptions

- **deleted_at**: When NULL, the record is active. When populated, indicates soft deletion timestamp.
- **deleted_by**: Foreign key to admin_users table, tracks which administrator performed the deletion.
- **deletion_reason**: Required text field explaining why the deletion occurred (regulatory, fraud, user request, etc.).

## RPC Functions

### 1. soft_delete_record()

Soft deletes a single record with validation and audit logging.

**Signature**:
```sql
soft_delete_record(
  p_table_name TEXT,
  p_record_id UUID,
  p_deleted_by UUID,
  p_deletion_reason TEXT
) RETURNS BOOLEAN
```

**Example Usage**:
```sql
-- Soft delete a user
SELECT soft_delete_record(
  'users',
  'user-uuid-here',
  'admin-uuid-here',
  'User requested account closure per GDPR'
);

-- Soft delete a transaction
SELECT soft_delete_record(
  'transactions',
  'transaction-uuid-here',
  'admin-uuid-here',
  'Duplicate transaction correction'
);
```

**Security Features**:
- Validates table name against whitelist
- Requires non-empty deletion reason
- Validates admin_user exists
- Only deletes records not already deleted
- Logs action in admin_audit_logs

**Returns**:
- `true` if record was successfully deleted
- `false` if record was already deleted or not found

### 2. cascade_soft_delete_user()

Soft deletes a user and ALL related records across multiple tables.

**Signature**:
```sql
cascade_soft_delete_user(
  p_user_id UUID,
  p_deleted_by UUID,
  p_deletion_reason TEXT
) RETURNS JSONB
```

**Example Usage**:
```sql
-- Cascade soft delete user and all related data
SELECT cascade_soft_delete_user(
  'user-uuid-here',
  'admin-uuid-here',
  'Account closure due to fraud investigation'
);

-- Returns counts of deleted records:
-- {
--   "users": 1,
--   "transactions": 245,
--   "player_bonuses": 12,
--   "user_balances": 3,
--   "game_rounds": 189,
--   "promotion_wins": 8
-- }
```

**What Gets Deleted**:
- User record
- All transactions
- All player bonuses
- All user balances
- All game rounds
- All promotion wins

**Security Features**:
- Wraps soft_delete_record() for user
- Cascades to all related tables
- Logs cascade action in admin_audit_logs
- Returns count of deleted records by table

### 3. restore_soft_deleted_record()

Restores a previously soft-deleted record.

**Signature**:
```sql
restore_soft_deleted_record(
  p_table_name TEXT,
  p_record_id UUID,
  p_restored_by UUID
) RETURNS BOOLEAN
```

**Example Usage**:
```sql
-- Restore a soft deleted user
SELECT restore_soft_deleted_record(
  'users',
  'user-uuid-here',
  'admin-uuid-here'
);

-- Restore a soft deleted bonus
SELECT restore_soft_deleted_record(
  'player_bonuses',
  'bonus-uuid-here',
  'admin-uuid-here'
);
```

**Security Features**:
- Validates table name against whitelist
- Validates admin_user exists
- Clears deletion metadata (deleted_at, deleted_by, deletion_reason)
- Logs restoration in admin_audit_logs with original deletion info

**Returns**:
- `true` if record was successfully restored
- `false` if record was not deleted or not found

### 4. get_deleted_records_stats()

Returns statistics about deleted vs active records across all tables.

**Signature**:
```sql
get_deleted_records_stats()
RETURNS TABLE(
  table_name TEXT,
  total_records BIGINT,
  deleted_records BIGINT,
  active_records BIGINT,
  deletion_rate NUMERIC
)
```

**Example Usage**:
```sql
-- Get deletion statistics
SELECT * FROM get_deleted_records_stats();

-- Output:
-- table_name       | total_records | deleted_records | active_records | deletion_rate
-- -----------------|---------------|-----------------|----------------|---------------
-- users            | 1000          | 50              | 950            | 5.00
-- transactions     | 50000         | 120             | 49880          | 0.24
-- player_bonuses   | 5000          | 200             | 4800           | 4.00
-- user_balances    | 1500          | 55              | 1445           | 3.67
-- game_rounds      | 30000         | 80              | 29920          | 0.27
-- promotion_wins   | 2000          | 15              | 1985           | 0.75
```

## Admin Views

Six admin-only views provide access to ALL records (including soft deleted):

1. **users_with_deleted**
2. **transactions_with_deleted**
3. **player_bonuses_with_deleted**
4. **user_balances_with_deleted**
5. **game_rounds_with_deleted**
6. **promotion_wins_with_deleted**

### View Features

- Shows all records (active + deleted)
- Includes `deleted_by_email` and `deleted_by_name` columns
- Includes `is_deleted` boolean flag
- **Only accessible to service_role**
- Explicitly revoked from authenticated role

**Example Usage**:
```sql
-- View all users including deleted (admin only)
SELECT * FROM users_with_deleted
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 10;

-- Find all records deleted by a specific admin
SELECT * FROM transactions_with_deleted
WHERE deleted_by = 'admin-uuid-here'
ORDER BY deleted_at DESC;

-- Count deleted vs active records
SELECT
  is_deleted,
  COUNT(*) as count
FROM users_with_deleted
GROUP BY is_deleted;
```

## RLS Policy Updates

Row Level Security policies have been updated to automatically filter deleted records for end users:

### Before (Example)
```sql
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

### After (Example)
```sql
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);
```

### Affected Policies

1. Users can view their own data
2. Users can view their own balances
3. Users can view their own transactions
4. Users can view their own game rounds
5. Users can view their own promotion wins
6. Users can view own bonuses

**Note**: Service role policies remain unchanged to allow admin access to all records.

## Indexes

Partial indexes have been created for efficient querying of deleted records:

```sql
-- Only indexes rows where deleted_at IS NOT NULL
CREATE INDEX idx_users_deleted_at ON users(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_users_deleted_by ON users(deleted_by)
  WHERE deleted_at IS NOT NULL;

-- Similar indexes for all other tables...
```

**Benefits**:
- Minimal index size (only deleted records)
- Fast queries for deleted records
- No impact on active record queries
- Reduced index maintenance overhead

## Usage Examples

### Soft Deleting a User for Regulatory Compliance

```sql
-- User requests account deletion per GDPR
SELECT soft_delete_record(
  'users',
  '123e4567-e89b-12d3-a456-426614174000',
  '98765432-e89b-12d3-a456-426614174000',  -- admin ID
  'User requested account deletion per GDPR Article 17 (Right to Erasure)'
);
```

### Cascading User Deletion for Fraud Investigation

```sql
-- Soft delete user and all related data
SELECT cascade_soft_delete_user(
  '123e4567-e89b-12d3-a456-426614174000',
  '98765432-e89b-12d3-a456-426614174000',
  'Account suspended for fraud investigation - Case #FR-2025-1234'
);
```

### Correcting an Erroneous Transaction

```sql
-- Soft delete duplicate transaction
SELECT soft_delete_record(
  'transactions',
  'trans-uuid-here',
  'admin-uuid-here',
  'Duplicate transaction - original TID: original-tid-value'
);
```

### Restoring Accidentally Deleted Bonus

```sql
-- Restore a bonus that was deleted by mistake
SELECT restore_soft_deleted_record(
  'player_bonuses',
  'bonus-uuid-here',
  'admin-uuid-here'
);
```

### Admin Panel: View Recently Deleted Users

```typescript
// In your admin panel application using Supabase service role client
const { data: deletedUsers, error } = await supabaseAdmin
  .from('users_with_deleted')
  .select('*')
  .not('deleted_at', 'is', null)
  .order('deleted_at', { ascending: false })
  .limit(50);
```

### Monitoring Deletion Rates

```sql
-- Run daily to monitor deletion patterns
SELECT * FROM get_deleted_records_stats();

-- Alert if deletion rate exceeds threshold
SELECT
  table_name,
  deletion_rate,
  CASE
    WHEN deletion_rate > 10 THEN 'HIGH ALERT'
    WHEN deletion_rate > 5 THEN 'MEDIUM ALERT'
    ELSE 'NORMAL'
  END as alert_level
FROM get_deleted_records_stats()
WHERE deletion_rate > 5;
```

## Application Code Updates

### TypeScript/JavaScript Examples

#### Using Supabase Client (Service Role)

```typescript
import { createClient } from '@supabase/supabase-js';

// Service role client (for admin operations)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Soft delete a user
async function softDeleteUser(
  userId: string,
  adminId: string,
  reason: string
) {
  const { data, error } = await supabaseAdmin
    .rpc('soft_delete_record', {
      p_table_name: 'users',
      p_record_id: userId,
      p_deleted_by: adminId,
      p_deletion_reason: reason
    });

  if (error) {
    console.error('Soft delete failed:', error);
    return false;
  }

  return data; // Returns boolean
}

// Cascade delete user with all related data
async function cascadeDeleteUser(
  userId: string,
  adminId: string,
  reason: string
) {
  const { data, error } = await supabaseAdmin
    .rpc('cascade_soft_delete_user', {
      p_user_id: userId,
      p_deleted_by: adminId,
      p_deletion_reason: reason
    });

  if (error) {
    console.error('Cascade delete failed:', error);
    return null;
  }

  // Returns: { users: 1, transactions: 245, player_bonuses: 12, ... }
  console.log('Deleted records:', data);
  return data;
}

// Restore a soft deleted record
async function restoreUser(
  userId: string,
  adminId: string
) {
  const { data, error } = await supabaseAdmin
    .rpc('restore_soft_deleted_record', {
      p_table_name: 'users',
      p_record_id: userId,
      p_restored_by: adminId
    });

  if (error) {
    console.error('Restore failed:', error);
    return false;
  }

  return data; // Returns boolean
}

// Get deletion statistics
async function getDeletionStats() {
  const { data, error } = await supabaseAdmin
    .rpc('get_deleted_records_stats');

  if (error) {
    console.error('Failed to get stats:', error);
    return null;
  }

  return data;
}

// Fetch deleted records (admin view)
async function getDeletedUsers(limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('users_with_deleted')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch deleted users:', error);
    return [];
  }

  return data;
}
```

### Never Use Direct DELETE

```typescript
// ❌ WRONG - This will fail or bypass soft delete
await supabaseAdmin
  .from('users')
  .delete()
  .eq('id', userId);

// ✅ CORRECT - Use soft delete RPC function
await supabaseAdmin
  .rpc('soft_delete_record', {
    p_table_name: 'users',
    p_record_id: userId,
    p_deleted_by: adminId,
    p_deletion_reason: 'User requested account deletion'
  });
```

## Migration Deployment

### Using Supabase CLI

```bash
# Navigate to casino app directory
cd apps/casino

# Apply migration to local database
npx supabase db push

# Or apply to remote database
npx supabase db push --db-url "postgresql://..."
```

### Manual Deployment

```bash
# Connect to your database
psql "postgresql://user:pass@host:port/database"

# Run the migration file
\i /path/to/apps/casino/supabase/migrations/20251014_implement_soft_delete.sql
```

### Verification After Deployment

```sql
-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('deleted_at', 'deleted_by', 'deletion_reason');

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname LIKE '%deleted%';

-- Verify functions exist
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN (
  'soft_delete_record',
  'cascade_soft_delete_user',
  'restore_soft_deleted_record',
  'get_deleted_records_stats'
);

-- Verify views exist
SELECT viewname
FROM pg_views
WHERE viewname LIKE '%_with_deleted';

-- Test soft delete function
SELECT soft_delete_record(
  'users',
  'test-uuid',
  'admin-uuid',
  'Test deletion'
);
```

## Best Practices

### 1. Always Provide Detailed Deletion Reasons

```sql
-- ❌ BAD
'deleted'
'no longer needed'
'test'

-- ✅ GOOD
'User requested account deletion per GDPR Article 17 (Right to Erasure)'
'Duplicate transaction - original TID: TXN-2025-001234'
'Account suspended for fraud investigation - Case #FR-2025-1234'
'Bonus revoked due to terms violation - exceeded max bet limit'
```

### 2. Use Cascade Delete for User Removals

```typescript
// When deleting a user, always cascade to maintain referential consistency
await supabaseAdmin.rpc('cascade_soft_delete_user', {
  p_user_id: userId,
  p_deleted_by: adminId,
  p_deletion_reason: reason
});

// Don't soft delete user alone and leave orphaned records
```

### 3. Implement Restore Workflows in Admin UI

```typescript
// Admin panel should provide:
// 1. View of recently deleted records
// 2. One-click restore functionality
// 3. Confirmation dialogs
// 4. Audit trail visibility

async function showRestoreConfirmation(record: any) {
  const confirm = window.confirm(
    `Restore ${record.table} record?\n` +
    `Deleted: ${record.deleted_at}\n` +
    `By: ${record.deleted_by_name}\n` +
    `Reason: ${record.deletion_reason}`
  );

  if (confirm) {
    await restoreUser(record.id, currentAdminId);
  }
}
```

### 4. Monitor Deletion Patterns

```typescript
// Set up daily monitoring
async function monitorDeletionRates() {
  const stats = await getDeletionStats();

  for (const table of stats) {
    if (table.deletion_rate > 10) {
      // Send alert - abnormal deletion rate
      await sendAlert({
        severity: 'high',
        message: `High deletion rate in ${table.table_name}: ${table.deletion_rate}%`,
        details: table
      });
    }
  }
}
```

### 5. Implement Permanent Deletion (Archival)

```sql
-- Create scheduled job to permanently delete old soft-deleted records
-- after retention period (e.g., 90 days)

CREATE OR REPLACE FUNCTION permanent_delete_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retention_days INTEGER := 90;
BEGIN
  -- Archive to backup table before permanent deletion
  INSERT INTO users_archive
  SELECT * FROM users
  WHERE deleted_at < NOW() - INTERVAL '90 days';

  -- Permanently delete
  DELETE FROM users
  WHERE deleted_at < NOW() - INTERVAL '90 days';

  -- Repeat for other tables...
END;
$$;

-- Schedule with pg_cron or external scheduler
```

## Regulatory Compliance

### GDPR Compliance

The soft delete implementation supports GDPR compliance:

- **Right to Erasure (Article 17)**: Records can be soft deleted with proper reason
- **Audit Trail**: All deletions are logged with admin ID and timestamp
- **Data Retention**: Soft deleted data can be retained for regulatory period
- **Permanent Deletion**: Can be implemented after retention period

### Audit Requirements

All soft delete operations are automatically logged in `admin_audit_logs`:

```sql
-- View audit trail for deletions
SELECT
  aal.*,
  au.email as admin_email,
  au.full_name as admin_name
FROM admin_audit_logs aal
JOIN admin_users au ON aal.admin_id = au.id
WHERE aal.action IN ('soft_delete', 'cascade_soft_delete', 'restore_soft_deleted')
ORDER BY aal.created_at DESC;
```

## Troubleshooting

### Issue: Function not found

**Error**: `function soft_delete_record does not exist`

**Solution**: Run the migration file or verify it was applied:
```sql
SELECT proname FROM pg_proc WHERE proname = 'soft_delete_record';
```

### Issue: Permission denied on admin views

**Error**: `permission denied for view users_with_deleted`

**Solution**: Ensure you're using service role credentials:
```typescript
const supabaseAdmin = createClient(
  url,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Not anon key
);
```

### Issue: RLS blocks soft delete

**Error**: `new row violates row-level security policy`

**Solution**: Ensure functions have `SECURITY DEFINER` and correct `search_path`:
```sql
ALTER FUNCTION soft_delete_record SECURITY DEFINER SET search_path = public;
```

### Issue: Foreign key constraint error

**Error**: `update or delete on table "users" violates foreign key constraint`

**Solution**: Use `cascade_soft_delete_user()` instead of `soft_delete_record()` for users.

## Performance Considerations

### Index Impact

- Partial indexes only contain deleted records (~1-5% of total)
- Minimal impact on INSERT/UPDATE operations
- Fast queries for deleted record searches

### Query Performance

```sql
-- Fast: Uses partial index
SELECT * FROM users
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- Fast: Standard query (RLS filters deleted)
SELECT * FROM users WHERE id = $1;

-- Slow: Full table scan including deleted
SELECT * FROM users_with_deleted;  -- Admin only, use with WHERE clause
```

### Recommendations

1. Add `deleted_at IS NULL` to WHERE clauses explicitly in application queries
2. Use partial indexes for deleted record queries
3. Consider partitioning for tables with high deletion rates
4. Monitor index bloat and reindex periodically

## Summary

The soft delete implementation provides:

✅ **Data Protection**: Prevents accidental permanent deletion
✅ **Audit Compliance**: Complete audit trail with admin tracking
✅ **Regulatory Support**: GDPR and financial regulation compliance
✅ **Restore Capability**: Easy recovery of deleted records
✅ **Performance**: Minimal overhead with partial indexes
✅ **Security**: Validated functions with RLS integration
✅ **Admin Tools**: Comprehensive views and statistics
✅ **Cascade Support**: Related record handling

## Next Steps

1. **Deploy Migration**: Apply the migration to production database
2. **Update Application Code**: Replace DELETE operations with soft_delete_record()
3. **Build Admin UI**: Create interface for viewing/restoring deleted records
4. **Setup Monitoring**: Implement deletion rate alerts
5. **Create Archival Job**: Schedule permanent deletion after retention period
6. **Update Backup Procedures**: Ensure backups include soft deleted data
7. **Train Staff**: Educate admins on proper deletion procedures

## Support

For questions or issues:
- Review this documentation
- Check audit logs: `SELECT * FROM admin_audit_logs WHERE action LIKE '%delete%'`
- Run statistics: `SELECT * FROM get_deleted_records_stats()`
- Contact database administrator

---

**Document Version**: 1.0
**Last Updated**: October 14, 2025
**Migration File**: `20251014_implement_soft_delete.sql`
