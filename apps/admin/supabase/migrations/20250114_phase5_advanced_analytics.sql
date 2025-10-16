-- Phase 5: Advanced Analytics and Reporting
-- Migration Date: 2025-01-14
-- Purpose: Create advanced analytics views and game performance metrics

-- ============================================================================
-- PART 1: Game Performance Metrics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Game identification
    game_id VARCHAR(255) UNIQUE NOT NULL,
    game_name VARCHAR(255),
    game_provider VARCHAR(100),
    game_category VARCHAR(50), -- 'slots', 'table', 'live', etc.

    -- Volume metrics
    total_rounds BIGINT DEFAULT 0,
    unique_players BIGINT DEFAULT 0,
    total_players_all_time BIGINT DEFAULT 0,

    -- Financial metrics
    total_wagered DECIMAL(20,2) DEFAULT 0,
    total_won DECIMAL(20,2) DEFAULT 0,
    net_revenue DECIMAL(20,2) GENERATED ALWAYS AS (total_wagered - total_won) STORED,

    -- RTP (Return to Player)
    rtp_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_wagered > 0
        THEN (total_won / total_wagered * 100)
        ELSE 0 END
    ) STORED,

    -- Average metrics
    avg_bet_amount DECIMAL(20,2),
    avg_win_amount DECIMAL(20,2),
    avg_session_length_minutes DECIMAL(10,2),

    -- Engagement metrics
    rounds_last_24h INTEGER DEFAULT 0,
    rounds_last_7d INTEGER DEFAULT 0,
    rounds_last_30d INTEGER DEFAULT 0,
    players_last_24h INTEGER DEFAULT 0,
    players_last_7d INTEGER DEFAULT 0,
    players_last_30d INTEGER DEFAULT 0,

    -- Popularity score (0-100)
    popularity_score DECIMAL(5,2) DEFAULT 0,

    -- Performance indicators
    is_popular BOOLEAN DEFAULT FALSE,
    is_high_revenue BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,

    -- Timestamps
    first_played_at TIMESTAMPTZ,
    last_played_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_performance_game_id ON game_performance_metrics(game_id);
CREATE INDEX idx_game_performance_category ON game_performance_metrics(game_category);
CREATE INDEX idx_game_performance_popularity ON game_performance_metrics(popularity_score DESC);
CREATE INDEX idx_game_performance_revenue ON game_performance_metrics(net_revenue DESC);
CREATE INDEX idx_game_performance_rounds ON game_performance_metrics(total_rounds DESC);
CREATE INDEX idx_game_performance_popular ON game_performance_metrics(is_popular) WHERE is_popular = TRUE;
CREATE INDEX idx_game_performance_trending ON game_performance_metrics(is_trending) WHERE is_trending = TRUE;

GRANT SELECT ON game_performance_metrics TO service_role;

