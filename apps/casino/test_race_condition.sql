-- ============================================================================
-- Race Condition Test Script
-- ============================================================================
-- This script tests the execute_balance_transaction function's ability to
-- prevent race conditions and data corruption during concurrent updates.
-- ============================================================================

-- Setup test data
DO $$
DECLARE
  v_test_user_id UUID;
  v_result RECORD;
BEGIN
  RAISE NOTICE '=== Starting Race Condition Test ===';

  -- Create a test user
  INSERT INTO users (external_user_id, email)
  VALUES ('test_race_user_001', 'test_race@example.com')
  ON CONFLICT (external_user_id)
  DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO v_test_user_id;

  RAISE NOTICE 'Test user ID: %', v_test_user_id;

  -- Initialize balance
  INSERT INTO user_balances (user_id, currency, balance, version)
  VALUES (v_test_user_id, 'AUD', 1000.00, 0)
  ON CONFLICT (user_id, currency)
  DO UPDATE SET balance = 1000.00, version = 0;

  RAISE NOTICE 'Initial balance set to: 1000.00 AUD';

  -- ========================================================================
  -- Test 1: Successful debit
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 1: Successful Debit ---';

  SELECT * INTO v_result
  FROM execute_balance_transaction(
    v_test_user_id,
    'AUD',
    -100.00,
    'debit',
    'test_tx_001',
    'Test debit transaction',
    '{"subtype": "bet", "game_id": 123}'::jsonb
  );

  RAISE NOTICE 'Success: %, New Balance: %, Balance Before: %, Error: %',
    v_result.success, v_result.new_balance, v_result.balance_before, v_result.error_message;

  IF v_result.success AND v_result.new_balance = 900.00 THEN
    RAISE NOTICE 'PASS: Debit successful';
  ELSE
    RAISE EXCEPTION 'FAIL: Expected balance 900.00, got %', v_result.new_balance;
  END IF;

  -- ========================================================================
  -- Test 2: Successful credit
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 2: Successful Credit ---';

  SELECT * INTO v_result
  FROM execute_balance_transaction(
    v_test_user_id,
    'AUD',
    250.00,
    'credit',
    'test_tx_002',
    'Test credit transaction',
    '{"subtype": "win", "game_id": 123}'::jsonb
  );

  RAISE NOTICE 'Success: %, New Balance: %, Balance Before: %, Error: %',
    v_result.success, v_result.new_balance, v_result.balance_before, v_result.error_message;

  IF v_result.success AND v_result.new_balance = 1150.00 THEN
    RAISE NOTICE 'PASS: Credit successful';
  ELSE
    RAISE EXCEPTION 'FAIL: Expected balance 1150.00, got %', v_result.new_balance;
  END IF;

  -- ========================================================================
  -- Test 3: Insufficient funds
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 3: Insufficient Funds Check ---';

  SELECT * INTO v_result
  FROM execute_balance_transaction(
    v_test_user_id,
    'AUD',
    -2000.00,
    'debit',
    'test_tx_003',
    'Test insufficient funds',
    '{}'::jsonb
  );

  RAISE NOTICE 'Success: %, Error: %', v_result.success, v_result.error_message;

  IF NOT v_result.success AND v_result.error_message = 'Insufficient balance' THEN
    RAISE NOTICE 'PASS: Insufficient funds correctly detected';
  ELSE
    RAISE EXCEPTION 'FAIL: Should have detected insufficient funds';
  END IF;

  -- ========================================================================
  -- Test 4: Idempotency - duplicate transaction ID
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 4: Idempotency Test ---';

  -- Try to execute the same transaction ID again
  SELECT * INTO v_result
  FROM execute_balance_transaction(
    v_test_user_id,
    'AUD',
    -100.00,
    'debit',
    'test_tx_001', -- Same ID as Test 1
    'Duplicate transaction attempt',
    '{}'::jsonb
  );

  RAISE NOTICE 'Success: %, New Balance: %, Error: %',
    v_result.success, v_result.new_balance, v_result.error_message;

  IF v_result.success AND v_result.new_balance = 900.00 THEN
    RAISE NOTICE 'PASS: Idempotency working - returned original transaction';
  ELSE
    RAISE EXCEPTION 'FAIL: Idempotency check failed';
  END IF;

  -- ========================================================================
  -- Test 5: Version check
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 5: Version Increment Verification ---';

  DECLARE
    v_version INTEGER;
  BEGIN
    SELECT version INTO v_version
    FROM user_balances
    WHERE user_id = v_test_user_id AND currency = 'AUD';

    RAISE NOTICE 'Current version: %', v_version;

    -- After 2 successful transactions (test 1 and test 2), version should be 2
    IF v_version = 2 THEN
      RAISE NOTICE 'PASS: Version incremented correctly';
    ELSE
      RAISE EXCEPTION 'FAIL: Expected version 2, got %', v_version;
    END IF;
  END;

  -- ========================================================================
  -- Test 6: Transaction record verification
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 6: Transaction Records Verification ---';

  DECLARE
    v_tx_count INTEGER;
    v_tx RECORD;
  BEGIN
    SELECT COUNT(*) INTO v_tx_count
    FROM transactions
    WHERE user_id = v_test_user_id;

    RAISE NOTICE 'Total transactions recorded: %', v_tx_count;

    IF v_tx_count >= 2 THEN
      RAISE NOTICE 'PASS: Transactions recorded correctly';
    ELSE
      RAISE EXCEPTION 'FAIL: Expected at least 2 transactions, got %', v_tx_count;
    END IF;

    -- Verify transaction details
    FOR v_tx IN
      SELECT tid, type, amount, balance_before, balance_after
      FROM transactions
      WHERE user_id = v_test_user_id
      ORDER BY created_at
    LOOP
      RAISE NOTICE 'Transaction: TID=%, Type=%, Amount=%, Before=%, After=%',
        v_tx.tid, v_tx.type, v_tx.amount, v_tx.balance_before, v_tx.balance_after;
    END LOOP;
  END;

  -- ========================================================================
  -- Test 7: Balance consistency check
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 7: Balance Consistency Check ---';

  DECLARE
    v_expected_balance DECIMAL(20,8);
    v_actual_balance DECIMAL(20,8);
  BEGIN
    -- Calculate expected balance from transactions
    SELECT
      1000.00 + COALESCE(SUM(amount), 0) INTO v_expected_balance
    FROM transactions
    WHERE user_id = v_test_user_id AND currency = 'AUD';

    -- Get actual balance
    SELECT balance INTO v_actual_balance
    FROM user_balances
    WHERE user_id = v_test_user_id AND currency = 'AUD';

    RAISE NOTICE 'Expected balance: %, Actual balance: %', v_expected_balance, v_actual_balance;

    IF v_expected_balance = v_actual_balance THEN
      RAISE NOTICE 'PASS: Balance consistency verified';
    ELSE
      RAISE EXCEPTION 'FAIL: Balance mismatch - expected %, got %', v_expected_balance, v_actual_balance;
    END IF;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '=== All Tests Passed Successfully ===';

END $$;

-- ============================================================================
-- Concurrent Transaction Simulation
-- ============================================================================
-- Note: This requires running in multiple sessions simultaneously.
-- For automated testing, use pgbench or a similar tool.
-- ============================================================================

COMMENT ON EXTENSION plpgsql IS
'To test race conditions with concurrent transactions:

1. Open multiple psql sessions
2. In each session, run the same transaction simultaneously:

   BEGIN;
   SELECT * FROM execute_balance_transaction(
     (SELECT id FROM users WHERE external_user_id = ''test_race_user_001''),
     ''AUD'',
     -10.00,
     ''debit'',
     ''concurrent_tx_'' || txid_current()::text,
     ''Concurrent test'',
     ''{}''::jsonb
   );
   COMMIT;

3. Verify that all transactions are processed correctly without balance corruption
4. Check that the final balance matches the expected value
5. Verify version numbers incremented properly

Expected behavior:
- All transactions should succeed OR some may fail with "Serialization failure"
- Failed transactions should be retried by the client
- Final balance should equal: initial_balance + sum(all_successful_transaction_amounts)
- Version should equal: initial_version + count(successful_transactions)
- No transactions should be lost or double-counted
';
