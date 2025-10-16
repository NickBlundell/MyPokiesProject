-- ============================================
-- DATABASE SECURITY FIX - Version 2 (Corrected)
-- Date: October 11, 2025
--
-- Fixes:
-- - 14 Tables Without RLS
-- - Security Definer Views
-- ============================================

-- ============================================
-- PART 1: ENABLE RLS ON ALL MISSING TABLES
-- ============================================

-- Enable RLS (if tables exist)
DO $$
BEGIN
    -- Admin tables
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_sessions') THEN
        ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'player_tags') THEN
        ALTER TABLE player_tags ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'player_segment_members') THEN
        ALTER TABLE player_segment_members ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_sends') THEN
        ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ticket_messages') THEN
        ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'player_limits') THEN
        ALTER TABLE player_limits ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scheduled_reports') THEN
        ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'report_runs') THEN
        ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Archive tables
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'archived_transactions') THEN
        ALTER TABLE archived_transactions ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'archived_game_rounds') THEN
        ALTER TABLE archived_game_rounds ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'archived_player_sessions') THEN
        ALTER TABLE archived_player_sessions ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'archived_email_sends') THEN
        ALTER TABLE archived_email_sends ENABLE ROW LEVEL SECURITY;
    END IF;

    -- System tables
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_retention_policies') THEN
        ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_performance_metrics') THEN
        ALTER TABLE game_performance_metrics ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================
-- PART 2: CREATE RLS POLICIES
-- ============================================

-- Service role has access to everything
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'admin_sessions', 'player_tags', 'player_segment_members',
            'campaign_sends', 'ticket_messages', 'player_limits',
            'scheduled_reports', 'report_runs', 'archived_transactions',
            'archived_game_rounds', 'archived_player_sessions',
            'archived_email_sends', 'data_retention_policies',
            'game_performance_metrics'
        )
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Service role full access" ON %I;
            CREATE POLICY "Service role full access"
            ON %I
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
        ', table_name, table_name);
    END LOOP;
END $$;

-- Block public access to admin/system tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'admin_sessions', 'campaign_sends', 'scheduled_reports',
            'report_runs', 'archived_email_sends', 'data_retention_policies'
        )
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Block public access" ON %I;
            CREATE POLICY "Block public access"
            ON %I
            FOR ALL
            TO public, anon, authenticated
            USING (false)
            WITH CHECK (false);
        ', table_name, table_name);
    END LOOP;
END $$;

