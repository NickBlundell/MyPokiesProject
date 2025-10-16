-- ============================================================================
-- Transaction Isolation for Balance Updates
-- ============================================================================
-- This migration adds a PostgreSQL RPC function with SERIALIZABLE isolation
-- to prevent race conditions and data corruption during concurrent balance updates.
--
-- The function provides:
-- - SERIALIZABLE transaction isolation level
-- - Row-level locking (SELECT FOR UPDATE)
-- - Optimistic locking via version field
-- - Automatic transaction logging
-- - Comprehensive error handling
-- - Retry hints for serialization failures
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_balance_transaction(
  p_user_id UUID,
  p_currency VARCHAR(3),
  p_amount DECIMAL(20, 8),
  p_transaction_type VARCHAR(50),
  p_transaction_id VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance DECIMAL(20, 8),
  balance_before DECIMAL(20, 8),
  transaction_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL(20, 8);
  v_new_balance DECIMAL(20, 8);
  v_transaction_id UUID;
  v_current_version INTEGER;
  v_balance_record_id UUID;
BEGIN
  -- Set SERIALIZABLE isolation to prevent race conditions
  -- This ensures that concurrent transactions are executed as if they were sequential
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

  -- Lock the user balance row for update to prevent concurrent modifications
  -- This blocks other transactions from reading this row until we're done
  SELECT balance, version, id
  INTO v_current_balance, v_current_version, v_balance_record_id
  FROM user_balances
  WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE;

  -- Check if user balance exists
  IF NOT FOUND THEN
    -- Try to initialize the balance if user exists
    INSERT INTO user_balances (user_id, currency, balance, version)
    VALUES (p_user_id, p_currency, 0, 0)
    ON CONFLICT (user_id, currency) DO NOTHING
    RETURNING balance, version, id INTO v_current_balance, v_current_version, v_balance_record_id;

    -- If still not found, user doesn't exist
    IF v_current_balance IS NULL THEN
      RETURN QUERY SELECT FALSE, 0.00::DECIMAL(20,8), 0.00::DECIMAL(20,8), NULL::UUID, 'User balance not found'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;

  -- Validate new balance is non-negative
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;

  -- Update balance with version check (optimistic locking)
  -- The version check ensures no other transaction modified the balance since we read it
  UPDATE user_balances
  SET
    balance = v_new_balance,
    version = version + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND currency = p_currency
    AND version = v_current_version;

  -- Check if update succeeded
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, 'Concurrent modification detected'::TEXT;
    RETURN;
  END IF;

  -- Create transaction record
  INSERT INTO transactions (
    tid,
    user_id,
    currency,
    type,
    subtype,
    amount,
    balance_before,
    balance_after,
    game_round_id,
    action_id,
    game_id,
    rollback_tid,
    promotion_id
  )
  SELECT
    p_transaction_id,
    p_user_id,
    p_currency,
    p_transaction_type,
    COALESCE((p_metadata->>'subtype')::VARCHAR(50), p_transaction_type),
    p_amount,
    v_current_balance,
    v_new_balance,
    (p_metadata->>'game_round_id')::UUID,
    (p_metadata->>'action_id')::INTEGER,
    (p_metadata->>'game_id')::INTEGER,
    (p_metadata->>'rollback_tid')::VARCHAR(255),
    (p_metadata->>'promotion_id')::UUID
  RETURNING id INTO v_transaction_id;

  -- Return success with all relevant information
  RETURN QUERY SELECT TRUE, v_new_balance, v_current_balance, v_transaction_id, NULL::TEXT;

EXCEPTION
  WHEN serialization_failure THEN
    -- This occurs when two transactions conflict under SERIALIZABLE isolation
    -- The caller should retry the transaction
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, 'Serialization failure - retry required'::TEXT;
  WHEN unique_violation THEN
    -- Duplicate transaction ID - this is an idempotency check
    -- Return the existing transaction details
    SELECT balance_after, balance_before, id
    INTO v_new_balance, v_current_balance, v_transaction_id
    FROM transactions
    WHERE tid = p_transaction_id;

    RETURN QUERY SELECT TRUE, v_new_balance, v_current_balance, v_transaction_id, 'Duplicate transaction ID - returning existing'::TEXT;
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error in execute_balance_transaction: % %', SQLSTATE, SQLERRM;
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, SQLERRM::TEXT;
END;
$$;

-- Add helpful comment for documentation
COMMENT ON FUNCTION execute_balance_transaction IS
  'Atomically updates user balance with SERIALIZABLE isolation to prevent race conditions.
   Includes optimistic locking via version field, automatic transaction logging, and idempotency.

   Parameters:
   - p_user_id: User UUID
   - p_currency: ISO 4217 currency code (e.g., AUD, USD)
   - p_amount: Amount to add (positive) or subtract (negative)
   - p_transaction_type: Type of transaction (debit, credit, rollback, promotion_win)
   - p_transaction_id: Unique transaction ID (ensures idempotency)
   - p_description: Optional description
   - p_metadata: JSONB object with optional fields:
     * subtype: Transaction subtype
     * game_round_id: UUID of game round
     * action_id: Action ID from game provider
     * game_id: Game ID from game provider
     * rollback_tid: Original transaction ID being rolled back
     * promotion_id: UUID of promotion

   Returns:
   - success: Boolean indicating if operation succeeded
   - new_balance: Updated balance after transaction
   - balance_before: Balance before transaction
   - transaction_id: UUID of created transaction record
   - error_message: Error message if failed, NULL if successful';

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION execute_balance_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION execute_balance_transaction TO service_role;

-- ============================================================================
-- Alternative Function: create_transaction_idempotent
-- ============================================================================
-- This is an alternative interface that matches the exact parameters used by
-- the edge function handlers. It provides the same SERIALIZABLE isolation
-- guarantees but with a more specific parameter list.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_transaction_idempotent(
  p_user_id UUID,
  p_currency VARCHAR(3),
  p_amount DECIMAL(20, 8),
  p_type VARCHAR(20),
  p_subtype VARCHAR(50),
  p_tid VARCHAR(255),
  p_game_round_id UUID DEFAULT NULL,
  p_action_id INTEGER DEFAULT NULL,
  p_game_id INTEGER DEFAULT NULL,
  p_rollback_tid VARCHAR(255) DEFAULT NULL,
  p_promotion_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance DECIMAL(20, 8),
  balance_before DECIMAL(20, 8),
  transaction_id UUID,
  was_duplicate BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL(20, 8);
  v_new_balance DECIMAL(20, 8);
  v_transaction_id UUID;
  v_current_version INTEGER;
  v_was_duplicate BOOLEAN := FALSE;
BEGIN
  -- Set SERIALIZABLE isolation to prevent race conditions
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

  -- Check for duplicate transaction ID first (idempotency)
  SELECT id, balance_after, balance_before
  INTO v_transaction_id, v_new_balance, v_current_balance
  FROM transactions
  WHERE tid = p_tid;

  IF FOUND THEN
    -- Transaction already exists, return existing result
    RETURN QUERY SELECT TRUE, v_new_balance, v_current_balance, v_transaction_id, TRUE, NULL::TEXT;
    RETURN;
  END IF;

  -- Lock the user balance row for update
  SELECT balance, version
  INTO v_current_balance, v_current_version
  FROM user_balances
  WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE;

  -- Check if user balance exists
  IF NOT FOUND THEN
    -- Try to initialize the balance
    INSERT INTO user_balances (user_id, currency, balance, version)
    VALUES (p_user_id, p_currency, 0, 0)
    ON CONFLICT (user_id, currency) DO NOTHING
    RETURNING balance, version INTO v_current_balance, v_current_version;

    IF v_current_balance IS NULL THEN
      RETURN QUERY SELECT FALSE, 0.00::DECIMAL(20,8), 0.00::DECIMAL(20,8), NULL::UUID, FALSE, 'User balance not found'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;

  -- Validate new balance is non-negative
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, FALSE, 'Insufficient funds'::TEXT;
    RETURN;
  END IF;

  -- Update balance with version check
  UPDATE user_balances
  SET
    balance = v_new_balance,
    version = version + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND currency = p_currency
    AND version = v_current_version;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, FALSE, 'Concurrent modification detected'::TEXT;
    RETURN;
  END IF;

  -- Create transaction record
  INSERT INTO transactions (
    tid,
    user_id,
    currency,
    type,
    subtype,
    amount,
    balance_before,
    balance_after,
    game_round_id,
    action_id,
    game_id,
    rollback_tid,
    promotion_id
  ) VALUES (
    p_tid,
    p_user_id,
    p_currency,
    p_type,
    p_subtype,
    p_amount,
    v_current_balance,
    v_new_balance,
    p_game_round_id,
    p_action_id,
    p_game_id,
    p_rollback_tid,
    p_promotion_id
  )
  RETURNING id INTO v_transaction_id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_new_balance, v_current_balance, v_transaction_id, v_was_duplicate, NULL::TEXT;

EXCEPTION
  WHEN serialization_failure THEN
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, FALSE, 'Serialization failure - retry required'::TEXT;
  WHEN unique_violation THEN
    -- Another transaction created the same TID between our check and insert
    SELECT id, balance_after, balance_before
    INTO v_transaction_id, v_new_balance, v_current_balance
    FROM transactions
    WHERE tid = p_tid;

    RETURN QUERY SELECT TRUE, v_new_balance, v_current_balance, v_transaction_id, TRUE, NULL::TEXT;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in create_transaction_idempotent: % %', SQLSTATE, SQLERRM;
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$;

COMMENT ON FUNCTION create_transaction_idempotent IS
  'Creates a new transaction with SERIALIZABLE isolation and automatic idempotency handling.
   This function is specifically designed for OneWallet callback handlers.

   Parameters match the transactions table columns exactly for easy integration.

   Returns:
   - success: Boolean indicating operation success
   - new_balance: Balance after transaction
   - balance_before: Balance before transaction
   - transaction_id: UUID of transaction record
   - was_duplicate: TRUE if this was a duplicate TID (idempotent response)
   - error_message: Error message if failed, NULL if successful';

GRANT EXECUTE ON FUNCTION create_transaction_idempotent TO authenticated;
GRANT EXECUTE ON FUNCTION create_transaction_idempotent TO service_role;

-- ============================================================================
-- Helper function for easy balance checks with proper locking
-- ============================================================================

CREATE OR REPLACE FUNCTION get_balance_for_update(
  p_user_id UUID,
  p_currency VARCHAR(3)
)
RETURNS TABLE(
  balance DECIMAL(20, 8),
  version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ub.balance, ub.version
  FROM user_balances ub
  WHERE ub.user_id = p_user_id AND ub.currency = p_currency
  FOR UPDATE;
END;
$$;

COMMENT ON FUNCTION get_balance_for_update IS
  'Gets user balance with row lock (SELECT FOR UPDATE) to prevent concurrent modifications.
   Use this when you need to check balance before performing operations.';

GRANT EXECUTE ON FUNCTION get_balance_for_update TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_for_update TO service_role;
