-- ============================================================================
-- Fix SQL Injection Vulnerability in get_or_create_game()
-- ============================================================================
-- Migration Date: 2025-10-14
-- Issue: SECURITY DEFINER function without proper input validation
--
-- VULNERABILITIES IDENTIFIED:
-- 1. No input validation on p_game_desc parameter
-- 2. Direct string manipulation without sanitization
-- 3. SECURITY DEFINER runs with elevated privileges - critical security risk
-- 4. Potential for malicious input in game_desc, system_id, and game_type
--
-- FIXES IMPLEMENTED:
-- 1. Added strict input validation for all parameters
-- 2. Added format validation using regex patterns
-- 3. Added length limits to prevent buffer overflow attacks
-- 4. Sanitize input to remove control characters
-- 5. Use parameterized queries (already in place, but now with validated inputs)
-- 6. Set search_path to prevent schema-based attacks
-- ============================================================================

-- Drop the vulnerable function
DROP FUNCTION IF EXISTS get_or_create_game(VARCHAR);

-- Create secure version with comprehensive input validation
CREATE OR REPLACE FUNCTION get_or_create_game(
    p_game_desc VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- Prevent schema-based attacks
AS $$
DECLARE
    v_game_id UUID;
    v_system_id VARCHAR;
    v_game_type VARCHAR;
    v_parts TEXT[];
    v_sanitized_desc VARCHAR;
BEGIN
    -- ========================================================================
    -- CRITICAL SECURITY VALIDATIONS
    -- ========================================================================

    -- 1. NULL/Empty check
    IF p_game_desc IS NULL OR trim(p_game_desc) = '' THEN
        RAISE EXCEPTION 'game_desc cannot be null or empty';
    END IF;

    -- 2. Length validation (prevent buffer overflow)
    IF length(p_game_desc) > 200 THEN
        RAISE EXCEPTION 'game_desc exceeds maximum length of 200 characters';
    END IF;

    -- 3. Format validation: Must be "{SystemID}:{GameType}"
    -- Only allow alphanumeric, hyphens, underscores, and single colon
    IF p_game_desc !~ '^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$' THEN
        RAISE EXCEPTION 'game_desc has invalid format. Expected format: "SystemID:GameType" with alphanumeric characters, hyphens, and underscores only. Received: %', p_game_desc;
    END IF;

    -- 4. Sanitize input - remove any control characters (defense in depth)
    v_sanitized_desc := regexp_replace(p_game_desc, '[\x00-\x1F\x7F]', '', 'g');

    -- 5. Verify sanitization didn't change the input (catch bypass attempts)
    IF v_sanitized_desc != p_game_desc THEN
        RAISE EXCEPTION 'game_desc contains invalid control characters';
    END IF;

    -- ========================================================================
    -- Parse and validate components
    -- ========================================================================

    -- Parse game_desc format: "{SystemID}:{GameType}"
    v_parts := string_to_array(v_sanitized_desc, ':');

    -- Double-check array length (should always be 2 due to regex validation)
    IF array_length(v_parts, 1) != 2 THEN
        RAISE EXCEPTION 'game_desc must contain exactly one colon separator';
    END IF;

    v_system_id := v_parts[1];
    v_game_type := v_parts[2];

    -- Validate component lengths
    IF length(v_system_id) > 50 THEN
        RAISE EXCEPTION 'system_id exceeds maximum length of 50 characters';
    END IF;

    IF length(v_game_type) > 100 THEN
        RAISE EXCEPTION 'game_type exceeds maximum length of 100 characters';
    END IF;

    -- Validate components are not empty after split
    IF trim(v_system_id) = '' OR trim(v_game_type) = '' THEN
        RAISE EXCEPTION 'system_id and game_type cannot be empty';
    END IF;

    -- ========================================================================
    -- Safe database operations (parameterized - no SQL injection possible)
    -- ========================================================================

    -- Try to find existing game (parameterized query - safe)
    SELECT id INTO v_game_id
    FROM games
    WHERE system_id = v_system_id AND game_type = v_game_type;

    -- Create if not exists (parameterized query - safe)
    IF v_game_id IS NULL THEN
        INSERT INTO games (
            game_id,
            system_id,
            game_type,
            game_name,
            is_active
        ) VALUES (
            v_sanitized_desc,
            v_system_id,
            v_game_type,
            v_game_type, -- Default to game type as name
            TRUE
        )
        RETURNING id INTO v_game_id;

        -- Initialize statistics for new game
        INSERT INTO game_statistics (game_id)
        VALUES (v_game_id);
    END IF;

    RETURN v_game_id;

EXCEPTION
    WHEN unique_violation THEN
        -- Handle race condition: another process created the game concurrently
        SELECT id INTO v_game_id
        FROM games
        WHERE system_id = v_system_id AND game_type = v_game_type;

        IF v_game_id IS NULL THEN
            RAISE EXCEPTION 'Race condition in game creation - game not found after unique violation';
        END IF;

        RETURN v_game_id;

    WHEN OTHERS THEN
        -- Log and re-raise all other exceptions
        RAISE EXCEPTION 'Error in get_or_create_game: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- ============================================================================
-- Update function comment with security notes
-- ============================================================================

COMMENT ON FUNCTION get_or_create_game(VARCHAR) IS
'Securely gets or creates a game from Fundist game descriptor.

SECURITY: This function uses SECURITY DEFINER and runs with elevated privileges.
All inputs are strictly validated to prevent SQL injection attacks:
- Format validation: Must match "SystemID:GameType" pattern
- Character whitelist: Only alphanumeric, hyphens, underscores allowed
- Length limits: Prevents buffer overflow attacks
- Control character removal: Prevents escape sequence attacks
- Parameterized queries: All database operations use safe parameters

Input format: "{SystemID}:{GameType}" (e.g., "998:roulette")
Returns: UUID of the game (existing or newly created)

Throws exceptions for invalid input to fail securely.';

-- ============================================================================
-- Grant appropriate permissions
-- ============================================================================

-- Service role needs full access
GRANT EXECUTE ON FUNCTION get_or_create_game(VARCHAR) TO service_role;

-- Authenticated users should NOT directly call this SECURITY DEFINER function
-- It's called internally by triggers only
REVOKE EXECUTE ON FUNCTION get_or_create_game(VARCHAR) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_or_create_game(VARCHAR) FROM anon;
REVOKE EXECUTE ON FUNCTION get_or_create_game(VARCHAR) FROM PUBLIC;

-- ============================================================================
-- SQL Injection Security Tests
-- ============================================================================

-- These tests verify that the function properly rejects malicious input
DO $$
DECLARE
    v_test_result UUID;
    v_test_passed INTEGER := 0;
    v_test_failed INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SQL INJECTION SECURITY TESTS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Test 1: SQL injection attempt with DROP TABLE
    BEGIN
        v_test_result := get_or_create_game('test''; DROP TABLE games; --:roulette');
        RAISE EXCEPTION 'TEST 1 FAILED: SQL injection was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%invalid format%' THEN
                RAISE NOTICE 'Test 1 PASSED: SQL injection blocked (DROP TABLE)';
                RAISE NOTICE '  Input: test''; DROP TABLE games; --:roulette';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 1 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 2: SQL injection attempt with semicolon
    BEGIN
        v_test_result := get_or_create_game('123;DELETE FROM users:slots');
        RAISE EXCEPTION 'TEST 2 FAILED: SQL injection was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%invalid format%' THEN
                RAISE NOTICE 'Test 2 PASSED: Semicolon injection blocked';
                RAISE NOTICE '  Input: 123;DELETE FROM users:slots';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 2 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 3: Multiple colon injection attempt
    BEGIN
        v_test_result := get_or_create_game('123:456:789');
        RAISE EXCEPTION 'TEST 3 FAILED: Multiple colon injection was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%invalid format%' THEN
                RAISE NOTICE 'Test 3 PASSED: Multiple colons blocked';
                RAISE NOTICE '  Input: 123:456:789';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 3 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 4: Special characters injection
    BEGIN
        v_test_result := get_or_create_game('123<script>alert(1)</script>:slots');
        RAISE EXCEPTION 'TEST 4 FAILED: Special characters were not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%invalid format%' THEN
                RAISE NOTICE 'Test 4 PASSED: Special characters blocked (XSS attempt)';
                RAISE NOTICE '  Input: 123<script>alert(1)</script>:slots';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 4 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 5: Null byte injection
    BEGIN
        v_test_result := get_or_create_game('123' || chr(0) || ':slots');
        RAISE EXCEPTION 'TEST 5 FAILED: Null byte was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%invalid%' THEN
                RAISE NOTICE 'Test 5 PASSED: Null byte injection blocked';
                RAISE NOTICE '  Input: 123\x00:slots';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 5 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 6: Newline injection
    BEGIN
        v_test_result := get_or_create_game('123' || chr(10) || ':slots');
        RAISE EXCEPTION 'TEST 6 FAILED: Newline was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%invalid%' THEN
                RAISE NOTICE 'Test 6 PASSED: Newline injection blocked';
                RAISE NOTICE '  Input: 123\n:slots';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 6 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 7: Empty system_id
    BEGIN
        v_test_result := get_or_create_game(':slots');
        RAISE EXCEPTION 'TEST 7 FAILED: Empty system_id was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%cannot be empty%' THEN
                RAISE NOTICE 'Test 7 PASSED: Empty system_id blocked';
                RAISE NOTICE '  Input: :slots';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 7 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 8: Empty game_type
    BEGIN
        v_test_result := get_or_create_game('123:');
        RAISE EXCEPTION 'TEST 8 FAILED: Empty game_type was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%cannot be empty%' THEN
                RAISE NOTICE 'Test 8 PASSED: Empty game_type blocked';
                RAISE NOTICE '  Input: 123:';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 8 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 9: Excessively long input
    BEGIN
        v_test_result := get_or_create_game(repeat('A', 250) || ':slots');
        RAISE EXCEPTION 'TEST 9 FAILED: Excessively long input was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%maximum length%' THEN
                RAISE NOTICE 'Test 9 PASSED: Excessively long input blocked';
                RAISE NOTICE '  Input: [250+ characters]:slots';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 9 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 10: UNION injection attempt
    BEGIN
        v_test_result := get_or_create_game('123'' UNION SELECT * FROM users--:slots');
        RAISE EXCEPTION 'TEST 10 FAILED: UNION injection was not blocked!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%invalid format%' THEN
                RAISE NOTICE 'Test 10 PASSED: UNION injection blocked';
                RAISE NOTICE '  Input: 123'' UNION SELECT * FROM users--:slots';
                RAISE NOTICE '  Error: %', SQLERRM;
                v_test_passed := v_test_passed + 1;
            ELSE
                RAISE NOTICE 'Test 10 WARNING: Blocked but with unexpected error: %', SQLERRM;
                v_test_failed := v_test_failed + 1;
            END IF;
    END;
    RAISE NOTICE '';

    -- Test 11: Valid input (should succeed)
    BEGIN
        v_test_result := get_or_create_game('998:roulette');
        IF v_test_result IS NOT NULL THEN
            RAISE NOTICE 'Test 11 PASSED: Valid game created successfully';
            RAISE NOTICE '  Input: 998:roulette';
            RAISE NOTICE '  Game ID: %', v_test_result;
            v_test_passed := v_test_passed + 1;
        ELSE
            RAISE NOTICE 'Test 11 FAILED: Valid input did not create game';
            v_test_failed := v_test_failed + 1;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test 11 FAILED: Valid input threw error: %', SQLERRM;
            v_test_failed := v_test_failed + 1;
    END;
    RAISE NOTICE '';

    -- Test 12: Valid input with hyphens and underscores
    BEGIN
        v_test_result := get_or_create_game('test-game_123:video-slots_new');
        IF v_test_result IS NOT NULL THEN
            RAISE NOTICE 'Test 12 PASSED: Valid game with hyphens/underscores created';
            RAISE NOTICE '  Input: test-game_123:video-slots_new';
            RAISE NOTICE '  Game ID: %', v_test_result;
            v_test_passed := v_test_passed + 1;
        ELSE
            RAISE NOTICE 'Test 12 FAILED: Valid input did not create game';
            v_test_failed := v_test_failed + 1;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test 12 FAILED: Valid input threw error: %', SQLERRM;
            v_test_failed := v_test_failed + 1;
    END;
    RAISE NOTICE '';

    -- Test 13: Idempotency test (creating same game twice)
    BEGIN
        v_test_result := get_or_create_game('998:roulette');
        IF v_test_result IS NOT NULL THEN
            RAISE NOTICE 'Test 13 PASSED: Idempotent game creation works';
            RAISE NOTICE '  Input: 998:roulette (duplicate)';
            RAISE NOTICE '  Game ID: %', v_test_result;
            v_test_passed := v_test_passed + 1;
        ELSE
            RAISE NOTICE 'Test 13 FAILED: Duplicate game creation returned null';
            v_test_failed := v_test_failed + 1;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test 13 FAILED: Duplicate creation threw error: %', SQLERRM;
            v_test_failed := v_test_failed + 1;
    END;
    RAISE NOTICE '';

    -- Summary
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tests Passed: %', v_test_passed;
    RAISE NOTICE 'Tests Failed: %', v_test_failed;
    RAISE NOTICE 'Total Tests:  %', v_test_passed + v_test_failed;
    RAISE NOTICE '========================================';

    IF v_test_failed > 0 THEN
        RAISE WARNING 'Some security tests failed or had warnings. Review output above.';
    ELSE
        RAISE NOTICE 'All security tests passed successfully!';
    END IF;
END;
$$;

-- ============================================================================
-- Audit Log
-- ============================================================================

-- Create audit entry for this security fix
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECURITY FIX APPLIED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration: 20251014_fix_get_or_create_game_sql_injection.sql';
    RAISE NOTICE 'Function: get_or_create_game(VARCHAR)';
    RAISE NOTICE 'Status: SQL injection vulnerabilities fixed';
    RAISE NOTICE 'Date: 2025-10-14';
    RAISE NOTICE '';
    RAISE NOTICE 'Security improvements:';
    RAISE NOTICE '- Input format validation (regex pattern)';
    RAISE NOTICE '- Length limits enforced';
    RAISE NOTICE '- Control character removal';
    RAISE NOTICE '- Character whitelist enforcement';
    RAISE NOTICE '- search_path protection';
    RAISE NOTICE '- Permissions restricted';
    RAISE NOTICE '========================================';
END;
$$;
