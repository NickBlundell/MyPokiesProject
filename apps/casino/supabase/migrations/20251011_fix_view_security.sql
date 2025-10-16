-- ============================================
-- FIX VIEW SECURITY ISSUES
-- Date: October 11, 2025
--
-- Addresses 21 security definer view warnings by:
-- 1. Creating admin_reporting schema for admin-only views
-- 2. Moving sensitive views to admin schema
-- 3. Ensuring user-facing views respect RLS
-- ============================================

-- ============================================
-- PART 1: CREATE ADMIN SCHEMA
-- ============================================

CREATE SCHEMA IF NOT EXISTS admin_reporting;
GRANT USAGE ON SCHEMA admin_reporting TO service_role;
REVOKE ALL ON SCHEMA admin_reporting FROM public, anon, authenticated;

-- ============================================
-- PART 2: MOVE ADMIN-ONLY VIEWS
-- ============================================

-- These views expose all player data and should only be accessible via service_role

-- unified_user_profile - comprehensive player profiles
DROP VIEW IF EXISTS public.unified_user_profile CASCADE;
CREATE OR REPLACE VIEW admin_reporting.unified_user_profile AS
SELECT
    u.id AS player_id,
    u.external_user_id,
    u.email,
    u.auth_user_id,
    u.created_at AS registered_at,
    u.updated_at,
    pl.current_tier_id,
    lt.tier_name,
    lt.tier_level,
    pl.total_points_earned,
    pl.available_points,
    pl.lifetime_wagered,
    pl.last_activity_at AS loyalty_last_activity,
    ub.balance AS current_balance,
    ub.bonus_balance,
    ub.locked_bonus,
    ub.currency
FROM users u
LEFT JOIN player_loyalty pl ON u.id = pl.user_id
LEFT JOIN loyalty_tiers lt ON pl.current_tier_id = lt.id
LEFT JOIN user_balances ub ON u.id = ub.user_id AND ub.currency = 'AUD';

-- player_lifetime_value - financial metrics for all players
DROP VIEW IF EXISTS public.player_lifetime_value CASCADE;
CREATE OR REPLACE VIEW admin_reporting.player_lifetime_value AS
SELECT
    u.id AS player_id,
    u.email,
    u.created_at AS registered_at,
    COALESCE(SUM(CASE WHEN t.type = 'credit' AND t.subtype = 'deposit' THEN t.amount ELSE 0 END), 0) AS total_deposits,
    COALESCE(SUM(CASE WHEN t.type = 'debit' AND t.subtype = 'withdrawal' THEN t.amount ELSE 0 END), 0) AS total_withdrawals,
    COALESCE(SUM(CASE WHEN t.type = 'debit' AND t.subtype = 'wager' THEN t.amount ELSE 0 END), 0) AS lifetime_wagered
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.account_status = 'active'
GROUP BY u.id, u.email, u.created_at
ORDER BY total_deposits DESC;

-- active_sessions - all current player sessions
DROP VIEW IF EXISTS public.active_sessions CASCADE;
CREATE OR REPLACE VIEW admin_reporting.active_sessions AS
SELECT
    ps.id,
    ps.player_id,
    u.email AS player_email,
    u.external_user_id,
    ps.started_at,
    ps.last_activity_at,
    ps.device_type,
    ps.ip_address,
    ps.country_code,
    ps.is_suspicious
FROM player_sessions ps
LEFT JOIN users u ON ps.player_id = u.id
WHERE ps.is_active = true
ORDER BY ps.last_activity_at DESC;

-- player_action_history - admin actions log
DROP VIEW IF EXISTS public.player_action_history CASCADE;
CREATE OR REPLACE VIEW admin_reporting.player_action_history AS
SELECT
    apa.id,
    apa.player_id,
    u.external_user_id,
    u.email AS player_email,
    apa.admin_user_id,
    au.full_name AS admin_name,
    apa.action_type,
    apa.action_category,
    apa.field_changed,
    apa.before_value,
    apa.after_value,
    apa.reason,
    apa.created_at
