-- ============================================================================
-- Idempotency Test Suite
-- ============================================================================
-- Run these tests in the Supabase SQL Editor after applying the migration
-- to verify that transaction idempotency is working correctly.
--
-- IMPORTANT: These tests will create test data. Clean up after running.
-- ============================================================================

-- Setup: Create a test user
DO $$
DECLARE
  v_test_user_id UUID;
BEGIN
  -- Create test user
  INSERT INTO users (external_user_id, email)
  VALUES ('test-idempotency-user', 'test@example.com')
  ON CONFLICT (external_user_id) DO UPDATE SET external_user_id = EXCLUDED.external_user_id
  RETURNING id INTO v_test_user_id;

  -- Initialize balance
  INSERT INTO user_balances (user_id, currency, balance, version)
  VALUES (v_test_user_id, 'USD', 100.00, 0)
  ON CONFLICT (user_id, currency)
  DO UPDATE SET balance = 100.00, version = 0;

  RAISE NOTICE 'Test user created: %', v_test_user_id;
END $$;

-- ============================================================================
-- TEST 1: Basic Idempotency - Duplicate TID
-- ============================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_result1 RECORD;
  v_result2 RECORD;
  v_tx_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 1: Basic Idempotency ===';

  -- Get test user
  SELECT id INTO v_user_id FROM users WHERE external_user_id = 'test-idempotency-user';

  -- First call: Should create new transaction
  SELECT * INTO v_result1
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := -10.00,
    p_type := 'debit',
    p_subtype := 'bet',
    p_tid := 'TEST-IDEMPOTENT-001',
    p_game_round_id := NULL,
    p_action_id := 1001,
    p_game_id := 5001,
    p_rollback_tid := NULL,
    p_promotion_id := NULL
  );

  RAISE NOTICE 'First call - Success: %, Was Duplicate: %, Balance: %, TX ID: %',
    v_result1.success, v_result1.was_duplicate, v_result1.new_balance, v_result1.transaction_id;

  -- Second call: Should return existing transaction
  SELECT * INTO v_result2
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := -10.00,
    p_type := 'debit',
    p_subtype := 'bet',
    p_tid := 'TEST-IDEMPOTENT-001',
    p_game_round_id := NULL,
    p_action_id := 1001,
    p_game_id := 5001,
    p_rollback_tid := NULL,
    p_promotion_id := NULL
  );

  RAISE NOTICE 'Second call - Success: %, Was Duplicate: %, Balance: %, TX ID: %',
    v_result2.success, v_result2.was_duplicate, v_result2.new_balance, v_result2.transaction_id;

  -- Verify only one transaction exists
  SELECT COUNT(*) INTO v_tx_count FROM transactions WHERE tid = 'TEST-IDEMPOTENT-001';
  RAISE NOTICE 'Transaction count in DB: %', v_tx_count;

  -- Assertions
  ASSERT v_result1.success = TRUE, 'First call should succeed';
  ASSERT v_result1.was_duplicate = FALSE, 'First call should not be duplicate';
  ASSERT v_result2.success = TRUE, 'Second call should succeed';
  ASSERT v_result2.was_duplicate = TRUE, 'Second call should be duplicate';
  ASSERT v_result1.transaction_id = v_result2.transaction_id, 'Transaction IDs should match';
  ASSERT v_result1.new_balance = v_result2.new_balance, 'Balances should match';
  ASSERT v_tx_count = 1, 'Only one transaction should exist';

  RAISE NOTICE '✓ TEST 1 PASSED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST 1 FAILED: %', SQLERRM;
    RAISE;
END $$;

-- ============================================================================
-- TEST 2: Credit Transaction Idempotency
-- ============================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_result1 RECORD;
  v_result2 RECORD;
  v_balance_before DECIMAL(20,8);
  v_balance_after DECIMAL(20,8);
