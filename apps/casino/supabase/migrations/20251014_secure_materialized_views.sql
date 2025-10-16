-- ============================================
-- SECURE MATERIALIZED VIEWS WITH RLS
-- Generated: 2025-10-14
-- Security Issue: Materialized views exposed via API without proper RLS
-- Solution: Enable RLS and create admin-only policies
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0016_materialized_view_in_api
-- ============================================

-- Materialized views containing sensitive analytics data need to be protected
-- with Row Level Security to prevent unauthorized access via the Data API.

-- ============================================
-- SECURE DAILY PERFORMANCE SNAPSHOT
-- ============================================

-- Enable RLS on daily_performance_snapshot if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = 'daily_performance_snapshot'
    ) THEN
        ALTER MATERIALIZED VIEW public.daily_performance_snapshot ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on daily_performance_snapshot';

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Admin only access to daily_performance_snapshot" ON public.daily_performance_snapshot;

        -- Create admin-only access policy
        CREATE POLICY "Admin only access to daily_performance_snapshot"
            ON public.daily_performance_snapshot
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM admin_users
                    WHERE admin_users.auth_user_id = auth.uid()
                    AND admin_users.is_active = true
                )
            );

        RAISE NOTICE 'Created admin-only policy for daily_performance_snapshot';
    ELSE
        RAISE NOTICE 'Materialized view daily_performance_snapshot does not exist, skipping';
    END IF;
END $$;

-- ============================================
-- SECURE REVENUE ANALYTICS
-- ============================================

-- Enable RLS on revenue_analytics if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = 'revenue_analytics'
    ) THEN
        ALTER MATERIALIZED VIEW public.revenue_analytics ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on revenue_analytics';

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Admin only access to revenue_analytics" ON public.revenue_analytics;

        -- Create admin-only access policy
        CREATE POLICY "Admin only access to revenue_analytics"
            ON public.revenue_analytics
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM admin_users
                    WHERE admin_users.auth_user_id = auth.uid()
                    AND admin_users.is_active = true
                )
            );

        RAISE NOTICE 'Created admin-only policy for revenue_analytics';
    ELSE
        RAISE NOTICE 'Materialized view revenue_analytics does not exist, skipping';
    END IF;
END $$;

-- ============================================
-- SECURE PLAYER COHORT ANALYSIS
-- ============================================

-- Enable RLS on player_cohort_analysis if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = 'player_cohort_analysis'
    ) THEN
        ALTER MATERIALIZED VIEW public.player_cohort_analysis ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on player_cohort_analysis';

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Admin only access to player_cohort_analysis" ON public.player_cohort_analysis;

        -- Create admin-only access policy
        CREATE POLICY "Admin only access to player_cohort_analysis"
            ON public.player_cohort_analysis
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM admin_users
                    WHERE admin_users.auth_user_id = auth.uid()
                    AND admin_users.is_active = true
                )
            );

        RAISE NOTICE 'Created admin-only policy for player_cohort_analysis';
    ELSE
        RAISE NOTICE 'Materialized view player_cohort_analysis does not exist, skipping';
    END IF;
END $$;

-- ============================================
-- SECURE ALL OTHER MATERIALIZED VIEWS
-- ============================================

-- As a safety measure, secure any other materialized views that might exist
-- and don't already have RLS enabled
DO $$
DECLARE
    mv_record RECORD;
    view_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking for other unsecured materialized views...';

    FOR mv_record IN
        SELECT schemaname, matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
        AND matviewname NOT IN ('daily_performance_snapshot', 'revenue_analytics', 'player_cohort_analysis')
    LOOP
        -- Check if RLS is already enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = mv_record.schemaname
            AND c.relname = mv_record.matviewname
            AND c.relrowsecurity = true
        ) THEN
            -- Enable RLS
            EXECUTE format('ALTER MATERIALIZED VIEW %I.%I ENABLE ROW LEVEL SECURITY',
                mv_record.schemaname, mv_record.matviewname);

            -- Create admin-only policy
            EXECUTE format(
                'CREATE POLICY "Admin only access" ON %I.%I FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM admin_users
                        WHERE admin_users.auth_user_id = auth.uid()
                        AND admin_users.is_active = true
                    )
                )',
                mv_record.schemaname, mv_record.matviewname
            );

            view_count := view_count + 1;
            RAISE NOTICE 'Secured materialized view: %.%', mv_record.schemaname, mv_record.matviewname;
        END IF;
    END LOOP;

    IF view_count > 0 THEN
        RAISE NOTICE 'Secured % additional materialized views', view_count;
    ELSE
        RAISE NOTICE 'No additional materialized views needed securing';
    END IF;
END $$;

-- ============================================
-- GRANT SERVICE ROLE ACCESS
-- ============================================

-- Service role should have full access to all materialized views for refresh operations
DO $$
DECLARE
    mv_record RECORD;
BEGIN
    FOR mv_record IN
        SELECT schemaname, matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
    LOOP
        -- Create service role policy if it doesn't exist
        BEGIN
            EXECUTE format(
                'CREATE POLICY "Service role full access" ON %I.%I FOR ALL USING (auth.role() = ''service_role'')',
                mv_record.schemaname, mv_record.matviewname
            );
            RAISE NOTICE 'Added service role policy to: %.%', mv_record.schemaname, mv_record.matviewname;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Service role policy already exists for: %.%', mv_record.schemaname, mv_record.matviewname;
        END;
    END LOOP;
END $$;

-- ============================================
-- SUMMARY AND VERIFICATION
-- ============================================

DO $$
DECLARE
    secured_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Count total materialized views
    SELECT COUNT(*) INTO total_count
    FROM pg_matviews
    WHERE schemaname = 'public';

    -- Count secured views (with RLS enabled)
    SELECT COUNT(*) INTO secured_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_matviews mv ON mv.schemaname = n.nspname AND mv.matviewname = c.relname
    WHERE n.nspname = 'public'
    AND c.relrowsecurity = true;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Materialized View Security Summary';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total materialized views: %', total_count;
    RAISE NOTICE 'Secured with RLS: %', secured_count;

    IF secured_count < total_count THEN
        RAISE WARNING '% materialized views still need RLS!', (total_count - secured_count);
    ELSE
        RAISE NOTICE 'SUCCESS: All materialized views are now secured with RLS';
    END IF;
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON SCHEMA public IS 'All materialized views now secured with RLS policies restricting access to admin users only';
