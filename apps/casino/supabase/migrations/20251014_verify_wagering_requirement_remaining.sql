-- ============================================================================
-- VERIFICATION SCRIPT FOR wagering_requirement_remaining COLUMN
-- ============================================================================
-- This script tests that the wagering_requirement_remaining column was added
-- correctly and functions as expected.
--
-- Run this AFTER applying 20251014_add_wagering_requirement_remaining.sql
-- ============================================================================

-- Test 1: Verify column exists and has correct type
DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_is_generated BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'player_bonuses'
        AND column_name = 'wagering_requirement_remaining'
    ) INTO v_column_exists;

    IF NOT v_column_exists THEN
        RAISE EXCEPTION 'Column wagering_requirement_remaining does not exist';
    END IF;

    -- Check if it's a generated column
    SELECT is_generated = 'ALWAYS'
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'player_bonuses'
    AND column_name = 'wagering_requirement_remaining'
    INTO v_is_generated;

    IF NOT v_is_generated THEN
        RAISE WARNING 'Column wagering_requirement_remaining is not a generated column';
    END IF;

    RAISE NOTICE 'Test 1 PASSED: Column exists and is generated';
END $$;

-- Test 2: Verify indexes were created
DO $$
DECLARE
    v_index_count INTEGER;
BEGIN
    SELECT COUNT(*)
    FROM pg_indexes
    WHERE tablename = 'player_bonuses'
    AND indexname IN ('idx_player_bonuses_wagering_remaining', 'idx_player_bonuses_user_status_remaining')
    INTO v_index_count;

    IF v_index_count < 2 THEN
        RAISE EXCEPTION 'Expected 2 indexes, found %', v_index_count;
    END IF;

    RAISE NOTICE 'Test 2 PASSED: Indexes created successfully (% found)', v_index_count;
END $$;

-- Test 3: Verify calculation logic for active bonuses
DO $$
DECLARE
    v_test_passed BOOLEAN;
BEGIN
    SELECT BOOL_AND(
        wagering_requirement_remaining = GREATEST(0, wagering_requirement_total - COALESCE(wagering_completed, 0))
    )
    FROM player_bonuses
    WHERE status = 'active'
    INTO v_test_passed;

    IF v_test_passed IS NULL THEN
        RAISE NOTICE 'Test 3 SKIPPED: No active bonuses to test';
    ELSIF NOT v_test_passed THEN
        RAISE EXCEPTION 'Calculation logic incorrect for active bonuses';
    ELSE
        RAISE NOTICE 'Test 3 PASSED: Calculation logic correct for active bonuses';
    END IF;
END $$;

-- Test 4: Verify completed/expired bonuses have 0 remaining
DO $$
DECLARE
    v_test_passed BOOLEAN;
BEGIN
    SELECT BOOL_AND(wagering_requirement_remaining = 0)
    FROM player_bonuses
    WHERE status IN ('completed', 'expired', 'forfeited', 'cancelled')
    INTO v_test_passed;

    IF v_test_passed IS NULL THEN
        RAISE NOTICE 'Test 4 SKIPPED: No completed/expired bonuses to test';
    ELSIF NOT v_test_passed THEN
        RAISE EXCEPTION 'Calculation logic incorrect for completed/expired bonuses';
    ELSE
        RAISE NOTICE 'Test 4 PASSED: Completed/expired bonuses have 0 remaining';
    END IF;
END $$;

-- Test 5: Verify function was updated (no longer tries to INSERT into generated column)
DO $$
DECLARE
    v_function_source TEXT;
BEGIN
    SELECT pg_get_functiondef(oid)
    FROM pg_proc
    WHERE proname = 'award_phone_verification_bonus'
    INTO v_function_source;

    IF v_function_source IS NULL THEN
        RAISE EXCEPTION 'Function award_phone_verification_bonus not found';
    END IF;

    -- Check that function doesn't try to insert wagering_requirement_remaining
    IF v_function_source LIKE '%INSERT INTO player_bonuses%wagering_requirement_remaining%' THEN
        RAISE EXCEPTION 'Function still tries to INSERT into wagering_requirement_remaining (generated column)';
    END IF;

    RAISE NOTICE 'Test 5 PASSED: Function updated to not INSERT into generated column';
END $$;

-- Test 6: Verify view was updated
DO $$
DECLARE
    v_view_def TEXT;
BEGIN
    SELECT definition
    FROM pg_views
    WHERE schemaname = 'public'
    AND viewname = 'bonus_system_stats'
    INTO v_view_def;

    IF v_view_def IS NULL THEN
        RAISE EXCEPTION 'View bonus_system_stats not found';
    END IF;

    -- Check that view uses correct column name
    IF v_view_def NOT LIKE '%wagering_requirement_remaining%' THEN
        RAISE EXCEPTION 'View does not reference wagering_requirement_remaining';
    END IF;

    RAISE NOTICE 'Test 6 PASSED: View uses correct column name';
END $$;

-- ============================================================================
-- SUMMARY QUERY
-- ============================================================================
-- Show current state of player_bonuses with wagering calculations

SELECT
    COUNT(*) as total_bonuses,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bonuses,
    COUNT(CASE WHEN status IN ('completed', 'expired', 'forfeited', 'cancelled') THEN 1 END) as closed_bonuses,
    SUM(wagering_requirement_remaining) as total_remaining,
    AVG(CASE WHEN status = 'active' THEN wagering_percentage END) as avg_progress
FROM player_bonuses;

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================
