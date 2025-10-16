-- ============================================================================
-- Transaction Idempotency for Fundist OneWallet
-- ============================================================================
-- This migration adds idempotency checks to prevent duplicate transaction
-- processing when Fundist retries callbacks due to timeouts or errors.
--
-- Key features:
-- 1. Ensures unique constraint on transaction IDs (tid)
-- 2. Creates idempotent RPC function for safe transaction creation
-- 3. Handles race conditions gracefully
-- ============================================================================

-- ============================================================================
-- 1. Ensure unique index on transaction ID (tid)
-- ============================================================================
-- The tid field already has UNIQUE constraint from initial schema, but we
-- add an explicit index to ensure optimal performance for duplicate checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tid_unique
  ON transactions(tid);

-- ============================================================================
-- 2. Create execute_balance_transaction helper function
-- ============================================================================
-- This function executes a balance transaction atomically, updating both the
-- balance and creating the transaction record in a single operation.
CREATE OR REPLACE FUNCTION execute_balance_transaction(
  p_user_id UUID,
  p_currency VARCHAR(3),
  p_amount DECIMAL(20,8),
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
  new_balance DECIMAL(20,8),
  transaction_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before DECIMAL(20,8);
  v_balance_after DECIMAL(20,8);
  v_transaction_id UUID;
  v_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Get current balance and version
  SELECT balance, version
  INTO v_balance_before, v_version
  FROM user_balances
  WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE; -- Lock the row to prevent race conditions

  -- Initialize balance if not exists
  IF v_balance_before IS NULL THEN
    INSERT INTO user_balances (user_id, currency, balance, version)
    VALUES (p_user_id, p_currency, 0, 0)
    ON CONFLICT (user_id, currency) DO NOTHING;

    SELECT balance, version
    INTO v_balance_before, v_version
    FROM user_balances
    WHERE user_id = p_user_id AND currency = p_currency
    FOR UPDATE;

    IF v_balance_before IS NULL THEN
      v_balance_before := 0;
      v_version := 0;
    END IF;
  END IF;

  -- Calculate new balance
  v_balance_after := v_balance_before + p_amount;

  -- Check for sufficient funds (for debits)
  IF v_balance_after < 0 THEN
    RETURN QUERY SELECT
      FALSE,
      v_balance_before,
      NULL::UUID,
      'Insufficient funds'::TEXT;
    RETURN;
  END IF;

  -- Update balance with version increment
  UPDATE user_balances
  SET
    balance = v_balance_after,
    version = version + 1,
    updated_at = NOW()
  WHERE
    user_id = p_user_id
    AND currency = p_currency
    AND version = v_version
  RETURNING version INTO v_new_version;

  -- Check if update succeeded (no version conflict)
  IF v_new_version IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      v_balance_before,
      NULL::UUID,
      'Balance update failed: version conflict'::TEXT;
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
  VALUES (
    p_tid,
    p_user_id,
    p_currency,
    p_type,
    p_subtype,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_game_round_id,
    p_action_id,
    p_game_id,
    p_rollback_tid,
    p_promotion_id
  )
  RETURNING id INTO v_transaction_id;

  -- Return success
  RETURN QUERY SELECT
    TRUE,
    v_balance_after,
    v_transaction_id,
    NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      FALSE,
      v_balance_before,
      NULL::UUID,
      SQLERRM;
END;
$$;

COMMENT ON FUNCTION execute_balance_transaction IS
  'Atomically executes a balance transaction with optimistic locking.
   Updates user balance and creates transaction record in a single operation.
   Used internally by create_transaction_idempotent.';

-- ============================================================================
-- 3. Create idempotent transaction creation function
-- ============================================================================
CREATE OR REPLACE FUNCTION create_transaction_idempotent(
  p_user_id UUID,
  p_currency VARCHAR(3),
  p_amount DECIMAL(20,8),
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
  transaction_id UUID,
  new_balance DECIMAL(20,8),
  was_duplicate BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_transaction_id UUID;
  v_existing_balance DECIMAL(20,8);
  v_new_balance DECIMAL(20,8);
  v_transaction_id UUID;
  v_success BOOLEAN;
  v_error_message TEXT;
BEGIN
  -- Check for existing transaction with same TID
  SELECT id, balance_after
  INTO v_existing_transaction_id, v_existing_balance
  FROM transactions
  WHERE tid = p_tid
  LIMIT 1;

  -- If transaction already exists, return existing data (idempotent)
  IF FOUND THEN
    RETURN QUERY SELECT
      TRUE,
      v_existing_transaction_id,
      v_existing_balance,
      TRUE,
      'Transaction already processed'::TEXT;
    RETURN;
  END IF;

  -- Transaction doesn't exist, create it using the safe balance update function
  SELECT * INTO v_success, v_new_balance, v_transaction_id, v_error_message
  FROM execute_balance_transaction(
    p_user_id,
    p_currency,
    p_amount,
    p_type,
    p_subtype,
    p_tid,
    p_game_round_id,
    p_action_id,
    p_game_id,
    p_rollback_tid,
    p_promotion_id
  );

  -- Return result with duplicate flag = false
  RETURN QUERY SELECT
    v_success,
    v_transaction_id,
    v_new_balance,
    FALSE,
    v_error_message;

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another process created the transaction
    -- Fetch the existing transaction and return it
    SELECT id, balance_after
    INTO v_existing_transaction_id, v_existing_balance
    FROM transactions
    WHERE tid = p_tid
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT
        TRUE,
        v_existing_transaction_id,
        v_existing_balance,
        TRUE,
        'Transaction created by concurrent request'::TEXT;
    ELSE
      -- This shouldn't happen, but handle it gracefully
      RETURN QUERY SELECT
        FALSE,
        NULL::UUID,
        0.00::DECIMAL(20,8),
        FALSE,
        'Unique violation but transaction not found'::TEXT;
    END IF;
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::UUID,
      0.00::DECIMAL(20,8),
      FALSE,
      SQLERRM;
END;
$$;

COMMENT ON FUNCTION create_transaction_idempotent IS
  'Creates a transaction with full idempotency checks. If a transaction with the
   same TID already exists, returns the existing transaction instead of creating
   a duplicate. Safe for Fundist OneWallet retry scenarios. Handles race conditions
   gracefully by catching unique violations and returning the existing transaction.

   Parameters:
   - p_user_id: User UUID
   - p_currency: ISO 4217 currency code
   - p_amount: Transaction amount (positive for credit, negative for debit)
   - p_type: Transaction type (debit, credit, rollback, promotion_win)
   - p_subtype: Transaction subtype (bet, win, rollback, promotion, etc.)
   - p_tid: Unique transaction ID from Fundist
   - p_game_round_id: Optional game round UUID
   - p_action_id: Optional action ID from Fundist
   - p_game_id: Optional game ID from Fundist
   - p_rollback_tid: Optional TID being rolled back
   - p_promotion_id: Optional promotion UUID

   Returns:
   - success: Whether the operation succeeded
   - transaction_id: UUID of the transaction (existing or new)
   - new_balance: User balance after transaction
   - was_duplicate: True if transaction already existed
   - error_message: Error description if success=false';

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION execute_balance_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION execute_balance_transaction TO service_role;
GRANT EXECUTE ON FUNCTION create_transaction_idempotent TO authenticated;
GRANT EXECUTE ON FUNCTION create_transaction_idempotent TO service_role;

-- ============================================================================
-- 5. Add helpful view for monitoring duplicate transactions
-- ============================================================================
CREATE OR REPLACE VIEW duplicate_transaction_attempts AS
SELECT
  tid,
  user_id,
  currency,
  type,
  amount,
  COUNT(*) as attempt_count,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM transactions
GROUP BY tid, user_id, currency, type, amount
HAVING COUNT(*) > 1;

COMMENT ON VIEW duplicate_transaction_attempts IS
  'Shows transactions that have multiple records with the same TID,
   indicating potential race conditions or retry scenarios.';

-- Grant view access
GRANT SELECT ON duplicate_transaction_attempts TO authenticated;
GRANT SELECT ON duplicate_transaction_attempts TO service_role;