-- ============================================================================
-- PART 2: Daily Performance Snapshot Materialized View
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_performance_snapshot AS
SELECT
    CURRENT_DATE as snapshot_date,

    -- Player metrics
    (SELECT COUNT(DISTINCT player_id) FROM player_sessions WHERE started_at >= CURRENT_DATE) as active_players_today,
    (SELECT COUNT(DISTINCT player_id) FROM player_sessions WHERE started_at >= CURRENT_DATE - INTERVAL '7 days') as active_players_7d,
    (SELECT COUNT(DISTINCT player_id) FROM player_sessions WHERE started_at >= CURRENT_DATE - INTERVAL '30 days') as active_players_30d,

    -- New registrations
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as new_registrations_today,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_registrations_7d,

    -- Session metrics
    (SELECT COUNT(*) FROM player_sessions WHERE started_at >= CURRENT_DATE) as sessions_today,
    (SELECT AVG(duration_seconds) FROM player_sessions WHERE started_at >= CURRENT_DATE AND ended_at IS NOT NULL) as avg_session_duration_today,

    -- Financial metrics
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE type = 'credit' AND subtype = 'deposit' AND created_at >= CURRENT_DATE) as deposits_today,

    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE type = 'debit' AND subtype = 'wager' AND created_at >= CURRENT_DATE) as wagers_today,

    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE type = 'credit' AND subtype = 'win' AND created_at >= CURRENT_DATE) as wins_today,

    (SELECT COUNT(DISTINCT user_id) FROM transactions
     WHERE type = 'credit' AND subtype = 'deposit' AND created_at >= CURRENT_DATE) as depositing_players_today,

    -- Game metrics
    (SELECT COUNT(*) FROM game_rounds WHERE started_at >= CURRENT_DATE) as game_rounds_today,
    (SELECT COUNT(DISTINCT game_id) FROM game_rounds WHERE started_at >= CURRENT_DATE) as unique_games_played_today,

    -- Bonus metrics
    (SELECT COUNT(*) FROM player_bonuses WHERE issued_at >= CURRENT_DATE) as bonuses_issued_today,
    (SELECT COALESCE(SUM(bonus_amount), 0) FROM player_bonuses WHERE issued_at >= CURRENT_DATE) as bonus_value_issued_today,
    (SELECT COUNT(*) FROM player_bonuses WHERE status = 'active') as active_bonuses_total,

    -- Support metrics
    (SELECT COUNT(*) FROM support_tickets WHERE created_at >= CURRENT_DATE) as support_tickets_today,
    (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets_total,

    -- Email metrics
    (SELECT COUNT(*) FROM email_sends WHERE sent_at >= CURRENT_DATE) as emails_sent_today,
    (SELECT COUNT(*) FROM email_sends WHERE opened_at >= CURRENT_DATE) as emails_opened_today,

    NOW() as created_at;

CREATE UNIQUE INDEX idx_daily_performance_snapshot_date ON daily_performance_snapshot(snapshot_date);
GRANT SELECT ON daily_performance_snapshot TO service_role;

-- ============================================================================
-- PART 3: Revenue Analytics Materialized View
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS revenue_analytics AS
SELECT
    DATE_TRUNC('day', t.created_at) as date,
    t.currency,

    -- Deposit metrics
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit' AND t.subtype = 'deposit'), 0) as deposits,
    COUNT(*) FILTER (WHERE t.type = 'credit' AND t.subtype = 'deposit') as deposit_count,
    COUNT(DISTINCT t.user_id) FILTER (WHERE t.type = 'credit' AND t.subtype = 'deposit') as depositing_players,

    -- Withdrawal metrics
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit' AND t.subtype = 'withdrawal'), 0) as withdrawals,
    COUNT(*) FILTER (WHERE t.type = 'debit' AND t.subtype = 'withdrawal') as withdrawal_count,

    -- Wager metrics
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit' AND t.subtype = 'wager'), 0) as total_wagered,
    COUNT(*) FILTER (WHERE t.type = 'debit' AND t.subtype = 'wager') as wager_count,

    -- Win metrics
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit' AND t.subtype = 'win'), 0) as total_won,

    -- Net revenue
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit' AND t.subtype = 'deposit'), 0) -
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit' AND t.subtype = 'withdrawal'), 0) as net_revenue,

    -- GGR (Gross Gaming Revenue) = wagers - wins
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit' AND t.subtype = 'wager'), 0) -
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit' AND t.subtype = 'win'), 0) as ggr

FROM transactions t
WHERE t.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', t.created_at), t.currency
ORDER BY date DESC;

CREATE INDEX idx_revenue_analytics_date ON revenue_analytics(date DESC);
CREATE INDEX idx_revenue_analytics_currency ON revenue_analytics(currency);
GRANT SELECT ON revenue_analytics TO service_role;

-- ============================================================================
-- PART 4: Player Cohort Analysis Materialized View
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS player_cohort_analysis AS
SELECT
    DATE_TRUNC('month', u.created_at) as cohort_month,
    DATE_TRUNC('month', t.created_at) as activity_month,
    EXTRACT(MONTH FROM AGE(t.created_at, u.created_at))::INTEGER as months_since_registration,

    -- Cohort size
    COUNT(DISTINCT u.id) as cohort_size,

    -- Active players in this month
    COUNT(DISTINCT t.user_id) as active_players,

    -- Retention rate
    (COUNT(DISTINCT t.user_id)::DECIMAL / NULLIF(COUNT(DISTINCT u.id), 0) * 100) as retention_rate,

    -- Revenue metrics
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit' AND t.subtype = 'deposit'), 0) as total_deposits,
    COALESCE(AVG(t.amount) FILTER (WHERE t.type = 'credit' AND t.subtype = 'deposit'), 0) as avg_deposit,

    -- Engagement
    COUNT(*) FILTER (WHERE t.type = 'debit' AND t.subtype = 'wager') as total_wagers

FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
    AND t.created_at >= u.created_at
    AND t.created_at < u.created_at + INTERVAL '12 months'
WHERE u.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY
    DATE_TRUNC('month', u.created_at),
    DATE_TRUNC('month', t.created_at),
    EXTRACT(MONTH FROM AGE(t.created_at, u.created_at))::INTEGER
ORDER BY cohort_month DESC, months_since_registration;

CREATE INDEX idx_cohort_analysis_cohort ON player_cohort_analysis(cohort_month);
CREATE INDEX idx_cohort_analysis_months ON player_cohort_analysis(months_since_registration);
GRANT SELECT ON player_cohort_analysis TO service_role;

-- ============================================================================
-- PART 5: Game Category Performance View
-- ============================================================================

CREATE OR REPLACE VIEW game_category_performance AS
SELECT
    gpm.game_category,

    -- Volume
    COUNT(*) as game_count,
    SUM(gpm.total_rounds) as total_rounds,
    SUM(gpm.unique_players) as total_unique_players,

    -- Financial
    SUM(gpm.total_wagered) as total_wagered,
    SUM(gpm.total_won) as total_won,
    SUM(gpm.net_revenue) as net_revenue,

    -- Averages
    AVG(gpm.rtp_percentage) as avg_rtp,
    AVG(gpm.popularity_score) as avg_popularity_score,

    -- Recent activity
    SUM(gpm.rounds_last_24h) as rounds_last_24h,
    SUM(gpm.rounds_last_7d) as rounds_last_7d,
    SUM(gpm.rounds_last_30d) as rounds_last_30d,
    SUM(gpm.players_last_30d) as players_last_30d,

    -- Top games
    COUNT(*) FILTER (WHERE gpm.is_popular = TRUE) as popular_games_count

FROM game_performance_metrics gpm
WHERE gpm.game_category IS NOT NULL
GROUP BY gpm.game_category
ORDER BY total_rounds DESC;

GRANT SELECT ON game_category_performance TO service_role;

-- ============================================================================
-- PART 6: Top Games View
-- ============================================================================

CREATE OR REPLACE VIEW top_games_by_revenue AS
SELECT
    gpm.game_id,
    gpm.game_name,
    gpm.game_provider,
    gpm.game_category,
    gpm.total_rounds,
    gpm.unique_players,
    gpm.total_wagered,
    gpm.total_won,
    gpm.net_revenue,
    gpm.rtp_percentage,
    gpm.popularity_score,
    gpm.rounds_last_30d,
    gpm.players_last_30d,
    gpm.last_played_at,

    -- Rank
    ROW_NUMBER() OVER (ORDER BY gpm.net_revenue DESC) as revenue_rank,
    ROW_NUMBER() OVER (ORDER BY gpm.total_rounds DESC) as rounds_rank,
    ROW_NUMBER() OVER (ORDER BY gpm.unique_players DESC) as popularity_rank

FROM game_performance_metrics gpm
WHERE gpm.total_rounds > 0
ORDER BY gpm.net_revenue DESC
LIMIT 100;

GRANT SELECT ON top_games_by_revenue TO service_role;

-- ============================================================================
-- PART 7: Player Lifetime Value View
-- ============================================================================

CREATE OR REPLACE VIEW player_lifetime_value AS
SELECT
    u.id as player_id,
    u.email,
    u.created_at as registered_at,

    -- Deposit metrics
    COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id AND t.type = 'credit' AND t.subtype = 'deposit'
    ), 0) as total_deposits,

    COALESCE((
        SELECT COUNT(*)
        FROM transactions t
        WHERE t.user_id = u.id AND t.type = 'credit' AND t.subtype = 'deposit'
    ), 0) as deposit_count,

    -- Withdrawal metrics
    COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id AND t.type = 'debit' AND t.subtype = 'withdrawal'
    ), 0) as total_withdrawals,

    -- Net deposit (deposits - withdrawals)
    COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id AND t.type = 'credit' AND t.subtype = 'deposit'
    ), 0) - COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id AND t.type = 'debit' AND t.subtype = 'withdrawal'
    ), 0) as net_deposits,

    -- Gaming metrics
    COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id AND t.type = 'debit' AND t.subtype = 'wager'
    ), 0) as lifetime_wagered,

    COALESCE((
        SELECT COUNT(*)
        FROM game_rounds gr
        WHERE gr.user_id = u.id AND gr.status = 'completed'
    ), 0) as total_game_rounds,

    -- Bonus metrics
    COALESCE((
        SELECT SUM(bonus_amount)
        FROM player_bonuses pb
        WHERE pb.user_id = u.id
    ), 0) as total_bonus_received,

    -- Days active
    EXTRACT(DAYS FROM (NOW() - u.created_at))::INTEGER as days_since_registration,

    -- Last activity
    (
        SELECT MAX(created_at)
        FROM transactions t
        WHERE t.user_id = u.id
    ) as last_transaction_at,

    -- LTV calculation (net deposits)
    COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id AND t.type = 'credit' AND t.subtype = 'deposit'
    ), 0) - COALESCE((
        SELECT SUM(amount)
        FROM transactions t
        WHERE t.user_id = u.id AND t.type = 'debit' AND t.subtype = 'withdrawal'
    ), 0) as ltv