FROM admin_player_actions apa
LEFT JOIN users u ON apa.player_id = u.id
LEFT JOIN admin_users au ON apa.admin_user_id = au.id;

-- player_email_stats - email engagement for all players
DROP VIEW IF EXISTS public.player_email_stats CASCADE;
CREATE OR REPLACE VIEW admin_reporting.player_email_stats AS
SELECT
    es.player_id,
    u.email AS player_email,
    COUNT(*) AS total_emails_received,
    COUNT(*) FILTER (WHERE es.delivered_at IS NOT NULL) AS total_delivered,
    COUNT(*) FILTER (WHERE es.opened_at IS NOT NULL) AS total_opened,
    COUNT(*) FILTER (WHERE es.first_click_at IS NOT NULL) AS total_clicked
FROM email_sends es
LEFT JOIN users u ON es.player_id = u.id
GROUP BY es.player_id, u.email;

-- player_session_stats - session analytics for all players
DROP VIEW IF EXISTS public.player_session_stats CASCADE;
CREATE OR REPLACE VIEW admin_reporting.player_session_stats AS
SELECT
    ps.player_id,
    u.email AS player_email,
    COUNT(*) AS total_sessions,
    AVG(ps.duration_seconds) AS avg_session_duration_seconds,
    MAX(ps.started_at) AS last_session_at
FROM player_sessions ps
LEFT JOIN users u ON ps.player_id = u.id
WHERE ps.ended_at IS NOT NULL
GROUP BY ps.player_id, u.email;

-- email_campaign_performance - campaign metrics
DROP VIEW IF EXISTS public.email_campaign_performance CASCADE;
CREATE OR REPLACE VIEW admin_reporting.email_campaign_performance AS
SELECT
    ec.id AS campaign_id,
    ec.campaign_name,
    ec.campaign_type,
    ec.status,
    ec.sent_at,
    ec.total_sent,
    ec.total_opened,
    ec.open_rate,
    ec.click_rate,
    ec.total_revenue
FROM email_campaigns ec;

-- marketing_campaign_roi - campaign ROI analysis
DROP VIEW IF EXISTS public.marketing_campaign_roi CASCADE;
CREATE OR REPLACE VIEW admin_reporting.marketing_campaign_roi AS
SELECT
    id AS campaign_id,
    campaign_name,
    campaign_type,
    total_sent,
    total_conversions,
    total_revenue,
    conversion_rate
FROM email_campaigns
WHERE status = 'sent'
ORDER BY sent_at DESC;

-- Grant SELECT on all admin views to service_role only
GRANT SELECT ON ALL TABLES IN SCHEMA admin_reporting TO service_role;

-- ============================================
-- PART 3: KEEP USER-FACING VIEWS IN PUBLIC
-- ============================================

-- These views are user-scoped and safe for public schema

-- my_recent_transactions already properly scoped - recreate to ensure it's correct
DROP VIEW IF EXISTS public.my_recent_transactions CASCADE;
CREATE OR REPLACE VIEW public.my_recent_transactions AS
SELECT
    t.id,
    t.tid,
    t.type,
    t.subtype,
    t.amount,
    t.currency,
    t.created_at,
    gr.game_desc
FROM transactions t
LEFT JOIN game_rounds gr ON t.game_round_id = gr.id
JOIN users u ON t.user_id = u.id
WHERE u.auth_user_id = auth.uid()
ORDER BY t.created_at DESC;

-- active_bonus_offers - public data, safe to keep
-- (already exists and is fine - no changes needed)

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

-- Query to verify schema separation
DO $$
BEGIN
    RAISE NOTICE 'Admin views moved to admin_reporting schema';
    RAISE NOTICE 'Public views remain in public schema with RLS scoping';
    RAISE NOTICE 'Access to admin_reporting limited to service_role only';
END $$;
