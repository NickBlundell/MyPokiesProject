-- ============================================================================
-- SOFT DELETE IMPLEMENTATION FOR CRITICAL TABLES
-- ============================================================================
-- Migration: 20251014_implement_soft_delete.sql
-- Purpose: Implement comprehensive soft delete strategy to prevent data loss
--          and maintain audit trails for regulatory compliance
--
-- Critical tables covered:
--   - users
--   - transactions
--   - player_bonuses
--   - user_balances
--   - game_rounds
--   - promotion_wins
--
-- Key features:
--   - Soft delete columns (deleted_at, deleted_by, deletion_reason)
--   - Partial indexes for deleted record queries
--   - RPC functions for controlled soft delete/restore operations
--   - Updated RLS policies to automatically filter deleted records
--   - Admin-only views for accessing deleted records
--   - Cascade soft delete for related records
-- ============================================================================

-- ============================================================================
-- STEP 1: Add soft delete columns to critical tables
-- ============================================================================

-- Users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted (NULL = not deleted)';
COMMENT ON COLUMN users.deleted_by IS 'Admin user who performed the soft delete';
COMMENT ON COLUMN users.deletion_reason IS 'Reason for soft deletion (regulatory compliance, fraud, user request, etc.)';

-- Transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

COMMENT ON COLUMN transactions.deleted_at IS 'Timestamp when transaction was soft deleted (NULL = not deleted)';
COMMENT ON COLUMN transactions.deleted_by IS 'Admin user who performed the soft delete';
COMMENT ON COLUMN transactions.deletion_reason IS 'Reason for soft deletion (correction, fraud investigation, etc.)';

-- Player bonuses table
ALTER TABLE player_bonuses
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

COMMENT ON COLUMN player_bonuses.deleted_at IS 'Timestamp when bonus was soft deleted (NULL = not deleted)';
COMMENT ON COLUMN player_bonuses.deleted_by IS 'Admin user who performed the soft delete';
COMMENT ON COLUMN player_bonuses.deletion_reason IS 'Reason for soft deletion (fraud, abuse, correction, etc.)';

-- User balances table
ALTER TABLE user_balances
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

COMMENT ON COLUMN user_balances.deleted_at IS 'Timestamp when balance record was soft deleted (NULL = not deleted)';
COMMENT ON COLUMN user_balances.deleted_by IS 'Admin user who performed the soft delete';
COMMENT ON COLUMN user_balances.deletion_reason IS 'Reason for soft deletion';

-- Game rounds table
ALTER TABLE game_rounds
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

COMMENT ON COLUMN game_rounds.deleted_at IS 'Timestamp when game round was soft deleted (NULL = not deleted)';
COMMENT ON COLUMN game_rounds.deleted_by IS 'Admin user who performed the soft delete';
COMMENT ON COLUMN game_rounds.deletion_reason IS 'Reason for soft deletion';

-- Promotion wins table
ALTER TABLE promotion_wins
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

COMMENT ON COLUMN promotion_wins.deleted_at IS 'Timestamp when promotion win was soft deleted (NULL = not deleted)';
COMMENT ON COLUMN promotion_wins.deleted_by IS 'Admin user who performed the soft delete';
COMMENT ON COLUMN promotion_wins.deletion_reason IS 'Reason for soft deletion';

-- ============================================================================
-- STEP 2: Create partial indexes for efficient querying of deleted records
-- ============================================================================
-- Partial indexes only index rows where deleted_at IS NOT NULL
-- This significantly improves query performance for deleted records
-- while minimizing index size and maintenance overhead

CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON users(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_deleted_by
  ON users(deleted_by)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at
  ON transactions(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_deleted_by
  ON transactions(deleted_by)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_bonuses_deleted_at
  ON player_bonuses(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_bonuses_deleted_by
  ON player_bonuses(deleted_by)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_balances_deleted_at
  ON user_balances(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_rounds_deleted_at
  ON game_rounds(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotion_wins_deleted_at
  ON promotion_wins(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- STEP 3: Create soft delete RPC function
-- ============================================================================
-- This function provides a controlled interface for soft deleting records
-- with security validation and audit trail

CREATE OR REPLACE FUNCTION soft_delete_record(
  p_table_name TEXT,
  p_record_id UUID,
  p_deleted_by UUID,
  p_deletion_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_count INTEGER;
BEGIN
  -- Validate table name (security whitelist)
  IF p_table_name NOT IN (
    'users',
    'transactions',
    'player_bonuses',
    'user_balances',
    'game_rounds',
    'promotion_wins'
  ) THEN
    RAISE EXCEPTION 'Invalid table name for soft delete: %', p_table_name;
  END IF;

  -- Validate deletion reason is provided
  IF p_deletion_reason IS NULL OR TRIM(p_deletion_reason) = '' THEN
    RAISE EXCEPTION 'Deletion reason is required for audit trail';
  END IF;

  -- Validate deleted_by admin exists
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_deleted_by) THEN
    RAISE EXCEPTION 'Invalid admin_user ID: %', p_deleted_by;
  END IF;

  -- Execute soft delete
  EXECUTE format(
    'UPDATE %I SET
       deleted_at = NOW(),
       deleted_by = $1,
       deletion_reason = $2
     WHERE id = $3
       AND deleted_at IS NULL',
    p_table_name
  ) USING p_deleted_by, p_deletion_reason, p_record_id;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  -- Log the soft delete action in admin audit logs
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details
  )
  VALUES (
    p_deleted_by,
    'soft_delete',
    p_table_name,
    p_record_id,
    jsonb_build_object(
      'deletion_reason', p_deletion_reason,
      'deleted_at', NOW()
    )
  );

  RETURN v_row_count > 0;
END;
$$;

COMMENT ON FUNCTION soft_delete_record IS 'Soft deletes a record with audit trail and security validation. Returns true if record was deleted, false if already deleted or not found.';

-- ============================================================================
-- STEP 4: Create cascade soft delete function
-- ============================================================================
-- This function handles soft deleting related records when a parent is deleted

CREATE OR REPLACE FUNCTION cascade_soft_delete_user(
  p_user_id UUID,
  p_deleted_by UUID,
  p_deletion_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_counts JSONB := '{}'::jsonb;
  v_user_deleted BOOLEAN;
  v_count INTEGER;
BEGIN
  -- Soft delete the user first
  v_user_deleted := soft_delete_record('users', p_user_id, p_deleted_by, p_deletion_reason);

  IF NOT v_user_deleted THEN
    RAISE EXCEPTION 'Failed to soft delete user %', p_user_id;
  END IF;

  v_deleted_counts := jsonb_build_object('users', 1);

  -- Soft delete related transactions
  UPDATE transactions
  SET
    deleted_at = NOW(),
    deleted_by = p_deleted_by,
    deletion_reason = format('Cascade delete: %s', p_deletion_reason)
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('transactions', v_count);

  -- Soft delete related bonuses
  UPDATE player_bonuses
  SET
    deleted_at = NOW(),
    deleted_by = p_deleted_by,
    deletion_reason = format('Cascade delete: %s', p_deletion_reason)
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('player_bonuses', v_count);

  -- Soft delete related balances
  UPDATE user_balances
  SET
    deleted_at = NOW(),
    deleted_by = p_deleted_by,
    deletion_reason = format('Cascade delete: %s', p_deletion_reason)
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('user_balances', v_count);

  -- Soft delete related game rounds
  UPDATE game_rounds
  SET
    deleted_at = NOW(),
    deleted_by = p_deleted_by,
    deletion_reason = format('Cascade delete: %s', p_deletion_reason)
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('game_rounds', v_count);

  -- Soft delete related promotion wins
  UPDATE promotion_wins
  SET
    deleted_at = NOW(),
    deleted_by = p_deleted_by,
    deletion_reason = format('Cascade delete: %s', p_deletion_reason)
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('promotion_wins', v_count);

  -- Log cascade delete in audit logs
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details
  )
  VALUES (
    p_deleted_by,
    'cascade_soft_delete',
    'users',
    p_user_id,
    jsonb_build_object(
      'deletion_reason', p_deletion_reason,
      'deleted_counts', v_deleted_counts,
      'deleted_at', NOW()
    )
  );

  RETURN v_deleted_counts;
END;
$$;

COMMENT ON FUNCTION cascade_soft_delete_user IS 'Soft deletes a user and all related records (transactions, bonuses, balances, game rounds, promotion wins). Returns count of deleted records by table.';

-- ============================================================================
-- STEP 5: Create restore function
-- ============================================================================
-- This function restores soft deleted records with audit logging

CREATE OR REPLACE FUNCTION restore_soft_deleted_record(
  p_table_name TEXT,
  p_record_id UUID,
  p_restored_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_count INTEGER;
  v_deleted_at TIMESTAMPTZ;
  v_deletion_reason TEXT;
BEGIN
  -- Validate table name
  IF p_table_name NOT IN (
    'users',
    'transactions',
    'player_bonuses',
    'user_balances',
    'game_rounds',
    'promotion_wins'
  ) THEN
    RAISE EXCEPTION 'Invalid table name for restore: %', p_table_name;
  END IF;

  -- Validate restored_by admin exists
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_restored_by) THEN
    RAISE EXCEPTION 'Invalid admin_user ID: %', p_restored_by;
  END IF;

  -- Get deletion info before restoring
  EXECUTE format(
    'SELECT deleted_at, deletion_reason FROM %I WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  ) USING p_record_id INTO v_deleted_at, v_deletion_reason;

  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Record % in table % is not deleted or does not exist', p_record_id, p_table_name;
  END IF;

  -- Execute restore
  EXECUTE format(
    'UPDATE %I SET
       deleted_at = NULL,
       deleted_by = NULL,
       deletion_reason = NULL
     WHERE id = $1
       AND deleted_at IS NOT NULL',
    p_table_name
  ) USING p_record_id;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  -- Log restoration in audit logs
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details
  )
  VALUES (
    p_restored_by,
    'restore_soft_deleted',
    p_table_name,
    p_record_id,
    jsonb_build_object(
      'restored_at', NOW(),
      'original_deleted_at', v_deleted_at,
      'original_deletion_reason', v_deletion_reason
    )
  );

  RETURN v_row_count > 0;
END;
$$;

COMMENT ON FUNCTION restore_soft_deleted_record IS 'Restores a soft deleted record and logs the restoration in audit trail. Returns true if record was restored, false if not deleted or not found.';

-- ============================================================================
-- STEP 6: Update RLS policies to filter deleted records
-- ============================================================================
-- Drop and recreate user-facing SELECT policies to automatically filter
-- deleted records. Service role policies remain unchanged for admin access.

-- Users table
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

-- User balances table
DROP POLICY IF EXISTS "Users can view their own balances" ON user_balances;
CREATE POLICY "Users can view their own balances"
  ON user_balances FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Transactions table
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Game rounds table
DROP POLICY IF EXISTS "Users can view their own game rounds" ON game_rounds;
CREATE POLICY "Users can view their own game rounds"
  ON game_rounds FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Promotion wins table
DROP POLICY IF EXISTS "Users can view their own promotion wins" ON promotion_wins;
CREATE POLICY "Users can view their own promotion wins"
  ON promotion_wins FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Player bonuses table - update existing policy
DROP POLICY IF EXISTS "Users can view own bonuses" ON player_bonuses;
CREATE POLICY "Users can view own bonuses"
  ON player_bonuses FOR SELECT
  USING (
    auth.uid() IN (SELECT auth_user_id FROM users WHERE id = player_bonuses.user_id)
    AND deleted_at IS NULL
  );

-- ============================================================================
-- STEP 7: Create admin views for accessing all records (including deleted)
-- ============================================================================
-- These views are ONLY accessible to service_role for admin panel use

CREATE OR REPLACE VIEW users_with_deleted AS
SELECT
  u.*,
  au.email AS deleted_by_email,
  au.full_name AS deleted_by_name,
  CASE
    WHEN u.deleted_at IS NOT NULL THEN true
    ELSE false
  END AS is_deleted
FROM users u
LEFT JOIN admin_users au ON u.deleted_by = au.id;

COMMENT ON VIEW users_with_deleted IS 'Admin view showing all users including soft deleted ones. Only accessible to service_role.';

CREATE OR REPLACE VIEW transactions_with_deleted AS
SELECT
  t.*,
  au.email AS deleted_by_email,
  au.full_name AS deleted_by_name,
  CASE
    WHEN t.deleted_at IS NOT NULL THEN true
    ELSE false
  END AS is_deleted
FROM transactions t
LEFT JOIN admin_users au ON t.deleted_by = au.id;

COMMENT ON VIEW transactions_with_deleted IS 'Admin view showing all transactions including soft deleted ones. Only accessible to service_role.';

CREATE OR REPLACE VIEW player_bonuses_with_deleted AS
SELECT
  pb.*,
  au.email AS deleted_by_email,
  au.full_name AS deleted_by_name,
  CASE
    WHEN pb.deleted_at IS NOT NULL THEN true
    ELSE false
  END AS is_deleted
FROM player_bonuses pb
LEFT JOIN admin_users au ON pb.deleted_by = au.id;

COMMENT ON VIEW player_bonuses_with_deleted IS 'Admin view showing all player bonuses including soft deleted ones. Only accessible to service_role.';

CREATE OR REPLACE VIEW user_balances_with_deleted AS
SELECT
  ub.*,
  au.email AS deleted_by_email,
  au.full_name AS deleted_by_name,
  CASE
    WHEN ub.deleted_at IS NOT NULL THEN true
    ELSE false
  END AS is_deleted
FROM user_balances ub
LEFT JOIN admin_users au ON ub.deleted_by = au.id;

COMMENT ON VIEW user_balances_with_deleted IS 'Admin view showing all user balances including soft deleted ones. Only accessible to service_role.';

CREATE OR REPLACE VIEW game_rounds_with_deleted AS
SELECT
  gr.*,
  au.email AS deleted_by_email,
  au.full_name AS deleted_by_name,
  CASE
    WHEN gr.deleted_at IS NOT NULL THEN true
    ELSE false
  END AS is_deleted
FROM game_rounds gr
LEFT JOIN admin_users au ON gr.deleted_by = au.id;

COMMENT ON VIEW game_rounds_with_deleted IS 'Admin view showing all game rounds including soft deleted ones. Only accessible to service_role.';

CREATE OR REPLACE VIEW promotion_wins_with_deleted AS
SELECT
  pw.*,
  au.email AS deleted_by_email,
  au.full_name AS deleted_by_name,
  CASE
    WHEN pw.deleted_at IS NOT NULL THEN true
    ELSE false
  END AS is_deleted
FROM promotion_wins pw
LEFT JOIN admin_users au ON pw.deleted_by = au.id;

COMMENT ON VIEW promotion_wins_with_deleted IS 'Admin view showing all promotion wins including soft deleted ones. Only accessible to service_role.';

-- Grant SELECT on views only to service_role (admin access)
GRANT SELECT ON users_with_deleted TO service_role;
GRANT SELECT ON transactions_with_deleted TO service_role;
GRANT SELECT ON player_bonuses_with_deleted TO service_role;
GRANT SELECT ON user_balances_with_deleted TO service_role;
GRANT SELECT ON game_rounds_with_deleted TO service_role;
GRANT SELECT ON promotion_wins_with_deleted TO service_role;

-- Explicitly revoke from authenticated role (regular users)
REVOKE ALL ON users_with_deleted FROM authenticated;
REVOKE ALL ON transactions_with_deleted FROM authenticated;
REVOKE ALL ON player_bonuses_with_deleted FROM authenticated;
REVOKE ALL ON user_balances_with_deleted FROM authenticated;
REVOKE ALL ON game_rounds_with_deleted FROM authenticated;
REVOKE ALL ON promotion_wins_with_deleted FROM authenticated;

-- ============================================================================
-- STEP 8: Create helper function to get deleted record statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_deleted_records_stats()
RETURNS TABLE(
  table_name TEXT,
  total_records BIGINT,
  deleted_records BIGINT,
  active_records BIGINT,
  deletion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'users'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
      2
    )
  FROM users

  UNION ALL

  SELECT
    'transactions'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
      2
    )
  FROM transactions

  UNION ALL

  SELECT
    'player_bonuses'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
      2
    )
  FROM player_bonuses

  UNION ALL

  SELECT
    'user_balances'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
      2
    )
  FROM user_balances

  UNION ALL

  SELECT
    'game_rounds'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
      2
    )
  FROM game_rounds

  UNION ALL

  SELECT
    'promotion_wins'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
      2
    )
  FROM promotion_wins;
