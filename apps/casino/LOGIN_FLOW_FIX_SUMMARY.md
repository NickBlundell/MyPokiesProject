# Login Flow Fix Summary

## Issue: Login Not Working

**Root Cause**: Auth users existed in `auth.users` table but had no corresponding casino user records in `public.users` table, causing RLS policies to fail when trying to fetch user data.

## Missing User Records

2 out of 3 auth users were missing casino records:
- `test@mypokies.com` (auth_id: `b46f5a14-891d-432e-94f0-803bf951390e`) - ❌ MISSING
- `nicholasblundell@proton.me` (auth_id: `8cb0dd39-d6c7-4871-8be8-7bb480afaf60`) - ❌ MISSING
- `josnell1999@gmail.com` (auth_id: `b7eabee5-2b7b-403d-86de-ad599b893fbf`) - ✅ OK

## Fixes Applied

### 1. Created Database Triggers for Auto-User Creation

**Migration**: `create_user_on_signup_trigger.sql`

**Trigger 1**: `on_auth_user_created` - Automatically creates casino user when auth user signs up
```sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, external_user_id, email, account_status)
  VALUES (NEW.id, NEW.id::text, NEW.email, 'active');
  RETURN NEW;
END;
$$;
```

**Trigger 2**: `on_casino_user_created` - Creates initial balances and loyalty tier
```sql
CREATE OR REPLACE FUNCTION public.handle_new_casino_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create initial balance with version=1 (satisfies check constraint)
  INSERT INTO public.user_balances (user_id, currency, balance, version)
  VALUES (NEW.id, 'USD', 0, 1)
  ON CONFLICT (user_id, currency) DO NOTHING;

  -- Assign Bronze tier (tier_level=1) to new users
  INSERT INTO public.player_loyalty (user_id, current_tier_id, total_points_earned, available_points, lifetime_wagered)
  SELECT NEW.id, id, 0, 0, 0 FROM loyalty_tiers WHERE tier_level = 1 LIMIT 1
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
```

### 2. Fixed Check Constraint Issue

**Migration**: `fix_user_balance_version.sql`

**Issue**: Initial version was 0, but check constraint required version > 0

**Fix**: Updated trigger to set `version=1` when creating initial balances

### 3. Fixed Table Name Issue

**Migration**: `fix_user_balance_version_correct_table.sql`

**Issue**: Trigger referenced non-existent table `loyalty_tiers_users`

**Fix**: Updated trigger to use correct table name `player_loyalty`

### 4. Backfilled Missing User Records

Manually created casino user records for the 2 existing auth users:

```sql
INSERT INTO public.users (auth_user_id, external_user_id, email, account_status)
VALUES
  ('b46f5a14-891d-432e-94f0-803bf951390e', 'b46f5a14-891d-432e-94f0-803bf951390e', 'test@mypokies.com', 'active'),
  ('8cb0dd39-d6c7-4871-8be8-7bb480afaf60', '8cb0dd39-d6c7-4871-8be8-7bb480afaf60', 'nicholasblundell@proton.me', 'active');
```

This automatically triggered creation of:
- User balance records (USD $0.00, version=1)
- Player loyalty records (Bronze tier, 0 points)

## Verification

All 3 users now have complete records:

| Email | User ID | Balance | Currency | Tier | Points |
|-------|---------|---------|----------|------|--------|
| josnell1999@gmail.com | de937a97-... | $100.00 | AUD | Bronze | 0 |
| nicholasblundell@proton.me | 173aebff-... | $0.00 | USD | Bronze | 0 |
| test@mypokies.com | 8b935796-... | $0.00 | USD | Bronze | 0 |

✅ All users have `account_status = 'active'`
✅ All users have user_balances with `version = 1`
✅ All users have loyalty tier assignments (Bronze, tier_level=1)
✅ All users linked to auth via `auth_user_id`

## Impact

- ✅ **Login flow now works** - RLS policies can find user records
- ✅ **New signups automatically get casino records** - no manual intervention needed
- ✅ **Data consistency** - every auth user has matching casino records
- ✅ **Check constraints satisfied** - all balances have version ≥ 1
- ✅ **Zero breaking changes** - existing functionality preserved

## Files Modified

1. `supabase/migrations/20251015000001_create_user_on_signup_trigger.sql` - Created triggers
2. `supabase/migrations/20251015000002_fix_user_balance_version.sql` - Fixed version constraint
3. `supabase/migrations/20251015000003_fix_user_balance_version_correct_table.sql` - Fixed table name

## Known Issues

- There's a duplicate `test@mypokies.com` record (old orphaned record without auth_user_id) that should be cleaned up
- Old record: `c4236c8a-f2b1-4959-800d-82f0ac0f0738` (no auth link, AUD $100)
- New record: `8b935796-ab52-4b79-bbce-ce38f6fe2613` (auth linked, USD $0)

## Date Fixed

2025-10-15

## Database Version

PostgreSQL 17.6.1.013 (Supabase)