FROM users u
WHERE u.account_status = 'active'
ORDER BY ltv DESC;

GRANT SELECT ON player_lifetime_value TO service_role;

-- ============================================================================
-- PART 8: Marketing Campaign ROI View
-- ============================================================================

CREATE OR REPLACE VIEW marketing_campaign_roi AS
SELECT
    ec.id as campaign_id,
    ec.campaign_name,
    ec.campaign_type,
    ec.sent_at,
    ec.bonus_offer_id,

    -- Campaign stats
    ec.total_sent,
    ec.total_opened,
    ec.total_clicked,
    ec.total_conversions,
    ec.total_revenue,

    -- Rates
    ec.open_rate,
    ec.click_rate,
    ec.conversion_rate,

    -- Bonus cost (if applicable)
    COALESCE((
        SELECT SUM(pb.bonus_amount)
        FROM player_bonuses pb
        WHERE pb.bonus_offer_id = ec.bonus_offer_id
        AND pb.issued_at BETWEEN ec.sent_at AND ec.sent_at + INTERVAL '30 days'
    ), 0) as bonus_cost,

    -- ROI calculation
    CASE
        WHEN COALESCE((
            SELECT SUM(pb.bonus_amount)
            FROM player_bonuses pb
            WHERE pb.bonus_offer_id = ec.bonus_offer_id
            AND pb.issued_at BETWEEN ec.sent_at AND ec.sent_at + INTERVAL '30 days'
        ), 0) > 0
        THEN (
            ec.total_revenue / NULLIF((
                SELECT SUM(pb.bonus_amount)
                FROM player_bonuses pb
                WHERE pb.bonus_offer_id = ec.bonus_offer_id
                AND pb.issued_at BETWEEN ec.sent_at AND ec.sent_at + INTERVAL '30 days'
            ), 0) * 100
        )
        ELSE NULL
    END as roi_percentage

