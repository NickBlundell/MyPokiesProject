# Soft Delete Quick Reference

## Quick Commands

### Soft Delete a Single Record

```sql
SELECT soft_delete_record(
  'table_name',     -- users, transactions, player_bonuses, user_balances, game_rounds, promotion_wins
  'record-uuid',    -- UUID of record to delete
  'admin-uuid',     -- UUID of admin performing deletion
  'Reason text'     -- Required: reason for deletion
);
```

### Cascade Delete User + All Related Data

```sql
SELECT cascade_soft_delete_user(
  'user-uuid',      -- UUID of user to delete
  'admin-uuid',     -- UUID of admin performing deletion
  'Reason text'     -- Required: reason for deletion
);
-- Returns: {"users": 1, "transactions": 245, "player_bonuses": 12, ...}
```

### Restore a Soft Deleted Record

```sql
SELECT restore_soft_deleted_record(
  'table_name',     -- Table name
  'record-uuid',    -- UUID of record to restore
  'admin-uuid'      -- UUID of admin performing restore
);
```

### Get Deletion Statistics

```sql
SELECT * FROM get_deleted_records_stats();
```

### View Deleted Records (Admin Only)

```sql
-- Users
SELECT * FROM users_with_deleted WHERE deleted_at IS NOT NULL;

-- Transactions
SELECT * FROM transactions_with_deleted WHERE deleted_at IS NOT NULL;

-- Player Bonuses
SELECT * FROM player_bonuses_with_deleted WHERE deleted_at IS NOT NULL;

-- User Balances
SELECT * FROM user_balances_with_deleted WHERE deleted_at IS NOT NULL;

-- Game Rounds
SELECT * FROM game_rounds_with_deleted WHERE deleted_at IS NOT NULL;

-- Promotion Wins
SELECT * FROM promotion_wins_with_deleted WHERE deleted_at IS NOT NULL;
```

## TypeScript/JavaScript

### Soft Delete

```typescript
const { data } = await supabaseAdmin.rpc('soft_delete_record', {
  p_table_name: 'users',
  p_record_id: userId,
  p_deleted_by: adminId,
  p_deletion_reason: 'GDPR deletion request'
});
```

### Cascade Delete

```typescript
const { data } = await supabaseAdmin.rpc('cascade_soft_delete_user', {
  p_user_id: userId,
  p_deleted_by: adminId,
  p_deletion_reason: 'Fraud investigation'
});
console.log(data); // {users: 1, transactions: 245, ...}
```

### Restore

```typescript
const { data } = await supabaseAdmin.rpc('restore_soft_deleted_record', {
  p_table_name: 'users',
  p_record_id: userId,
  p_restored_by: adminId
});
```

### Get Stats

```typescript
const { data } = await supabaseAdmin.rpc('get_deleted_records_stats');
```

### View Deleted (Admin)

```typescript
const { data } = await supabaseAdmin
  .from('users_with_deleted')
  .select('*')
  .not('deleted_at', 'is', null)
  .order('deleted_at', { ascending: false });
```

## Tables with Soft Delete

- ✅ users
- ✅ transactions
- ✅ player_bonuses
- ✅ user_balances
- ✅ game_rounds
- ✅ promotion_wins

## Columns Added to Each Table

```sql
deleted_at TIMESTAMPTZ       -- NULL = active, timestamp = deleted
deleted_by UUID              -- FK to admin_users(id)
deletion_reason TEXT         -- Required reason
```

## RLS Behavior

- **Regular users**: Automatically filtered (WHERE deleted_at IS NULL)
- **Service role**: Full access to all records
- **Admin views**: Use `*_with_deleted` views to see all records

## Important Notes

⚠️ **Never use direct DELETE** - Always use `soft_delete_record()` or `cascade_soft_delete_user()`

⚠️ **Deletion reason is required** - Empty strings will be rejected

⚠️ **Admin views require service role** - Not accessible with anon key

⚠️ **Use cascade for users** - `cascade_soft_delete_user()` handles related records

✅ **Audit logged** - All operations logged in admin_audit_logs

✅ **Restorable** - All soft deletes can be restored

✅ **Indexed** - Partial indexes for fast queries

## Common Deletion Reasons

### Users
- "User requested account deletion per GDPR Article 17 (Right to Erasure)"
- "Account suspended for fraud investigation - Case #FR-2025-XXXX"
- "Duplicate account - primary account ID: [uuid]"
- "Test account cleanup"

### Transactions
- "Duplicate transaction - original TID: [tid]"
- "Transaction correction - reversed by rollback TID: [tid]"
- "Financial audit adjustment - Case #FA-2025-XXXX"
- "Erroneous API callback - reprocessed with TID: [tid]"

### Player Bonuses
- "Bonus revoked due to terms violation - exceeded max bet limit"
- "Duplicate bonus issuance - original bonus ID: [uuid]"
- "Bonus abuse detected - investigation Case #AB-2025-XXXX"
- "Technical error - bonus reissued with ID: [uuid]"

## Migration File

**Location**: `/apps/casino/supabase/migrations/20251014_implement_soft_delete.sql`

**Size**: 699 lines

**Deploy**:
```bash
cd apps/casino
npx supabase db push
```

## Documentation

Full documentation: `/docs/SOFT_DELETE_IMPLEMENTATION.md`
