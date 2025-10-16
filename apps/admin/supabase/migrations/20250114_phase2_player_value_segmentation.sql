-- Phase 2: Player Value Segmentation and Analytics
-- Migration Date: 2025-01-14
-- Purpose: Create materialized views for player segmentation and value analysis

-- ============================================================================
-- PART 1: Player Value Metrics Materialized View
-- ============================================================================

-- This materialized view aggregates player value metrics for fast queries
CREATE MATERIALIZED VIEW IF NOT EXISTS player_value_metrics AS
SELECT
    u.id as player_id,
    u.email,
    u.external_user_id,
    u.created_at as registered_at,
    u.account_status,

    -- Loyalty info
    pl.current_tier_id,
    lt.tier_name,
    lt.tier_level,
    pl.lifetime_wagered,
    pl.total_points_earned,
    pl.last_activity_at,

    -- Financial metrics
    COALESCE(ub.balance, 0) as current_balance,
    COALESCE(ub.bonus_balance, 0) as current_bonus_balance,

    -- Deposit metrics
    COALESCE((
        SELECT COUNT(*)
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.type = 'credit'
        AND t.subtype = 'deposit'
    ), 0) as total_deposits_count,

    COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.type = 'credit'
        AND t.subtype = 'deposit'
    ), 0) as total_deposits_value,

    COALESCE((
        SELECT AVG(amount)
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.type = 'credit'
        AND t.subtype = 'deposit'
    ), 0) as avg_deposit_value,

    -- Recent deposit activity
    (
        SELECT COUNT(*)
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.type = 'credit'
        AND t.subtype = 'deposit'
        AND t.created_at >= NOW() - INTERVAL '30 days'
    ) as deposits_last_30d,

    (
        SELECT COUNT(*)
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.type = 'credit'
        AND t.subtype = 'deposit'
        AND t.created_at >= NOW() - INTERVAL '7 days'
    ) as deposits_last_7d,

    -- Wager metrics
    COALESCE((
        SELECT COUNT(*)
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.type = 'debit'
        AND t.subtype = 'wager'
    ), 0) as total_wagers_count,

    COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.type = 'debit'
        AND t.subtype = 'wager'
    ), 0) as total_wagered_value,

    -- Game rounds
    COALESCE((
        SELECT COUNT(*)
        FROM game_rounds gr
        WHERE gr.user_id = u.id
        AND gr.status = 'completed'
    ), 0) as total_game_rounds,

    (
        SELECT COUNT(*)
        FROM game_rounds gr
        WHERE gr.user_id = u.id
        AND gr.status = 'completed'
        AND gr.started_at >= NOW() - INTERVAL '30 days'
    ) as game_rounds_last_30d,

    -- Session metrics
    COALESCE((
        SELECT COUNT(*)
        FROM player_sessions ps
        WHERE ps.player_id = u.id
    ), 0) as total_sessions,

    COALESCE((
        SELECT AVG(duration_seconds)
        FROM player_sessions ps
        WHERE ps.player_id = u.id
        AND ps.ended_at IS NOT NULL
    ), 0) as avg_session_duration_seconds,

    (
        SELECT COUNT(*)
        FROM player_sessions ps
        WHERE ps.player_id = u.id
        AND ps.started_at >= NOW() - INTERVAL '30 days'
    ) as sessions_last_30d,

    -- Bonus metrics
    (
        SELECT COUNT(*)
        FROM player_bonuses pb
        WHERE pb.user_id = u.id
        AND pb.status = 'completed'
    ) as bonuses_completed_count,

    (
        SELECT COUNT(*)
        FROM player_bonuses pb
        WHERE pb.user_id = u.id
        AND pb.status = 'active'
    ) as bonuses_active_count,

    -- Time-based metrics
    EXTRACT(DAYS FROM (NOW() - u.created_at)) as days_since_registration,
    EXTRACT(DAYS FROM (NOW() - pl.last_activity_at)) as days_since_last_activity,

    -- Last transaction
    (
        SELECT MAX(created_at)
        FROM transactions t
        WHERE t.user_id = u.id
    ) as last_transaction_at,

    -- Email engagement
    COALESCE((
        SELECT open_rate
        FROM player_email_stats pes
        WHERE pes.player_id = u.id
    ), 0) as email_open_rate,

    COALESCE((
        SELECT engagement_level
        FROM player_email_stats pes
        WHERE pes.player_id = u.id
    ), 'no_engagement') as email_engagement_level,

    -- Risk/Compliance flags
    EXISTS (
        SELECT 1
        FROM compliance_checks cc
        WHERE cc.player_id = u.id
        AND cc.status = 'flagged'
    ) as has_compliance_flags,

    -- Calculated scores
    -- Value Score (0-100): Based on deposits and wagering
    LEAST(100, (
        (COALESCE((
            SELECT SUM(amount)
            FROM transactions t
            WHERE t.user_id = u.id
            AND t.type = 'credit'
            AND t.subtype = 'deposit'
        ), 0) / 100) * 0.6 +
        (pl.lifetime_wagered / 1000) * 0.4
    )) as value_score,

    -- Engagement Score (0-100): Based on activity frequency
    LEAST(100, (
        (COALESCE((
            SELECT COUNT(*)
            FROM player_sessions ps
            WHERE ps.player_id = u.id
            AND ps.started_at >= NOW() - INTERVAL '30 days'
        ), 0) * 3) +
        (COALESCE((
            SELECT COUNT(*)
            FROM game_rounds gr
            WHERE gr.user_id = u.id
            AND gr.started_at >= NOW() - INTERVAL '30 days'
        ), 0) / 10)
    )) as engagement_score,

    -- Refresh timestamp
    NOW() as last_refreshed_at