FROM email_campaigns ec
WHERE ec.status = 'sent'
ORDER BY ec.sent_at DESC;

GRANT SELECT ON marketing_campaign_roi TO service_role;

-- ============================================================================
-- PART 9: Helper Functions for Analytics
-- ============================================================================

-- Function to update game performance metrics
CREATE OR REPLACE FUNCTION update_game_performance_metrics()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    INSERT INTO game_performance_metrics (
        game_id,
        game_name,
        total_rounds,
        unique_players,
        total_wagered,
        total_won,
        avg_bet_amount,
        rounds_last_24h,
        rounds_last_7d,
        rounds_last_30d,
        first_played_at,
        last_played_at
    )
    SELECT
        gr.game_id,
        MAX(gr.game_id) as game_name, -- Placeholder, update with actual game name
        COUNT(*) as total_rounds,
        COUNT(DISTINCT gr.user_id) as unique_players,
        SUM(gr.bet_amount) as total_wagered,
        SUM(gr.win_amount) as total_won,
        AVG(gr.bet_amount) as avg_bet_amount,
        COUNT(*) FILTER (WHERE gr.started_at >= NOW() - INTERVAL '24 hours') as rounds_last_24h,
        COUNT(*) FILTER (WHERE gr.started_at >= NOW() - INTERVAL '7 days') as rounds_last_7d,
        COUNT(*) FILTER (WHERE gr.started_at >= NOW() - INTERVAL '30 days') as rounds_last_30d,
        MIN(gr.started_at) as first_played_at,
        MAX(gr.started_at) as last_played_at
    FROM game_rounds gr
    WHERE gr.status = 'completed'
    GROUP BY gr.game_id
    ON CONFLICT (game_id) DO UPDATE SET
        total_rounds = EXCLUDED.total_rounds,
        unique_players = EXCLUDED.unique_players,
        total_wagered = EXCLUDED.total_wagered,
        total_won = EXCLUDED.total_won,
        avg_bet_amount = EXCLUDED.avg_bet_amount,
        rounds_last_24h = EXCLUDED.rounds_last_24h,
        rounds_last_7d = EXCLUDED.rounds_last_7d,
        rounds_last_30d = EXCLUDED.rounds_last_30d,
        last_played_at = EXCLUDED.last_played_at,
        updated_at = NOW();

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Update popularity flags
    UPDATE game_performance_metrics
    SET
        is_popular = (rounds_last_30d > 1000),
        is_high_revenue = (net_revenue > 10000),
        is_trending = (rounds_last_7d > rounds_last_30d / 4),
        popularity_score = LEAST(100, (rounds_last_30d::DECIMAL / 100 * 0.4) + (unique_players::DECIMAL * 0.6));

    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_game_performance_metrics() TO service_role;