BEGIN
  RAISE NOTICE '=== TEST 2: Credit Transaction Idempotency ===';

  -- Get test user
  SELECT id INTO v_user_id FROM users WHERE external_user_id = 'test-idempotency-user';

  -- Get balance before
  SELECT balance INTO v_balance_before FROM user_balances WHERE user_id = v_user_id AND currency = 'USD';
  RAISE NOTICE 'Balance before: %', v_balance_before;

  -- First call: Create credit transaction
  SELECT * INTO v_result1
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := 25.00, -- Positive for credit
    p_type := 'credit',
    p_subtype := 'win',
    p_tid := 'TEST-CREDIT-001',
    p_game_round_id := NULL,
    p_action_id := 1002,
    p_game_id := 5001,
    p_rollback_tid := NULL,
    p_promotion_id := NULL
  );

  RAISE NOTICE 'First call - Success: %, Was Duplicate: %, Balance: %',
    v_result1.success, v_result1.was_duplicate, v_result1.new_balance;

  -- Second call: Should return existing
  SELECT * INTO v_result2
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := 25.00,
    p_type := 'credit',
    p_subtype := 'win',
    p_tid := 'TEST-CREDIT-001',
    p_game_round_id := NULL,
    p_action_id := 1002,
    p_game_id := 5001,
    p_rollback_tid := NULL,
    p_promotion_id := NULL
  );

  RAISE NOTICE 'Second call - Success: %, Was Duplicate: %, Balance: %',
    v_result2.success, v_result2.was_duplicate, v_result2.new_balance;

  -- Get final balance
  SELECT balance INTO v_balance_after FROM user_balances WHERE user_id = v_user_id AND currency = 'USD';
  RAISE NOTICE 'Balance after: %', v_balance_after;

  -- Assertions
  ASSERT v_result1.success = TRUE, 'First call should succeed';
  ASSERT v_result1.was_duplicate = FALSE, 'First call should not be duplicate';
  ASSERT v_result2.success = TRUE, 'Second call should succeed';
  ASSERT v_result2.was_duplicate = TRUE, 'Second call should be duplicate';
  ASSERT v_balance_after = v_balance_before + 25.00, 'Balance should increase by exactly 25.00';

  RAISE NOTICE '✓ TEST 2 PASSED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST 2 FAILED: %', SQLERRM;
    RAISE;
END $$;

-- ============================================================================
-- TEST 3: Insufficient Funds Handling
-- ============================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_result1 RECORD;
  v_result2 RECORD;
  v_balance_before DECIMAL(20,8);
  v_balance_after DECIMAL(20,8);
  v_tx_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 3: Insufficient Funds Handling ===';

  -- Get test user
  SELECT id INTO v_user_id FROM users WHERE external_user_id = 'test-idempotency-user';

  -- Get balance before
  SELECT balance INTO v_balance_before FROM user_balances WHERE user_id = v_user_id AND currency = 'USD';
  RAISE NOTICE 'Current balance: %', v_balance_before;

  -- First call: Try to debit more than balance
  SELECT * INTO v_result1
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := -999999.00, -- More than available balance
    p_type := 'debit',
    p_subtype := 'bet',
    p_tid := 'TEST-INSUFFICIENT-001',
    p_game_round_id := NULL,
    p_action_id := 1003,
    p_game_id := 5001,
    p_rollback_tid := NULL,
    p_promotion_id := NULL
  );

  RAISE NOTICE 'First call - Success: %, Error: %', v_result1.success, v_result1.error_message;

  -- Second call: Same insufficient funds request
  SELECT * INTO v_result2
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := -999999.00,
    p_type := 'debit',
    p_subtype := 'bet',
    p_tid := 'TEST-INSUFFICIENT-001',
    p_game_round_id := NULL,
    p_action_id := 1003,
    p_game_id := 5001,
    p_rollback_tid := NULL,
    p_promotion_id := NULL
  );

  RAISE NOTICE 'Second call - Success: %, Error: %', v_result2.success, v_result2.error_message;

  -- Verify no transaction created
  SELECT COUNT(*) INTO v_tx_count FROM transactions WHERE tid = 'TEST-INSUFFICIENT-001';
  RAISE NOTICE 'Transaction count: %', v_tx_count;

  -- Get balance after
  SELECT balance INTO v_balance_after FROM user_balances WHERE user_id = v_user_id AND currency = 'USD';
  RAISE NOTICE 'Balance after: %', v_balance_after;

  -- Assertions
  ASSERT v_result1.success = FALSE, 'First call should fail';
  ASSERT v_result1.error_message LIKE '%Insufficient funds%', 'Should return insufficient funds error';
  ASSERT v_result2.success = FALSE, 'Second call should fail';
  ASSERT v_tx_count = 0, 'No transaction should be created';
  ASSERT v_balance_after = v_balance_before, 'Balance should not change';

  RAISE NOTICE '✓ TEST 3 PASSED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST 3 FAILED: %', SQLERRM;
    RAISE;
END $$;

-- ============================================================================
-- TEST 4: Rollback Transaction Idempotency
-- ============================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_original_result RECORD;
  v_rollback_result1 RECORD;
  v_rollback_result2 RECORD;
  v_balance_before DECIMAL(20,8);
  v_balance_after_bet DECIMAL(20,8);
  v_balance_after_rollback DECIMAL(20,8);