FROM users u
LEFT JOIN player_loyalty pl ON u.id = pl.user_id
LEFT JOIN loyalty_tiers lt ON pl.current_tier_id = lt.id
LEFT JOIN user_balances ub ON u.id = ub.user_id AND ub.currency = 'AUD'
WHERE u.account_status = 'active';

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_player_value_metrics_player_id ON player_value_metrics(player_id);
CREATE INDEX idx_player_value_metrics_value_score ON player_value_metrics(value_score DESC);
CREATE INDEX idx_player_value_metrics_engagement_score ON player_value_metrics(engagement_score DESC);
CREATE INDEX idx_player_value_metrics_tier ON player_value_metrics(tier_level DESC);
CREATE INDEX idx_player_value_metrics_deposits ON player_value_metrics(total_deposits_value DESC);
CREATE INDEX idx_player_value_metrics_last_activity ON player_value_metrics(last_activity_at DESC);

-- Grant access
GRANT SELECT ON player_value_metrics TO service_role;

-- ============================================================================
-- PART 2: Player Segmentation View
-- ============================================================================

-- This view segments players into categories based on value and engagement
CREATE OR REPLACE VIEW player_segmentation AS
SELECT
    pvm.*,

    -- Primary segment
    CASE
        WHEN pvm.has_compliance_flags THEN 'COMPLIANCE_REVIEW'
        WHEN pvm.days_since_last_activity > 90 THEN 'CHURNED'
        WHEN pvm.days_since_last_activity > 30 THEN 'AT_RISK'
        WHEN pvm.value_score >= 80 AND pvm.engagement_score >= 70 THEN 'VIP'
        WHEN pvm.value_score >= 50 AND pvm.engagement_score >= 50 THEN 'HIGH_VALUE'
        WHEN pvm.value_score >= 30 OR pvm.engagement_score >= 30 THEN 'ACTIVE'
        WHEN pvm.days_since_registration <= 7 THEN 'NEW'
        WHEN pvm.total_deposits_count = 0 THEN 'NON_DEPOSITOR'
        ELSE 'LOW_VALUE'
    END as player_segment,

    -- Detailed sub-segment
    CASE
        WHEN pvm.deposits_last_7d > 0 THEN 'recently_deposited'
        WHEN pvm.sessions_last_30d > 20 THEN 'highly_engaged'
        WHEN pvm.sessions_last_30d > 5 THEN 'moderately_engaged'
        WHEN pvm.sessions_last_30d > 0 THEN 'lightly_engaged'
        WHEN pvm.days_since_last_activity <= 7 THEN 'recent_visitor'
        WHEN pvm.days_since_last_activity <= 30 THEN 'occasional_visitor'
        ELSE 'inactive'
    END as engagement_sub_segment,

    -- Lifetime Value (LTV) projection
    CASE
        WHEN pvm.days_since_registration > 0 THEN
            (pvm.total_deposits_value / NULLIF(pvm.days_since_registration, 0)) * 365
        ELSE 0
    END as projected_annual_value,

    -- Risk level
    CASE
        WHEN pvm.has_compliance_flags THEN 'high'
        WHEN pvm.total_deposits_value > 10000 AND pvm.days_since_last_activity > 14 THEN 'medium'
        WHEN pvm.deposits_last_7d > 3 THEN 'medium'
        ELSE 'low'
    END as risk_level,

    -- Marketing priority
    CASE
        WHEN pvm.has_compliance_flags THEN 0
        WHEN pvm.player_segment IN ('VIP', 'HIGH_VALUE') AND pvm.days_since_last_activity > 7 THEN 95
        WHEN pvm.player_segment = 'AT_RISK' AND pvm.value_score > 60 THEN 90
        WHEN pvm.player_segment = 'NEW' AND pvm.deposits_last_7d > 0 THEN 85
        WHEN pvm.player_segment = 'ACTIVE' AND pvm.deposits_last_30d > 0 THEN 70
        WHEN pvm.player_segment = 'NON_DEPOSITOR' AND pvm.sessions_last_30d > 3 THEN 60
        ELSE 30
    END as marketing_priority_score

