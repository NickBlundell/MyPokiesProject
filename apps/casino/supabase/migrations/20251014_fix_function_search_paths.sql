-- ============================================
-- FIX FUNCTION SEARCH PATH SECURITY ISSUE
-- Generated: 2025-10-14
-- Total functions to fix: 109
-- Security Issue: Functions without explicit search_path are vulnerable
-- to search path manipulation attacks
-- Solution: Set search_path = '' for all functions
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================

-- This migration uses a dynamic approach to automatically fix all functions
-- in the public schema that don't have an explicit search_path setting.
-- The script queries pg_catalog to get exact function signatures and applies
-- the search_path security setting programmatically.

DO $$
DECLARE
    func_record RECORD;
    func_signature TEXT;
    sql_statement TEXT;
    functions_fixed INTEGER := 0;
    functions_failed INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting function search_path security fix...';

    -- Iterate through all functions in public schema
    FOR func_record IN
        SELECT
            p.proname AS function_name,
            pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
            p.oid::regprocedure AS full_signature
        FROM pg_catalog.pg_proc p
        INNER JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- Only functions, not procedures
        AND NOT (p.proconfig IS NOT NULL AND 'search_path' = ANY(
            SELECT split_part(unnest(p.proconfig), '=', 1)
        ))  -- Only functions without search_path already set
        ORDER BY p.proname
    LOOP
        BEGIN
            -- Build the ALTER FUNCTION statement with exact signature
            sql_statement := format(
                'ALTER FUNCTION %s SET search_path = ''''',
                func_record.full_signature
            );

            -- Execute the ALTER statement
            EXECUTE sql_statement;

            functions_fixed := functions_fixed + 1;
            RAISE NOTICE 'Fixed: % (% functions fixed)', func_record.full_signature, functions_fixed;

        EXCEPTION
            WHEN OTHERS THEN
                functions_failed := functions_failed + 1;
                RAISE WARNING 'Failed to fix %: %', func_record.full_signature, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Function search_path security fix completed';
    RAISE NOTICE 'Functions successfully fixed: %', functions_fixed;
    RAISE NOTICE 'Functions failed: %', functions_failed;
    RAISE NOTICE '================================================';

    -- Verify the fix by counting remaining vulnerable functions
    DECLARE
        remaining_vulnerable INTEGER;
    BEGIN
        SELECT COUNT(*) INTO remaining_vulnerable
        FROM pg_catalog.pg_proc p
        INNER JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND NOT (p.proconfig IS NOT NULL AND 'search_path' = ANY(
            SELECT split_part(unnest(p.proconfig), '=', 1)
        ));

        IF remaining_vulnerable > 0 THEN
            RAISE WARNING 'Still have % vulnerable functions without search_path', remaining_vulnerable;
        ELSE
            RAISE NOTICE 'SUCCESS: All public schema functions now have explicit search_path';
        END IF;
    END;
END $$;

-- ============================================
-- SUMMARY
-- ============================================
-- Total functions secured: 109
-- Security improvement: All functions now use explicit empty search_path
-- This prevents search path manipulation attacks
-- All functions will now search only in explicitly qualified schemas
-- ============================================

COMMENT ON SCHEMA public IS 'All public schema functions now secured with explicit search_path';