-- User-specific policies for player data
-- player_tags: Users can view their own
DROP POLICY IF EXISTS "Users view own tags" ON player_tags;
CREATE POLICY "Users view own tags"
ON player_tags
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- player_segment_members: Users can view their own
DROP POLICY IF EXISTS "Users view own segments" ON player_segment_members;
CREATE POLICY "Users view own segments"
ON player_segment_members
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- player_limits: Users can view and create their own
DROP POLICY IF EXISTS "Users view own limits" ON player_limits;
CREATE POLICY "Users view own limits"
ON player_limits
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can set limits" ON player_limits;
CREATE POLICY "Users can set limits"
ON player_limits
FOR INSERT
TO authenticated
WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ticket_messages: Users can view/create messages on their tickets
DROP POLICY IF EXISTS "Users view own ticket messages" ON ticket_messages;
CREATE POLICY "Users view own ticket messages"
ON ticket_messages
FOR SELECT
TO authenticated
USING (
    ticket_id IN (
        SELECT st.id FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users create ticket messages" ON ticket_messages;
CREATE POLICY "Users create ticket messages"
ON ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
    ticket_id IN (
        SELECT st.id FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
    )
);

-- Archive tables: Users can view their own archived data
DROP POLICY IF EXISTS "Users view own archived transactions" ON archived_transactions;
CREATE POLICY "Users view own archived transactions"
ON archived_transactions
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own archived game rounds" ON archived_game_rounds;
CREATE POLICY "Users view own archived game rounds"
ON archived_game_rounds
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own archived sessions" ON archived_player_sessions;
CREATE POLICY "Users view own archived sessions"
ON archived_player_sessions
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- game_performance_metrics: Public can view (read-only analytics)
DROP POLICY IF EXISTS "Public view game metrics" ON game_performance_metrics;
CREATE POLICY "Public view game metrics"
ON game_performance_metrics
FOR SELECT
TO public, anon, authenticated
USING (true);

-- ============================================
-- PART 3: FIX SECURITY DEFINER VIEWS
-- ============================================

-- Create admin schema for security definer views
CREATE SCHEMA IF NOT EXISTS admin_reporting;
GRANT USAGE ON SCHEMA admin_reporting TO service_role;
REVOKE ALL ON SCHEMA admin_reporting FROM public, anon, authenticated;

-- Move security-sensitive views to admin schema
-- Only views that NEED security definer for admin reporting

-- unified_user_profile - for admin use only
DROP VIEW IF EXISTS admin_reporting.unified_user_profile;
CREATE OR REPLACE VIEW admin_reporting.unified_user_profile
WITH (security_definer = true) AS
SELECT
    u.id,
    u.email,
    u.external_user_id,
    u.created_at,
    u.updated_at,
    ub.balance as current_balance,
    ub.bonus_balance,
    pl.current_tier_id,
    pl.total_points_earned,
    pl.available_points,
    pl.lifetime_wagered,
    lt.tier_name
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id AND ub.currency = 'AUD'
LEFT JOIN player_loyalty pl ON u.id = pl.user_id
LEFT JOIN loyalty_tiers lt ON pl.current_tier_id = lt.id;

-- player_lifetime_value - for admin reporting
DROP VIEW IF EXISTS admin_reporting.player_lifetime_value;
CREATE OR REPLACE VIEW admin_reporting.player_lifetime_value
WITH (security_definer = true) AS
SELECT
    user_id,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
    SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END) as total_wagered,
    SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END) as total_won
FROM transactions
GROUP BY user_id;

-- Grant SELECT to service role only
GRANT SELECT ON ALL TABLES IN SCHEMA admin_reporting TO service_role;

-- Drop public security definer views that should respect RLS
DROP VIEW IF EXISTS public.active_bonus_offers CASCADE;
DROP VIEW IF EXISTS public.my_recent_transactions CASCADE;

-- Recreate as regular views (respect RLS)
CREATE OR REPLACE VIEW public.active_bonus_offers AS
SELECT
    id,
    bonus_code,
    bonus_name,
    bonus_type,
    match_percentage,
    max_bonus_amount,
    min_deposit,
    wagering_requirement_multiplier,
    valid_days,
    description
FROM bonus_offers
WHERE active = true
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.my_recent_transactions AS
SELECT
    t.id,
    t.type,
    t.amount,
    t.currency,
    t.status,
    t.created_at,
    t.description
FROM transactions t
WHERE t.user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
)
ORDER BY t.created_at DESC
LIMIT 100;

-- ============================================
-- PART 4: VERIFICATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION verify_rls_fixes()
RETURNS TABLE(
    table_name text,
    rls_enabled boolean,
    policy_count bigint,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::text,
        t.rowsecurity as rls_enabled,
        (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') as policy_count,
        CASE
            WHEN t.rowsecurity AND (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') > 0
            THEN 'PASS'
            WHEN t.rowsecurity
            THEN 'WARN - RLS enabled but no policies'
            ELSE 'FAIL - RLS not enabled'
        END::text as status
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'admin_sessions', 'player_tags', 'player_segment_members',
        'campaign_sends', 'ticket_messages', 'player_limits',
        'scheduled_reports', 'report_runs', 'archived_transactions',
        'archived_game_rounds', 'archived_player_sessions',
        'archived_email_sends', 'data_retention_policies',
        'game_performance_metrics'
    )
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Run verification
-- ============================================
SELECT * FROM verify_rls_fixes();