FROM player_value_metrics pvm;

GRANT SELECT ON player_segmentation TO service_role;

-- ============================================================================
-- PART 3: Segment Summary View
-- ============================================================================

CREATE OR REPLACE VIEW segment_summary AS
SELECT
    player_segment,
    COUNT(*) as player_count,
    SUM(total_deposits_value) as total_ltv,
    AVG(total_deposits_value) as avg_ltv,
    AVG(value_score) as avg_value_score,
    AVG(engagement_score) as avg_engagement_score,
    AVG(days_since_last_activity) as avg_days_since_activity,
    SUM(deposits_last_30d) as total_deposits_last_30d,
    AVG(email_open_rate) as avg_email_open_rate
FROM player_segmentation
GROUP BY player_segment
ORDER BY player_count DESC;

GRANT SELECT ON segment_summary TO service_role;

-- ============================================================================
-- PART 4: High-Value Players at Risk View
-- ============================================================================

CREATE OR REPLACE VIEW high_value_at_risk AS
SELECT
    ps.player_id,
    ps.email,
    ps.tier_name,
    ps.total_deposits_value,
    ps.lifetime_wagered,
    ps.value_score,
    ps.engagement_score,
    ps.days_since_last_activity,
    ps.last_activity_at,
    ps.sessions_last_30d,
    ps.deposits_last_30d,

    -- Recommended action
    CASE
        WHEN ps.days_since_last_activity > 14 AND ps.days_since_last_activity <= 30 THEN 'Send reactivation email'
        WHEN ps.days_since_last_activity > 30 AND ps.days_since_last_activity <= 60 THEN 'Offer personalized bonus'
        WHEN ps.days_since_last_activity > 60 THEN 'High-touch personal outreach'
    END as recommended_action

FROM player_segmentation ps
WHERE ps.player_segment IN ('AT_RISK', 'VIP', 'HIGH_VALUE')
AND ps.value_score > 50
AND ps.days_since_last_activity > 14
ORDER BY ps.value_score DESC, ps.days_since_last_activity DESC;

GRANT SELECT ON high_value_at_risk TO service_role;

-- ============================================================================
-- PART 5: New Player Conversion Opportunities
-- ============================================================================

CREATE OR REPLACE VIEW new_player_opportunities AS
SELECT
    ps.player_id,
    ps.email,
    ps.days_since_registration,
    ps.total_sessions,
    ps.sessions_last_30d,
    ps.game_rounds_last_30d,
    ps.total_deposits_count,
    ps.total_deposits_value,
    ps.engagement_score,
    ps.email_engagement_level,

    -- Conversion likelihood
    CASE
        WHEN ps.sessions_last_30d >= 5 AND ps.game_rounds_last_30d > 10 THEN 'high'
        WHEN ps.sessions_last_30d >= 2 AND ps.game_rounds_last_30d > 0 THEN 'medium'
        ELSE 'low'
    END as conversion_likelihood,

    -- Recommended action
    CASE
        WHEN ps.total_deposits_count = 0 AND ps.sessions_last_30d >= 3 THEN 'Offer first deposit bonus'
        WHEN ps.total_deposits_count = 1 AND ps.deposits_last_7d = 0 THEN 'Offer second deposit bonus'
        WHEN ps.sessions_last_30d > 0 AND ps.game_rounds_last_30d = 0 THEN 'Send game tutorial'
        ELSE 'Monitor engagement'
    END as recommended_action

FROM player_segmentation ps
WHERE ps.player_segment IN ('NEW', 'NON_DEPOSITOR')
AND ps.days_since_registration <= 30
AND ps.sessions_last_30d > 0
ORDER BY ps.engagement_score DESC, ps.sessions_last_30d DESC;

