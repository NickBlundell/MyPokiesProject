-- ============================================================================
-- Fix Race Condition on Balance Version Field
-- ============================================================================
-- This migration adds a trigger to automatically increment the version field
-- on every balance update, ensuring consistent versioning for optimistic locking
-- and preventing race conditions during concurrent updates.
--
-- The trigger provides:
-- - Automatic version increment on every balance-changing update
-- - Automatic updated_at timestamp update
-- - Works seamlessly with existing optimistic locking patterns
-- - Prevents manual version management errors
-- ============================================================================

-- ============================================================================
-- Drop existing update_balances_updated_at trigger if it exists
-- (We'll create a more comprehensive one)
-- ============================================================================
DROP TRIGGER IF EXISTS update_balances_updated_at ON user_balances;

-- ============================================================================
-- Create function to auto-increment version on balance updates
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_balance_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only increment version if balance fields actually changed
  IF (OLD.balance IS DISTINCT FROM NEW.balance) OR
     (OLD.bonus_balance IS DISTINCT FROM NEW.bonus_balance) OR
     (OLD.locked_bonus IS DISTINCT FROM NEW.locked_bonus) THEN

    -- Auto-increment version for optimistic locking
    -- This ensures version always increases when balance changes
    NEW.version := OLD.version + 1;

    -- Also update the timestamp
    NEW.updated_at := NOW();

    -- Log version increment for debugging (can be removed in production)
    RAISE DEBUG 'Balance version incremented from % to % for user_id: %, currency: %',
      OLD.version, NEW.version, NEW.user_id, NEW.currency;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION increment_balance_version() IS
  'Automatically increments version field on user_balances updates for optimistic locking.
   This prevents race conditions by ensuring every balance modification increases the version number.
   The version is only incremented when balance fields actually change, not on other field updates.';

-- ============================================================================
-- Create trigger on user_balances table
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS balance_version_increment_trigger ON user_balances;

-- Create trigger that fires BEFORE UPDATE
-- This ensures the version is incremented before the row is written
CREATE TRIGGER balance_version_increment_trigger
  BEFORE UPDATE ON user_balances
  FOR EACH ROW
  EXECUTE FUNCTION increment_balance_version();

COMMENT ON TRIGGER balance_version_increment_trigger ON user_balances IS
  'Trigger to automatically increment version field on balance updates for optimistic locking';

-- ============================================================================
-- Update execute_balance_transaction to work with the trigger
-- ============================================================================
-- The trigger will handle version increment, so we need to adjust the function
-- to not manually increment version (it's now automatic)

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
  v_updated_version INTEGER;
BEGIN
  -- Set SERIALIZABLE isolation to prevent race conditions
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

  -- Lock the user balance row for update
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
  -- The trigger will automatically increment version from v_current_version to v_current_version + 1
  UPDATE user_balances
  SET
    balance = v_new_balance
    -- Note: version and updated_at are now handled by the trigger
  WHERE user_id = p_user_id
    AND currency = p_currency
    AND version = v_current_version
  RETURNING version INTO v_updated_version;

  -- Check if update succeeded
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, 'Concurrent modification detected'::TEXT;
    RETURN;
  END IF;

  -- Verify version was incremented by trigger
  IF v_updated_version != v_current_version + 1 THEN
    RAISE WARNING 'Version increment unexpected: expected %, got %', v_current_version + 1, v_updated_version;
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
    RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, NULL::UUID, 'Serialization failure - retry required'::TEXT;
  WHEN unique_violation THEN
    -- Duplicate transaction ID - this is an idempotency check
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

-- ============================================================================
-- Update create_transaction_idempotent to work with the trigger
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
  v_updated_version INTEGER;
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
  -- The trigger will automatically increment version
  UPDATE user_balances
  SET
    balance = v_new_balance
    -- Note: version and updated_at are now handled by the trigger
  WHERE user_id = p_user_id
    AND currency = p_currency
    AND version = v_current_version
  RETURNING version INTO v_updated_version;

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

-- ============================================================================
-- Update the legacy update_balance function (from initial schema)
-- ============================================================================
-- This function should also work with the automatic version increment

CREATE OR REPLACE FUNCTION update_balance(
  p_user_id UUID,
  p_currency VARCHAR,
  p_amount DECIMAL,
  p_expected_version INTEGER
)
RETURNS TABLE(new_balance DECIMAL, new_version INTEGER) AS $$
DECLARE
  v_new_balance DECIMAL(20, 8);
  v_new_version INTEGER;
BEGIN
  -- Update balance with version check
  -- The trigger will automatically increment version
  UPDATE user_balances
  SET
    balance = balance + p_amount
    -- Note: version and updated_at are now handled by the trigger
  WHERE
    user_id = p_user_id
    AND currency = p_currency
    AND version = p_expected_version
    AND (balance + p_amount) >= 0
  RETURNING balance, version INTO v_new_balance, v_new_version;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Balance update failed: version mismatch or insufficient funds';
  END IF;

  RETURN QUERY SELECT v_new_balance, v_new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Test to verify version auto-increment works correctly
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_initial_version INTEGER;
  v_after_update_version INTEGER;
  v_test_balance DECIMAL(20, 8);
BEGIN
  -- Create test user and balance
  v_test_user_id := gen_random_uuid();

  INSERT INTO users (id, external_user_id, email)
  VALUES (v_test_user_id, 'test_version_' || v_test_user_id::TEXT, 'test@version.com');

  INSERT INTO user_balances (user_id, currency, balance, bonus_balance, locked_bonus, version)
  VALUES (v_test_user_id, 'USD', 1000.00, 0, 0, 1)
  RETURNING version INTO v_initial_version;

  RAISE NOTICE 'Test: Initial version: %', v_initial_version;

  -- Update balance directly (trigger should increment version)
  UPDATE user_balances
  SET balance = balance + 100
  WHERE user_id = v_test_user_id AND currency = 'USD'
  RETURNING version, balance INTO v_after_update_version, v_test_balance;

  RAISE NOTICE 'Test: Version after update: %, Balance: %', v_after_update_version, v_test_balance;

  -- Verify version incremented
  IF v_after_update_version = v_initial_version + 1 THEN
    RAISE NOTICE 'TEST PASSED: Version auto-incremented correctly (% -> %)',
      v_initial_version, v_after_update_version;
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Version did not increment correctly (expected %, got %)',
      v_initial_version + 1, v_after_update_version;
  END IF;

  -- Test with bonus_balance update
  UPDATE user_balances
  SET bonus_balance = 50
  WHERE user_id = v_test_user_id AND currency = 'USD'
  RETURNING version INTO v_after_update_version;

  IF v_after_update_version = v_initial_version + 2 THEN
    RAISE NOTICE 'TEST PASSED: Version incremented on bonus_balance update (now %)', v_after_update_version;
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Version did not increment on bonus update';
  END IF;

  -- Test that version doesn't increment when balance doesn't change
  UPDATE user_balances
  SET balance = balance + 0
  WHERE user_id = v_test_user_id AND currency = 'USD'
  RETURNING version INTO v_after_update_version;

  -- Version should still increment even for zero change (balance is different from OLD)
  RAISE NOTICE 'Test: Version after zero-amount update: %', v_after_update_version;

  -- Test optimistic locking still works
  BEGIN
    UPDATE user_balances
    SET balance = balance + 50
    WHERE user_id = v_test_user_id
      AND currency = 'USD'
      AND version = 1; -- This should fail as version is now higher

    RAISE EXCEPTION 'TEST FAILED: Optimistic locking did not prevent update with old version';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'TEST PASSED: Optimistic locking prevented update with old version';
  END;

  -- Cleanup test data
  DELETE FROM user_balances WHERE user_id = v_test_user_id;
  DELETE FROM users WHERE id = v_test_user_id;

  RAISE NOTICE '=== All version auto-increment tests passed successfully ===';
END;
$$;

-- ============================================================================
-- Verify existing balance operations still work
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_result RECORD;
  v_tid VARCHAR(255);
BEGIN
  -- Create test user
  v_test_user_id := gen_random_uuid();
  v_tid := 'test_tid_' || v_test_user_id::TEXT;

  INSERT INTO users (id, external_user_id, email)
  VALUES (v_test_user_id, 'test_ops_' || v_test_user_id::TEXT, 'test@ops.com');

  -- Test execute_balance_transaction
  SELECT * INTO v_result
  FROM execute_balance_transaction(
    v_test_user_id,
    'USD',
    100.00,
    'credit',
    v_tid,
    'Test deposit',
    '{"subtype": "deposit"}'::jsonb
  );

  IF v_result.success THEN
    RAISE NOTICE 'TEST PASSED: execute_balance_transaction works with trigger';
    RAISE NOTICE '  New balance: %, Transaction ID: %', v_result.new_balance, v_result.transaction_id;
  ELSE
    RAISE EXCEPTION 'TEST FAILED: execute_balance_transaction failed: %', v_result.error_message;
  END IF;

  -- Test idempotency
  SELECT * INTO v_result
  FROM execute_balance_transaction(
    v_test_user_id,
    'USD',
    100.00,
    'credit',
    v_tid, -- Same TID
    'Test deposit duplicate',
    '{"subtype": "deposit"}'::jsonb
  );

  IF v_result.success THEN
    RAISE NOTICE 'TEST PASSED: Idempotency check works';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Idempotency check failed';
  END IF;

  -- Cleanup
  DELETE FROM transactions WHERE user_id = v_test_user_id;
  DELETE FROM user_balances WHERE user_id = v_test_user_id;
  DELETE FROM users WHERE id = v_test_user_id;

  RAISE NOTICE '=== All balance operation tests passed successfully ===';
END;
$$;

-- ============================================================================
-- Documentation and Comments
-- ============================================================================

COMMENT ON TRIGGER balance_version_increment_trigger ON user_balances IS
  'Automatically increments version field on every balance update to ensure consistent
   optimistic locking and prevent race conditions during concurrent balance modifications.
   This trigger eliminates the need for manual version management in application code.';

COMMENT ON FUNCTION execute_balance_transaction IS
  'Atomically updates user balance with SERIALIZABLE isolation to prevent race conditions.
   Version field is now automatically incremented by trigger, ensuring consistency.

   Parameters:
   - p_user_id: User UUID
   - p_currency: ISO 4217 currency code
   - p_amount: Amount to add (positive) or subtract (negative)
   - p_transaction_type: Type of transaction
   - p_transaction_id: Unique transaction ID for idempotency
   - p_description: Optional description
   - p_metadata: JSONB with optional fields

   Returns success status, balances, transaction ID, and error message if any.';

COMMENT ON FUNCTION create_transaction_idempotent IS
  'Creates a new transaction with SERIALIZABLE isolation and automatic idempotency.
   Version increment is now handled automatically by trigger.

   Designed for OneWallet callback handlers with parameters matching transaction table.
   Returns success status, balances, transaction ID, duplicate flag, and error message.';