BEGIN
  RAISE NOTICE '=== TEST 4: Rollback Transaction Idempotency ===';

  -- Get test user
  SELECT id INTO v_user_id FROM users WHERE external_user_id = 'test-idempotency-user';

  -- Get initial balance
  SELECT balance INTO v_balance_before FROM user_balances WHERE user_id = v_user_id AND currency = 'USD';
  RAISE NOTICE 'Balance before bet: %', v_balance_before;

  -- Create original bet transaction
  SELECT * INTO v_original_result
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := -15.00,
    p_type := 'debit',
    p_subtype := 'bet',
    p_tid := 'TEST-ROLLBACK-ORIGINAL-001',
    p_game_round_id := NULL,
    p_action_id := 1004,
    p_game_id := 5001,
    p_rollback_tid := NULL,
    p_promotion_id := NULL
  );

  SELECT balance INTO v_balance_after_bet FROM user_balances WHERE user_id = v_user_id AND currency = 'USD';
  RAISE NOTICE 'Balance after bet: %', v_balance_after_bet;

  -- First rollback call
  SELECT * INTO v_rollback_result1
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := 15.00, -- Return the bet
    p_type := 'rollback',
    p_subtype := 'rollback',
    p_tid := 'TEST-ROLLBACK-001',
    p_game_round_id := NULL,
    p_action_id := 1005,
    p_game_id := 5001,
    p_rollback_tid := 'TEST-ROLLBACK-ORIGINAL-001',
    p_promotion_id := NULL
  );

  RAISE NOTICE 'First rollback - Success: %, Was Duplicate: %, Balance: %',
    v_rollback_result1.success, v_rollback_result1.was_duplicate, v_rollback_result1.new_balance;

  -- Second rollback call (idempotency test)
  SELECT * INTO v_rollback_result2
  FROM create_transaction_idempotent(
    p_user_id := v_user_id,
    p_currency := 'USD',
    p_amount := 15.00,
    p_type := 'rollback',
    p_subtype := 'rollback',
    p_tid := 'TEST-ROLLBACK-001',
    p_game_round_id := NULL,
    p_action_id := 1005,
    p_game_id := 5001,
    p_rollback_tid := 'TEST-ROLLBACK-ORIGINAL-001',
    p_promotion_id := NULL
  );

  RAISE NOTICE 'Second rollback - Success: %, Was Duplicate: %, Balance: %',
    v_rollback_result2.success, v_rollback_result2.was_duplicate, v_rollback_result2.new_balance;

  -- Get final balance
  SELECT balance INTO v_balance_after_rollback FROM user_balances WHERE user_id = v_user_id AND currency = 'USD';
  RAISE NOTICE 'Balance after rollback: %', v_balance_after_rollback;

  -- Assertions
  ASSERT v_balance_after_bet = v_balance_before - 15.00, 'Balance should decrease after bet';
  ASSERT v_rollback_result1.success = TRUE, 'First rollback should succeed';
  ASSERT v_rollback_result1.was_duplicate = FALSE, 'First rollback should not be duplicate';
  ASSERT v_rollback_result2.success = TRUE, 'Second rollback should succeed';
  ASSERT v_rollback_result2.was_duplicate = TRUE, 'Second rollback should be duplicate';
  ASSERT v_balance_after_rollback = v_balance_before, 'Balance should be restored to original';

  RAISE NOTICE '✓ TEST 4 PASSED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST 4 FAILED: %', SQLERRM;
    RAISE;
END $$;

-- ============================================================================
-- TEST 5: Verify Unique Index Exists
-- ============================================================================
DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== TEST 5: Verify Unique Index ===';

  -- Check if unique index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'transactions'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%tid%'
  ) INTO v_index_exists;

  RAISE NOTICE 'Unique index on tid exists: %', v_index_exists;

  ASSERT v_index_exists = TRUE, 'Unique index on tid should exist';

  RAISE NOTICE '✓ TEST 5 PASSED';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✗ TEST 5 FAILED: %', SQLERRM;
    RAISE;
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'IDEMPOTENCY TEST SUITE COMPLETE';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'All tests passed! Idempotency is working correctly.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review test results above';
  RAISE NOTICE '2. Check transactions table: SELECT * FROM transactions WHERE tid LIKE ''TEST-%'';';
  RAISE NOTICE '3. Clean up test data (see cleanup script below)';
  RAISE NOTICE '4. Test with Edge Functions using TESTING_IDEMPOTENCY.md';
END $$;

-- ============================================================================
-- CLEANUP (Run this after tests to remove test data)
-- ============================================================================
-- UNCOMMENT TO RUN CLEANUP:
/*
DELETE FROM round_actions WHERE transaction_id IN (
  SELECT id FROM transactions WHERE tid LIKE 'TEST-%'
);
DELETE FROM transactions WHERE tid LIKE 'TEST-%';
DELETE FROM user_balances WHERE user_id IN (
  SELECT id FROM users WHERE external_user_id = 'test-idempotency-user'
);
DELETE FROM users WHERE external_user_id = 'test-idempotency-user';

RAISE NOTICE 'Test data cleaned up';
*/