GRANT SELECT ON new_player_opportunities TO service_role;

-- ============================================================================
-- PART 6: Helper Functions
-- ============================================================================

-- Function to refresh player value metrics materialized view
CREATE OR REPLACE FUNCTION refresh_player_value_metrics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY player_value_metrics;
    RAISE NOTICE 'Player value metrics refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_player_value_metrics() TO service_role;

-- Function to get player segment details
CREATE OR REPLACE FUNCTION get_player_segment(p_player_id UUID)
RETURNS TABLE(
    segment VARCHAR,
    value_score NUMERIC,
    engagement_score NUMERIC,
    marketing_priority INTEGER,
    recommended_actions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.player_segment::VARCHAR,
        ps.value_score,
        ps.engagement_score,
        ps.marketing_priority_score,
        ARRAY[
            CASE
                WHEN ps.player_segment = 'AT_RISK' THEN 'Send reactivation campaign'
                WHEN ps.player_segment = 'VIP' THEN 'Assign VIP manager'
                WHEN ps.player_segment = 'NEW' THEN 'Send welcome series'
                WHEN ps.player_segment = 'NON_DEPOSITOR' THEN 'Offer deposit incentive'
                ELSE 'Standard engagement'
            END
        ]::TEXT[]
    FROM player_segmentation ps
    WHERE ps.player_id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_player_segment(UUID) TO service_role;

-- Function to get segment counts
CREATE OR REPLACE FUNCTION get_segment_counts()
RETURNS TABLE(
    segment VARCHAR,
    count BIGINT,
    percentage DECIMAL
) AS $$
DECLARE
    v_total_players BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_total_players FROM player_segmentation;

    RETURN QUERY
    SELECT
        ps.player_segment::VARCHAR,
        COUNT(*)::BIGINT,
        ROUND((COUNT(*)::DECIMAL / NULLIF(v_total_players, 0) * 100), 2)
    FROM player_segmentation ps
    GROUP BY ps.player_segment
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_segment_counts() TO service_role;

-- ============================================================================
-- PART 7: Scheduled Refresh Setup
-- ============================================================================

-- Note: If pg_cron is available, uncomment the following to schedule automatic refreshes
-- This requires the pg_cron extension to be enabled

/*
-- Refresh every 6 hours
SELECT cron.schedule(
    'refresh_player_value_metrics',
    '0 */6 * * *',
    $$SELECT refresh_player_value_metrics()$$
);
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON MATERIALIZED VIEW player_value_metrics IS 'Aggregated player value metrics for fast querying - refresh periodically';
COMMENT ON VIEW player_segmentation IS 'Segments players into categories based on value and engagement';
COMMENT ON VIEW segment_summary IS 'Summary statistics for each player segment';
COMMENT ON VIEW high_value_at_risk IS 'High-value players at risk of churning - requires immediate attention';
COMMENT ON VIEW new_player_opportunities IS 'New players with conversion potential';
COMMENT ON FUNCTION refresh_player_value_metrics() IS 'Refreshes the player_value_metrics materialized view';
COMMENT ON FUNCTION get_player_segment(UUID) IS 'Returns segment classification and recommendations for a specific player';

-- ============================================================================
-- PART 8: Initial Refresh
-- ============================================================================

-- Perform initial refresh of materialized view
SELECT refresh_player_value_metrics();

-- Output summary
DO $$
DECLARE
    v_total_players INTEGER;
    v_vip_count INTEGER;
    v_at_risk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_players FROM player_value_metrics;
    SELECT COUNT(*) INTO v_vip_count FROM player_segmentation WHERE player_segment = 'VIP';
    SELECT COUNT(*) INTO v_at_risk_count FROM player_segmentation WHERE player_segment = 'AT_RISK';

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Player Value Segmentation Completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total players analyzed: %', v_total_players;
    RAISE NOTICE 'VIP players: %', v_vip_count;
    RAISE NOTICE 'At-risk players: %', v_at_risk_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Available views:';
    RAISE NOTICE '  - SELECT * FROM player_segmentation;';
    RAISE NOTICE '  - SELECT * FROM segment_summary;';
    RAISE NOTICE '  - SELECT * FROM high_value_at_risk;';
    RAISE NOTICE '  - SELECT * FROM new_player_opportunities;';
    RAISE NOTICE '';
    RAISE NOTICE 'To refresh metrics: SELECT refresh_player_value_metrics();';
END $$;