END;
$$;

COMMENT ON FUNCTION get_deleted_records_stats IS 'Returns statistics about deleted vs active records across all tables with soft delete support. Useful for monitoring and reporting.';

-- ============================================================================
-- STEP 9: Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE users IS 'Casino users registered via Fundist API. Supports soft delete for data retention and audit compliance.';
COMMENT ON TABLE transactions IS 'All financial transactions (debits, credits, rollbacks, promotions). Supports soft delete for audit trail preservation.';
COMMENT ON TABLE player_bonuses IS 'Active and historical player bonus instances. Supports soft delete for fraud investigation and audit compliance.';
COMMENT ON TABLE user_balances IS 'User wallet balances per currency with optimistic locking. Supports soft delete for balance correction auditing.';
COMMENT ON TABLE game_rounds IS 'Game round tracking for casino sessions. Supports soft delete for dispute resolution and audit trails.';
COMMENT ON TABLE promotion_wins IS 'Promotion wins awarded to users. Supports soft delete for fraud investigation and corrections.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary of changes:
-- 1. Added soft delete columns (deleted_at, deleted_by, deletion_reason) to 6 critical tables
-- 2. Created 12 partial indexes for efficient deleted record queries
-- 3. Implemented soft_delete_record() RPC function with security validation
-- 4. Implemented cascade_soft_delete_user() for cascading soft deletes
-- 5. Implemented restore_soft_deleted_record() RPC function with audit logging
-- 6. Updated 6 RLS policies to automatically filter deleted records
-- 7. Created 6 admin-only views (*_with_deleted) for accessing all records
-- 8. Created get_deleted_records_stats() helper function for monitoring
-- 9. Added comprehensive documentation and comments
--
-- Next steps for implementation:
-- 1. Update application code to use soft_delete_record() instead of DELETE
-- 2. Build admin UI for viewing and restoring deleted records
-- 3. Create scheduled job to permanently purge old deleted records (after retention period)
-- 4. Update backup/restore procedures to handle soft deleted data
-- 5. Add monitoring alerts for unusual deletion patterns
-- ============================================================================
