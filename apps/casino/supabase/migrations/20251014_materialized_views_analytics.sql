-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS DASHBOARDS
-- ============================================================================
-- High-performance materialized views for analytics with hourly refresh
-- Expected improvement: 10x faster dashboard loads (5s → 0.5s)

-- ============================================================================
-- PLAYER LIFETIME VALUE MATERIALIZED VIEW
-- ============================================================================
-- Comprehensive player value metrics including deposits, withdrawals, wagering, and profitability
DROP MATERIALIZED VIEW IF EXISTS mv_player_lifetime_value CASCADE;

CREATE MATERIALIZED VIEW mv_player_lifetime_value AS
WITH player_deposits AS (
    SELECT
        user_id,
        COUNT(*) FILTER (WHERE transaction_type = 'deposit') AS total_deposit_count,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'deposit'), 0) AS total_deposited,
        COALESCE(AVG(amount) FILTER (WHERE transaction_type = 'deposit'), 0) AS avg_deposit_amount,
        MAX(amount) FILTER (WHERE transaction_type = 'deposit') AS largest_deposit,
        MIN(created_at) FILTER (WHERE transaction_type = 'deposit') AS first_deposit_date,
        MAX(created_at) FILTER (WHERE transaction_type = 'deposit') AS last_deposit_date
    FROM transactions
    WHERE status = 'completed'
    GROUP BY user_id
),
player_withdrawals AS (
    SELECT
        user_id,
        COUNT(*) FILTER (WHERE transaction_type = 'withdrawal') AS total_withdrawal_count,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'withdrawal'), 0) AS total_withdrawn,
        COALESCE(AVG(amount) FILTER (WHERE transaction_type = 'withdrawal'), 0) AS avg_withdrawal_amount,
        MAX(amount) FILTER (WHERE transaction_type = 'withdrawal') AS largest_withdrawal,
        MIN(created_at) FILTER (WHERE transaction_type = 'withdrawal') AS first_withdrawal_date,
        MAX(created_at) FILTER (WHERE transaction_type = 'withdrawal') AS last_withdrawal_date
    FROM transactions
    WHERE status = 'completed'
    GROUP BY user_id
),
player_wagering AS (
    SELECT
        user_id,
        COUNT(*) AS total_bets_placed,
        COALESCE(SUM(bet_amount), 0) AS total_wagered,
        COALESCE(SUM(win_amount), 0) AS total_won,
        COALESCE(AVG(bet_amount), 0) AS avg_bet_size,
        MAX(bet_amount) AS largest_bet,
        COUNT(DISTINCT game_id) AS unique_games_played,
        COUNT(DISTINCT DATE(started_at)) AS days_active,
        MIN(started_at) AS first_bet_date,
        MAX(started_at) AS last_bet_date
    FROM game_rounds
    WHERE status = 'completed'
    GROUP BY user_id
),
player_bonuses AS (
    SELECT
        user_id,
        COUNT(*) AS total_bonuses_claimed,
        COALESCE(SUM(bonus_amount), 0) AS total_bonus_value,
        COUNT(*) FILTER (WHERE status = 'completed') AS bonuses_completed,
        COUNT(*) FILTER (WHERE status = 'forfeited') AS bonuses_forfeited,
        COALESCE(AVG(wagering_percentage) FILTER (WHERE status = 'completed'), 0) AS avg_completion_percentage
    FROM player_bonuses
    GROUP BY user_id
),
player_loyalty_info AS (
    SELECT
        pl.user_id,
        lt.tier_name AS current_tier,
        lt.tier_level AS current_tier_level,
        pl.total_points_earned,
        pl.available_points,
        pl.lifetime_wagered AS loyalty_lifetime_wagered,
        pl.tier_started_at,
        lt.cashback_rate,
        lt.jackpot_ticket_rate
    FROM player_loyalty pl
    LEFT JOIN loyalty_tiers lt ON pl.current_tier_id = lt.id
),
player_jackpot_info AS (
    SELECT
        jw.user_id,
        COUNT(*) AS total_jackpots_won,
        COALESCE(SUM(jw.prize_amount), 0) AS total_jackpot_winnings,
        MAX(jw.prize_amount) AS largest_jackpot_win,
        MAX(jw.created_at) AS last_jackpot_win_date
    FROM jackpot_winners jw
    GROUP BY jw.user_id
)
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.phone,
    u.created_at AS registration_date,
    u.last_login_at,
    u.status AS user_status,

    -- Balance information
    COALESCE(ub.real_balance, 0) AS current_real_balance,
    COALESCE(ub.bonus_balance, 0) AS current_bonus_balance,

    -- Deposit metrics
    COALESCE(pd.total_deposit_count, 0) AS total_deposit_count,
    COALESCE(pd.total_deposited, 0) AS total_deposited,
    COALESCE(pd.avg_deposit_amount, 0) AS avg_deposit_amount,
    pd.largest_deposit,
    pd.first_deposit_date,
    pd.last_deposit_date,
    CASE
        WHEN pd.last_deposit_date IS NOT NULL
        THEN EXTRACT(EPOCH FROM (NOW() - pd.last_deposit_date))/86400
        ELSE NULL
    END AS days_since_last_deposit,

    -- Withdrawal metrics
    COALESCE(pw.total_withdrawal_count, 0) AS total_withdrawal_count,
    COALESCE(pw.total_withdrawn, 0) AS total_withdrawn,
    COALESCE(pw.avg_withdrawal_amount, 0) AS avg_withdrawal_amount,
    pw.largest_withdrawal,
    pw.first_withdrawal_date,
    pw.last_withdrawal_date,

    -- Net revenue (deposits - withdrawals)
    COALESCE(pd.total_deposited, 0) - COALESCE(pw.total_withdrawn, 0) AS net_revenue,

    -- Wagering metrics
    COALESCE(pwg.total_bets_placed, 0) AS total_bets_placed,
    COALESCE(pwg.total_wagered, 0) AS total_wagered,
    COALESCE(pwg.total_won, 0) AS total_won,
    COALESCE(pwg.total_wagered, 0) - COALESCE(pwg.total_won, 0) AS gross_gaming_revenue,
    COALESCE(pwg.avg_bet_size, 0) AS avg_bet_size,
    pwg.largest_bet,
    COALESCE(pwg.unique_games_played, 0) AS unique_games_played,
    COALESCE(pwg.days_active, 0) AS days_active,
    pwg.first_bet_date,
    pwg.last_bet_date,
    CASE
        WHEN pwg.last_bet_date IS NOT NULL
        THEN EXTRACT(EPOCH FROM (NOW() - pwg.last_bet_date))/86400
        ELSE NULL
    END AS days_since_last_bet,

    -- Bonus metrics
    COALESCE(pb.total_bonuses_claimed, 0) AS total_bonuses_claimed,
    COALESCE(pb.total_bonus_value, 0) AS total_bonus_value,
    COALESCE(pb.bonuses_completed, 0) AS bonuses_completed,
    COALESCE(pb.bonuses_forfeited, 0) AS bonuses_forfeited,
    COALESCE(pb.avg_completion_percentage, 0) AS avg_bonus_completion_percentage,

    -- Loyalty metrics
    pli.current_tier,
    pli.current_tier_level,
    COALESCE(pli.total_points_earned, 0) AS total_loyalty_points_earned,
    COALESCE(pli.available_points, 0) AS available_loyalty_points,
    pli.tier_started_at,
    pli.cashback_rate,

    -- Jackpot metrics
    COALESCE(pji.total_jackpots_won, 0) AS total_jackpots_won,
    COALESCE(pji.total_jackpot_winnings, 0) AS total_jackpot_winnings,
    pji.largest_jackpot_win,
    pji.last_jackpot_win_date,

    -- Calculated metrics
    CASE
        WHEN COALESCE(pwg.total_wagered, 0) > 0
        THEN ROUND((COALESCE(pwg.total_won, 0)::NUMERIC / pwg.total_wagered::NUMERIC) * 100, 2)
        ELSE 0
    END AS player_rtp_percentage,

    CASE
        WHEN COALESCE(pd.total_deposited, 0) > 0
        THEN ROUND((COALESCE(pwg.total_wagered, 0)::NUMERIC / pd.total_deposited::NUMERIC), 2)
        ELSE 0
    END AS wagering_to_deposit_ratio,

    -- Player value classification
    CASE
        WHEN COALESCE(pd.total_deposited, 0) >= 10000 THEN 'WHALE'
        WHEN COALESCE(pd.total_deposited, 0) >= 5000 THEN 'VIP'
        WHEN COALESCE(pd.total_deposited, 0) >= 1000 THEN 'HIGH_VALUE'
        WHEN COALESCE(pd.total_deposited, 0) >= 100 THEN 'REGULAR'
        WHEN COALESCE(pd.total_deposited, 0) > 0 THEN 'LOW_VALUE'
        ELSE 'NON_DEPOSITOR'
    END AS player_value_segment,

    -- Activity status
    CASE
        WHEN pwg.last_bet_date >= NOW() - INTERVAL '7 days' THEN 'ACTIVE'
        WHEN pwg.last_bet_date >= NOW() - INTERVAL '30 days' THEN 'DORMANT'
        WHEN pwg.last_bet_date >= NOW() - INTERVAL '90 days' THEN 'AT_RISK'
        WHEN pwg.last_bet_date IS NOT NULL THEN 'CHURNED'
        ELSE 'NEVER_PLAYED'
    END AS activity_status,

    -- Risk indicators
    CASE
        WHEN (COALESCE(pw.total_withdrawn, 0) > COALESCE(pd.total_deposited, 0) * 2)
             AND COALESCE(pw.total_withdrawn, 0) > 1000 THEN 'HIGH_RISK'
        WHEN COALESCE(pb.bonuses_forfeited, 0) > 5 THEN 'BONUS_ABUSER_RISK'
        ELSE 'LOW_RISK'
    END AS risk_status,

    NOW() AS last_calculated_at

FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN player_deposits pd ON u.id = pd.user_id
LEFT JOIN player_withdrawals pw ON u.id = pw.user_id
LEFT JOIN player_wagering pwg ON u.id = pwg.user_id
LEFT JOIN player_bonuses pb ON u.id = pb.user_id
LEFT JOIN player_loyalty_info pli ON u.id = pli.user_id
LEFT JOIN player_jackpot_info pji ON u.id = pji.user_id;

-- Create indexes for efficient querying
CREATE INDEX idx_mv_player_ltv_user_id ON mv_player_lifetime_value(user_id);
CREATE INDEX idx_mv_player_ltv_value_segment ON mv_player_lifetime_value(player_value_segment);
CREATE INDEX idx_mv_player_ltv_activity_status ON mv_player_lifetime_value(activity_status);
CREATE INDEX idx_mv_player_ltv_current_tier ON mv_player_lifetime_value(current_tier_level);
CREATE INDEX idx_mv_player_ltv_net_revenue ON mv_player_lifetime_value(net_revenue DESC);
CREATE INDEX idx_mv_player_ltv_total_deposited ON mv_player_lifetime_value(total_deposited DESC);
CREATE INDEX idx_mv_player_ltv_last_deposit ON mv_player_lifetime_value(last_deposit_date DESC);
CREATE INDEX idx_mv_player_ltv_risk_status ON mv_player_lifetime_value(risk_status) WHERE risk_status != 'LOW_RISK';

