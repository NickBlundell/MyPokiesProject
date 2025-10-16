# Security Improvements Implementation Guide

This document describes the security fixes implemented to address Supabase database linter warnings.

## Overview

Three major security issues were identified and fixed:
1. Function Search Path Mutable (109 functions)
2. Materialized Views exposed in API (3 views)
3. Leaked Password Protection Disabled

## 1. Function Search Path Security

### Issue
Functions without explicit `search_path` settings are vulnerable to search path manipulation attacks, where malicious users could potentially inject code by creating schemas/functions with similar names.

### Solution Implemented
Created migration `20251014_fix_function_search_paths.sql` that:
- Dynamically discovers all public schema functions without search_path
- Sets `search_path = ''` for each function
- Validates that all functions are secured

### Files Modified
- `apps/casino/supabase/migrations/20251014_fix_function_search_paths.sql`

### How to Apply
```bash
# For local development
cd apps/casino
supabase db push

# For production
supabase db push --project-ref hupruyttzgeytlysobar
```

## 2. Materialized View Security

### Issue
Materialized views containing sensitive analytics data were accessible via the Data API without proper Row Level Security (RLS) policies:
- `daily_performance_snapshot`
- `revenue_analytics`
- `player_cohort_analysis`

### Solution Implemented
Created migration `20251014_secure_materialized_views.sql` that:
- Enables RLS on all materialized views
- Creates admin-only access policies
- Adds service role policies for refresh operations
- Secures any other materialized views found in the schema

### Files Modified
- `apps/casino/supabase/migrations/20251014_secure_materialized_views.sql`

### How to Apply
```bash
# For local development
cd apps/casino
supabase db push

# For production
supabase db push --project-ref hupruyttzgeytlysobar
```

## 3. Leaked Password Protection

### Issue
Supabase Auth was not checking user passwords against the HaveIBeenPwned.org database of compromised passwords, allowing users to set weak or previously leaked passwords.

### Solution Implemented

#### For Local Development
Updated both config files to enable password leak protection:
- `apps/casino/supabase/config.toml`
- `apps/admin/supabase/config.toml`

Added the following configuration:
```toml
[auth.password]
min_length = 8
required_characters = ["lower", "upper", "number"]
enable_leak_protection = true
```

#### For Production
You need to enable this setting via the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/hupruyttzgeytlysobar)
2. Navigate to **Authentication** → **Policies** (or **Settings**)
3. Find **Password Security** section
4. Enable **"Leaked password protection"**
5. Configure password requirements:
   - Minimum length: 8 characters
   - Required characters: lowercase, uppercase, numbers
6. Click **Save**

Alternatively, you can use the Supabase Management API:
```bash
# Using the Supabase CLI
supabase --project-ref hupruyttzgeytlysobar auth update \
  --password-min-length 8 \
  --password-required-characters lower,upper,number \
  --enable-leak-protection
```

### Files Modified
- `apps/casino/supabase/config.toml`
- `apps/admin/supabase/config.toml`

## Verification

After applying all fixes, verify they're working:

### 1. Check Function Search Paths
```sql
-- Should return 0 rows (all functions should have search_path)
SELECT
    p.proname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
FROM pg_catalog.pg_proc p
INNER JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prokind = 'f'
AND NOT (p.proconfig IS NOT NULL AND 'search_path' = ANY(
    SELECT split_part(unnest(p.proconfig), '=', 1)
));
```

### 2. Check Materialized View RLS
```sql
-- Should show all materialized views have RLS enabled
SELECT
    schemaname,
    matviewname,
    c.relrowsecurity AS has_rls
FROM pg_matviews mv
JOIN pg_class c ON c.relname = mv.matviewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = mv.schemaname
WHERE schemaname = 'public';
```

### 3. Check Auth Password Protection
Test by trying to create an account with a known leaked password (e.g., "password123"). It should be rejected.

### 4. Run Supabase Linter
```bash
# Get security advisors
supabase --project-ref hupruyttzgeytlysobar advisors get --type security
```

## Expected Results

After applying all fixes:
- ✅ All 109 functions have explicit search_path
- ✅ All 3 materialized views have RLS policies (admin-only)
- ✅ Password leak protection is enabled
- ✅ No more security warnings from Supabase linter

## Deployment Checklist

- [ ] Apply function search path migration to production
- [ ] Apply materialized view security migration to production
- [ ] Enable leaked password protection in Supabase Dashboard
- [ ] Verify all linter warnings are resolved
- [ ] Test admin access to materialized views
- [ ] Test password creation with leaked passwords (should fail)
- [ ] Document any additional custom views that need RLS

## Production Deployment Commands

```bash
# 1. Push migrations to production
cd apps/casino
supabase db push --project-ref hupruyttzgeytlysobar

# 2. Verify migrations were applied
supabase db diff --linked

# 3. Check for any remaining linter warnings
supabase advisors get --type security --project-ref hupruyttzgeytlysobar

# 4. If using MCP server, you can also enable via API
# (Requires project ref and service role key)
```

## Monitoring and Maintenance

### Ongoing Security Practices

1. **New Functions**: When creating new functions, always include `SET search_path = ''`:
   ```sql
   CREATE FUNCTION my_function()
   RETURNS void AS $$
   BEGIN
       -- function body
   END;
   $$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';  -- Always add this
   ```

2. **New Materialized Views**: Always enable RLS and create appropriate policies:
   ```sql
   CREATE MATERIALIZED VIEW my_analytics AS ...;
   ALTER MATERIALIZED VIEW my_analytics ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Admin access" ON my_analytics FOR SELECT
       USING (EXISTS (
           SELECT 1 FROM admin_users
           WHERE admin_users.auth_user_id = auth.uid()
       ));
   ```

3. **Regular Audits**: Run the linter monthly:
   ```bash
   supabase advisors get --type security
   ```

## References

- [Supabase Function Search Path Security](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Supabase Materialized View Security](https://supabase.com/docs/guides/database/database-linter?lint=0016_materialized_view_in_api)
- [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)

## Support

If you encounter issues:
1. Check the migration logs in Supabase Dashboard
2. Verify your service role key has sufficient permissions
3. Ensure you're connected to the correct project
4. Review the Supabase logs for detailed error messages