-- Function to refresh all analytics views
CREATE OR REPLACE FUNCTION refresh_all_analytics()
RETURNS TABLE(view_name TEXT, status TEXT) AS $$
BEGIN
    -- Refresh materialized views
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY player_value_metrics;
        RETURN QUERY SELECT 'player_value_metrics'::TEXT, 'success'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'player_value_metrics'::TEXT, ('error: ' || SQLERRM)::TEXT;
    END;

    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY daily_performance_snapshot;
        RETURN QUERY SELECT 'daily_performance_snapshot'::TEXT, 'success'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'daily_performance_snapshot'::TEXT, ('error: ' || SQLERRM)::TEXT;
    END;

    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_analytics;
        RETURN QUERY SELECT 'revenue_analytics'::TEXT, 'success'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'revenue_analytics'::TEXT, ('error: ' || SQLERRM)::TEXT;
    END;

    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY player_cohort_analysis;
        RETURN QUERY SELECT 'player_cohort_analysis'::TEXT, 'success'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'player_cohort_analysis'::TEXT, ('error: ' || SQLERRM)::TEXT;
    END;

    -- Update game metrics
    BEGIN
        PERFORM update_game_performance_metrics();
        RETURN QUERY SELECT 'game_performance_metrics'::TEXT, 'success'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'game_performance_metrics'::TEXT, ('error: ' || SQLERRM)::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_all_analytics() TO service_role;