-- ============================================================================
-- GAME PERFORMANCE MATERIALIZED VIEW
-- ============================================================================
-- Game-level metrics for performance analysis and optimization
DROP MATERIALIZED VIEW IF EXISTS mv_game_performance CASCADE;

CREATE MATERIALIZED VIEW mv_game_performance AS
WITH game_rounds_stats AS (
    SELECT
        g.id AS game_id,
        g.game_name,
        g.game_provider,
        g.game_type,
        g.game_sub_type,
        g.rtp,
        g.volatility,
        g.active AS is_active,
        COUNT(DISTINCT gr.user_id) AS unique_players,
        COUNT(gr.id) AS total_rounds_played,
        COALESCE(SUM(gr.bet_amount), 0) AS total_wagered,
        COALESCE(SUM(gr.win_amount), 0) AS total_paid_out,
        COALESCE(AVG(gr.bet_amount), 0) AS avg_bet_size,
        COALESCE(MAX(gr.bet_amount), 0) AS max_bet,
        COALESCE(MIN(gr.bet_amount), 0) AS min_bet,
        COALESCE(MAX(gr.win_amount), 0) AS largest_win,
        COUNT(gr.id) FILTER (WHERE gr.win_amount > 0) AS winning_rounds,
        COUNT(gr.id) FILTER (WHERE gr.win_amount > gr.bet_amount * 10) AS big_wins,
        COUNT(gr.id) FILTER (WHERE gr.win_amount > gr.bet_amount * 50) AS mega_wins,
        MIN(gr.started_at) AS first_played_at,
        MAX(gr.started_at) AS last_played_at
    FROM games g
    LEFT JOIN game_rounds gr ON g.id = gr.game_id AND gr.status = 'completed'
    GROUP BY g.id, g.game_name, g.game_provider, g.game_type, g.game_sub_type, g.rtp, g.volatility, g.active
),
daily_activity AS (
    SELECT
        game_id,
        COUNT(DISTINCT DATE(started_at)) AS days_with_activity,
        COUNT(DISTINCT DATE_TRUNC('week', started_at)) AS weeks_with_activity,
        COUNT(DISTINCT DATE_TRUNC('month', started_at)) AS months_with_activity
    FROM game_rounds
    WHERE status = 'completed'
    GROUP BY game_id
),
recent_performance AS (
    SELECT
        game_id,
        COUNT(DISTINCT user_id) AS unique_players_7d,
        COUNT(*) AS rounds_played_7d,
        COALESCE(SUM(bet_amount), 0) AS wagered_7d,
        COALESCE(SUM(win_amount), 0) AS paid_out_7d,
        COUNT(DISTINCT user_id) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours') AS unique_players_24h,
        COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours') AS rounds_played_24h,
        COALESCE(SUM(bet_amount) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours'), 0) AS wagered_24h
    FROM game_rounds
    WHERE status = 'completed'
        AND started_at >= NOW() - INTERVAL '7 days'
    GROUP BY game_id
),
player_retention AS (
    SELECT
        game_id,
        COUNT(DISTINCT user_id) FILTER (
            WHERE user_id IN (
                SELECT DISTINCT user_id
                FROM game_rounds gr2
                WHERE gr2.game_id = gr.game_id
                    AND gr2.started_at >= NOW() - INTERVAL '30 days'
                    AND gr2.started_at < NOW() - INTERVAL '7 days'
            )
        )::NUMERIC / NULLIF(
            COUNT(DISTINCT user_id) FILTER (
                WHERE started_at < NOW() - INTERVAL '7 days'
            ), 0
        ) * 100 AS retention_rate_7d
    FROM game_rounds gr
    WHERE status = 'completed'
    GROUP BY game_id
)
SELECT
    grs.*,

    -- Calculated performance metrics
    COALESCE(grs.total_wagered - grs.total_paid_out, 0) AS gross_revenue,
    CASE
        WHEN grs.total_wagered > 0
        THEN ROUND(((grs.total_wagered - grs.total_paid_out)::NUMERIC / grs.total_wagered::NUMERIC) * 100, 2)
        ELSE 0
    END AS house_edge_actual,
    CASE
        WHEN grs.total_wagered > 0
        THEN ROUND((grs.total_paid_out::NUMERIC / grs.total_wagered::NUMERIC) * 100, 2)
        ELSE 0
    END AS actual_rtp,
    CASE
        WHEN grs.total_rounds_played > 0
        THEN ROUND((grs.winning_rounds::NUMERIC / grs.total_rounds_played::NUMERIC) * 100, 2)
        ELSE 0
    END AS win_frequency,

    -- Activity metrics
    COALESCE(da.days_with_activity, 0) AS days_with_activity,
    COALESCE(da.weeks_with_activity, 0) AS weeks_with_activity,
    COALESCE(da.months_with_activity, 0) AS months_with_activity,

    -- Recent performance
    COALESCE(rp.unique_players_24h, 0) AS unique_players_24h,
    COALESCE(rp.rounds_played_24h, 0) AS rounds_played_24h,
    COALESCE(rp.wagered_24h, 0) AS wagered_24h,
    COALESCE(rp.unique_players_7d, 0) AS unique_players_7d,
    COALESCE(rp.rounds_played_7d, 0) AS rounds_played_7d,
    COALESCE(rp.wagered_7d, 0) AS wagered_7d,
    COALESCE(rp.paid_out_7d, 0) AS paid_out_7d,

    -- Player retention
    COALESCE(pr.retention_rate_7d, 0) AS retention_rate_7d,

    -- Popularity metrics
    CASE
        WHEN grs.last_played_at >= NOW() - INTERVAL '24 hours' THEN 'TRENDING'
        WHEN grs.last_played_at >= NOW() - INTERVAL '7 days' THEN 'ACTIVE'
        WHEN grs.last_played_at >= NOW() - INTERVAL '30 days' THEN 'DECLINING'
        ELSE 'INACTIVE'
    END AS popularity_status,

    -- Performance classification
    CASE
        WHEN grs.total_wagered >= 100000 AND grs.unique_players >= 100 THEN 'TOP_PERFORMER'
        WHEN grs.total_wagered >= 50000 AND grs.unique_players >= 50 THEN 'HIGH_PERFORMER'
        WHEN grs.total_wagered >= 10000 AND grs.unique_players >= 20 THEN 'MODERATE_PERFORMER'
        WHEN grs.total_wagered > 0 THEN 'LOW_PERFORMER'
        ELSE 'NO_ACTIVITY'
    END AS performance_tier,

    NOW() AS last_calculated_at

FROM game_rounds_stats grs
LEFT JOIN daily_activity da ON grs.game_id = da.game_id
LEFT JOIN recent_performance rp ON grs.game_id = rp.game_id
LEFT JOIN player_retention pr ON grs.game_id = pr.game_id;

-- Create indexes for efficient querying
CREATE INDEX idx_mv_game_perf_game_id ON mv_game_performance(game_id);
CREATE INDEX idx_mv_game_perf_game_type ON mv_game_performance(game_type);
CREATE INDEX idx_mv_game_perf_provider ON mv_game_performance(game_provider);
CREATE INDEX idx_mv_game_perf_popularity ON mv_game_performance(popularity_status);
CREATE INDEX idx_mv_game_perf_performance_tier ON mv_game_performance(performance_tier);
CREATE INDEX idx_mv_game_perf_gross_revenue ON mv_game_performance(gross_revenue DESC);
CREATE INDEX idx_mv_game_perf_total_wagered ON mv_game_performance(total_wagered DESC);
CREATE INDEX idx_mv_game_perf_unique_players ON mv_game_performance(unique_players DESC);
CREATE INDEX idx_mv_game_perf_active ON mv_game_performance(is_active) WHERE is_active = true;

-- ============================================================================
-- CAMPAIGN ROI MATERIALIZED VIEW
-- ============================================================================
-- Marketing campaign performance and return on investment analysis
DROP MATERIALIZED VIEW IF EXISTS mv_campaign_roi CASCADE;

CREATE MATERIALIZED VIEW mv_campaign_roi AS
WITH campaign_sends AS (
    SELECT
        mc.id AS campaign_id,
        mc.name AS campaign_name,
        mc.type AS campaign_type,
        mc.status AS campaign_status,
        mc.scheduled_at,
        mc.executed_at,
        mc.message_template,
        mc.bonus_offer_id,
        bo.bonus_name,
        bo.bonus_type,
        bo.match_percentage,
        bo.max_bonus_amount,
        COUNT(DISTINCT cs.lead_id) AS total_recipients,
        COUNT(cs.id) FILTER (WHERE cs.status = 'sent') AS messages_sent,
        COUNT(cs.id) FILTER (WHERE cs.status = 'delivered') AS messages_delivered,
        COUNT(cs.id) FILTER (WHERE cs.status = 'failed') AS messages_failed,
        MIN(cs.sent_at) AS first_sent_at,
        MAX(cs.sent_at) AS last_sent_at
    FROM marketing_campaigns mc
    LEFT JOIN campaign_sends cs ON mc.id = cs.campaign_id
    LEFT JOIN bonus_offers bo ON mc.bonus_offer_id = bo.id
    GROUP BY mc.id, mc.name, mc.type, mc.status, mc.scheduled_at, mc.executed_at,
             mc.message_template, mc.bonus_offer_id, bo.bonus_name, bo.bonus_type,
             bo.match_percentage, bo.max_bonus_amount
),
lead_conversions AS (
    SELECT
        cs.campaign_id,
        COUNT(DISTINCT ml.id) FILTER (WHERE ml.conversion_date IS NOT NULL) AS leads_converted,
        COUNT(DISTINCT ml.id) FILTER (
            WHERE ml.conversion_date >= cs.sent_at
            AND ml.conversion_date <= cs.sent_at + INTERVAL '7 days'
        ) AS conversions_within_7d,
        COUNT(DISTINCT ml.id) FILTER (
            WHERE ml.conversion_date >= cs.sent_at
            AND ml.conversion_date <= cs.sent_at + INTERVAL '30 days'
        ) AS conversions_within_30d,
        AVG(EXTRACT(EPOCH FROM (ml.conversion_date - cs.sent_at))/3600)::NUMERIC AS avg_hours_to_conversion
    FROM campaign_sends cs
    JOIN marketing_leads ml ON cs.lead_id = ml.id
    WHERE cs.status = 'delivered'
    GROUP BY cs.campaign_id
),
player_activity AS (
    SELECT
        cs.campaign_id,
        COUNT(DISTINCT u.id) AS unique_players_reached,
        COUNT(DISTINCT u.id) FILTER (
            WHERE EXISTS (
                SELECT 1 FROM transactions t
                WHERE t.user_id = u.id
                    AND t.transaction_type = 'deposit'
                    AND t.created_at >= cs.sent_at
                    AND t.created_at <= cs.sent_at + INTERVAL '7 days'
            )
        ) AS players_deposited_7d,
        COALESCE(SUM(
            (SELECT SUM(amount) FROM transactions t
             WHERE t.user_id = u.id
                AND t.transaction_type = 'deposit'
                AND t.created_at >= cs.sent_at
                AND t.created_at <= cs.sent_at + INTERVAL '7 days')
        ), 0) AS total_deposits_7d,
        COALESCE(SUM(
            (SELECT SUM(amount) FROM transactions t
             WHERE t.user_id = u.id
                AND t.transaction_type = 'deposit'
                AND t.created_at >= cs.sent_at
                AND t.created_at <= cs.sent_at + INTERVAL '30 days')
        ), 0) AS total_deposits_30d,
        COALESCE(SUM(
            (SELECT SUM(bet_amount) FROM game_rounds gr
             WHERE gr.user_id = u.id
                AND gr.started_at >= cs.sent_at
                AND gr.started_at <= cs.sent_at + INTERVAL '7 days')
        ), 0) AS total_wagered_7d,
        COALESCE(SUM(
            (SELECT SUM(bet_amount) FROM game_rounds gr
             WHERE gr.user_id = u.id
                AND gr.started_at >= cs.sent_at
                AND gr.started_at <= cs.sent_at + INTERVAL '30 days')
        ), 0) AS total_wagered_30d
    FROM campaign_sends cs
    LEFT JOIN marketing_leads ml ON cs.lead_id = ml.id
    LEFT JOIN users u ON ml.user_id = u.id
    WHERE cs.status = 'delivered'
    GROUP BY cs.campaign_id
),
bonus_redemptions AS (
    SELECT
        mc.id AS campaign_id,
        COUNT(DISTINCT pb.id) AS bonuses_claimed,
        COALESCE(SUM(pb.bonus_amount), 0) AS total_bonus_value_claimed,
        COUNT(DISTINCT pb.id) FILTER (WHERE pb.status = 'completed') AS bonuses_completed,
        COUNT(DISTINCT pb.id) FILTER (WHERE pb.status = 'forfeited') AS bonuses_forfeited,
        COALESCE(AVG(pb.wagering_percentage) FILTER (WHERE pb.status = 'completed'), 0) AS avg_completion_rate
    FROM marketing_campaigns mc
    JOIN player_bonuses pb ON pb.bonus_offer_id = mc.bonus_offer_id
        AND pb.created_at >= mc.executed_at
        AND pb.created_at <= mc.executed_at + INTERVAL '30 days'
    GROUP BY mc.id
)
SELECT
    cs.*,

    -- Conversion metrics
    COALESCE(lc.leads_converted, 0) AS leads_converted,
    COALESCE(lc.conversions_within_7d, 0) AS conversions_within_7d,
    COALESCE(lc.conversions_within_30d, 0) AS conversions_within_30d,
    ROUND(COALESCE(lc.avg_hours_to_conversion, 0), 2) AS avg_hours_to_conversion,

    -- Player activity metrics
    COALESCE(pa.unique_players_reached, 0) AS unique_players_reached,
    COALESCE(pa.players_deposited_7d, 0) AS players_deposited_7d,
    COALESCE(pa.total_deposits_7d, 0) AS total_deposits_7d,
    COALESCE(pa.total_deposits_30d, 0) AS total_deposits_30d,
    COALESCE(pa.total_wagered_7d, 0) AS total_wagered_7d,
    COALESCE(pa.total_wagered_30d, 0) AS total_wagered_30d,

    -- Bonus redemption metrics
    COALESCE(br.bonuses_claimed, 0) AS bonuses_claimed,
    COALESCE(br.total_bonus_value_claimed, 0) AS total_bonus_value_claimed,
    COALESCE(br.bonuses_completed, 0) AS bonuses_completed,
    COALESCE(br.bonuses_forfeited, 0) AS bonuses_forfeited,
    ROUND(COALESCE(br.avg_completion_rate, 0), 2) AS avg_bonus_completion_rate,

    -- Calculated ROI metrics
    CASE
        WHEN cs.messages_sent > 0
        THEN ROUND((COALESCE(lc.conversions_within_7d, 0)::NUMERIC / cs.messages_sent::NUMERIC) * 100, 2)
        ELSE 0
    END AS conversion_rate_7d,

    CASE
        WHEN cs.messages_sent > 0
        THEN ROUND((COALESCE(pa.players_deposited_7d, 0)::NUMERIC / cs.messages_sent::NUMERIC) * 100, 2)
        ELSE 0
    END AS deposit_rate_7d,

    -- Assuming $0.10 per SMS cost
    cs.messages_sent * 0.10 AS estimated_campaign_cost,

    COALESCE(pa.total_deposits_7d, 0) - COALESCE(br.total_bonus_value_claimed, 0) AS net_deposits_7d,

    CASE
        WHEN cs.messages_sent > 0
        THEN ROUND(((COALESCE(pa.total_deposits_7d, 0) - COALESCE(br.total_bonus_value_claimed, 0) - (cs.messages_sent * 0.10))::NUMERIC / NULLIF(cs.messages_sent * 0.10, 0)) * 100, 2)
        ELSE 0
    END AS roi_percentage_7d,

    CASE
        WHEN cs.messages_sent > 0
        THEN ROUND(((COALESCE(pa.total_deposits_30d, 0) - COALESCE(br.total_bonus_value_claimed, 0) - (cs.messages_sent * 0.10))::NUMERIC / NULLIF(cs.messages_sent * 0.10, 0)) * 100, 2)
        ELSE 0
    END AS roi_percentage_30d,

    -- Campaign effectiveness rating
    CASE
        WHEN COALESCE(lc.conversions_within_7d, 0)::NUMERIC / NULLIF(cs.messages_sent, 0) > 0.1
            AND ((COALESCE(pa.total_deposits_7d, 0) - COALESCE(br.total_bonus_value_claimed, 0) - (cs.messages_sent * 0.10))::NUMERIC / NULLIF(cs.messages_sent * 0.10, 0)) > 2
            THEN 'EXCELLENT'
        WHEN COALESCE(lc.conversions_within_7d, 0)::NUMERIC / NULLIF(cs.messages_sent, 0) > 0.05
            AND ((COALESCE(pa.total_deposits_7d, 0) - COALESCE(br.total_bonus_value_claimed, 0) - (cs.messages_sent * 0.10))::NUMERIC / NULLIF(cs.messages_sent * 0.10, 0)) > 1
            THEN 'GOOD'
        WHEN COALESCE(lc.conversions_within_7d, 0)::NUMERIC / NULLIF(cs.messages_sent, 0) > 0.02
            THEN 'MODERATE'
        WHEN cs.messages_sent > 0
            THEN 'POOR'
        ELSE 'NO_DATA'
    END AS effectiveness_rating,

    NOW() AS last_calculated_at

FROM campaign_sends cs
LEFT JOIN lead_conversions lc ON cs.campaign_id = lc.campaign_id
LEFT JOIN player_activity pa ON cs.campaign_id = pa.campaign_id
LEFT JOIN bonus_redemptions br ON cs.campaign_id = br.campaign_id;

-- Create indexes for efficient querying
CREATE INDEX idx_mv_campaign_roi_campaign_id ON mv_campaign_roi(campaign_id);
CREATE INDEX idx_mv_campaign_roi_campaign_type ON mv_campaign_roi(campaign_type);
CREATE INDEX idx_mv_campaign_roi_campaign_status ON mv_campaign_roi(campaign_status);
CREATE INDEX idx_mv_campaign_roi_effectiveness ON mv_campaign_roi(effectiveness_rating);
CREATE INDEX idx_mv_campaign_roi_roi_7d ON mv_campaign_roi(roi_percentage_7d DESC);
CREATE INDEX idx_mv_campaign_roi_conversion_rate ON mv_campaign_roi(conversion_rate_7d DESC);
CREATE INDEX idx_mv_campaign_roi_executed_at ON mv_campaign_roi(executed_at DESC);

-- ============================================================================
-- REFRESH FUNCTIONS
-- ============================================================================
-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS void AS $$
BEGIN
    -- Refresh with CONCURRENTLY to avoid locking reads
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_player_lifetime_value;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_game_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_roi;

    -- Log the refresh
    INSERT INTO monitoring.health_check_history (check_name, status, severity, details)
    VALUES (
        'Materialized Views Refresh',
        'COMPLETED',
        'LOW',
        jsonb_build_object(
            'views_refreshed', ARRAY['mv_player_lifetime_value', 'mv_game_performance', 'mv_campaign_roi'],
            'refreshed_at', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEDULED REFRESH (using pg_cron or external scheduler)
-- ============================================================================
-- To schedule hourly refresh with pg_cron (if available):
-- SELECT cron.schedule('refresh-analytics-views', '0 * * * *', 'SELECT refresh_analytics_materialized_views();');

-- For external scheduling, call this function every hour:
-- SELECT refresh_analytics_materialized_views();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant read access to materialized views for authenticated users
GRANT SELECT ON mv_player_lifetime_value TO authenticated;
GRANT SELECT ON mv_game_performance TO authenticated;
GRANT SELECT ON mv_campaign_roi TO authenticated;

-- Grant execute permission on refresh function to service role only
GRANT EXECUTE ON FUNCTION refresh_analytics_materialized_views() TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON MATERIALIZED VIEW mv_player_lifetime_value IS 'Comprehensive player value metrics including deposits, withdrawals, wagering, and profitability. Refreshed hourly.';
COMMENT ON MATERIALIZED VIEW mv_game_performance IS 'Game-level performance metrics including revenue, player counts, and retention rates. Refreshed hourly.';
COMMENT ON MATERIALIZED VIEW mv_campaign_roi IS 'Marketing campaign ROI analysis with conversion rates and revenue attribution. Refreshed hourly.';
COMMENT ON FUNCTION refresh_analytics_materialized_views() IS 'Refreshes all analytics materialized views. Schedule to run hourly via pg_cron or external scheduler.';