-- ============================================================================
-- PART 10: Scheduled Refresh Setup
-- ============================================================================

-- Note: Uncomment if pg_cron is available

/*
-- Refresh analytics daily at 3 AM
SELECT cron.schedule(
    'refresh_analytics_daily',
    '0 3 * * *',
    $$SELECT refresh_all_analytics()$$
);

-- Update game metrics every 6 hours
SELECT cron.schedule(
    'update_game_metrics',
    '0 */6 * * *',
    $$SELECT update_game_performance_metrics()$$
);
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE game_performance_metrics IS 'Tracks performance metrics for each game';
COMMENT ON MATERIALIZED VIEW daily_performance_snapshot IS 'Daily snapshot of key platform metrics';
COMMENT ON MATERIALIZED VIEW revenue_analytics IS 'Daily revenue breakdown and GGR calculations';
COMMENT ON MATERIALIZED VIEW player_cohort_analysis IS 'Cohort-based retention and revenue analysis';
COMMENT ON VIEW game_category_performance IS 'Performance metrics grouped by game category';
COMMENT ON VIEW top_games_by_revenue IS 'Top 100 games ranked by revenue';
COMMENT ON VIEW player_lifetime_value IS 'Lifetime value calculation for each player';
COMMENT ON VIEW marketing_campaign_roi IS 'ROI analysis for marketing campaigns';
COMMENT ON FUNCTION update_game_performance_metrics IS 'Updates game performance metrics from game_rounds data';
COMMENT ON FUNCTION refresh_all_analytics IS 'Refreshes all materialized views and analytics';

-- ============================================================================
-- PART 11: Initial Data Population
-- ============================================================================

-- Populate game performance metrics
SELECT update_game_performance_metrics();

-- Initial refresh of materialized views
REFRESH MATERIALIZED VIEW daily_performance_snapshot;
REFRESH MATERIALIZED VIEW revenue_analytics;
REFRESH MATERIALIZED VIEW player_cohort_analysis;

-- Output summary
DO $$
DECLARE
    v_game_count INTEGER;
    v_daily_actives INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_game_count FROM game_performance_metrics;
    SELECT active_players_today INTO v_daily_actives FROM daily_performance_snapshot ORDER BY snapshot_date DESC LIMIT 1;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Advanced Analytics Migration Completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Game performance metrics: % games tracked', v_game_count;
    RAISE NOTICE 'Daily active players: %', COALESCE(v_daily_actives, 0);
    RAISE NOTICE '';
    RAISE NOTICE 'Available analytics views:';
    RAISE NOTICE '  - SELECT * FROM daily_performance_snapshot;';
    RAISE NOTICE '  - SELECT * FROM revenue_analytics;';
    RAISE NOTICE '  - SELECT * FROM player_cohort_analysis;';
    RAISE NOTICE '  - SELECT * FROM game_category_performance;';
    RAISE NOTICE '  - SELECT * FROM top_games_by_revenue;';
    RAISE NOTICE '  - SELECT * FROM player_lifetime_value LIMIT 100;';
    RAISE NOTICE '  - SELECT * FROM marketing_campaign_roi;';
    RAISE NOTICE '';
    RAISE NOTICE 'To refresh all analytics: SELECT * FROM refresh_all_analytics();';
END $$;
