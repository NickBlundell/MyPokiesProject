-- AI-Powered Player Engagement System
-- Database migration for behavioral analytics, AI outreach, and scheduled messaging

-- ============================================================================
-- PART 1: PLAYER BEHAVIORAL ANALYTICS
-- ============================================================================

-- Player behavioral analytics table
CREATE TABLE IF NOT EXISTS player_behavioral_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,

    -- Deposit averages (from last 10 active weeks only)
    avg_deposit_per_active_week DECIMAL(10, 2),
    avg_deposit_per_transaction DECIMAL(10, 2),
    active_weeks_in_lookback INTEGER DEFAULT 0,
    lookback_window_weeks INTEGER DEFAULT 14,
    total_deposits_analyzed INTEGER DEFAULT 0,
    stddev_deposit_amount DECIMAL(10, 2),

    -- Deposit pattern detection
    has_established_pattern BOOLEAN DEFAULT false,
    most_frequent_deposit_day VARCHAR(20),        -- Monday, Tuesday, etc.
    most_frequent_deposit_hour INTEGER,           -- 0-23
    deposit_frequency_days DECIMAL(5, 2),         -- Avg days between deposits
    last_expected_deposit_time TIMESTAMPTZ,       -- Calculated next deposit time
    optimal_contact_hours JSONB DEFAULT '{}',     -- Best times to reach player

    -- Activity tracking
    consistent_play_weeks INTEGER DEFAULT 0,      -- Consecutive weeks with activity
    last_activity_date TIMESTAMPTZ,
    days_since_last_activity INTEGER DEFAULT 0,
    activity_pattern_type VARCHAR(50),            -- regular_weekly, sporadic, daily, etc.

    -- Engagement metrics
    total_lifetime_deposits DECIMAL(10, 2) DEFAULT 0,
    total_lifetime_wagers DECIMAL(10, 2) DEFAULT 0,
    last_30_day_deposits DECIMAL(10, 2) DEFAULT 0,
    last_30_day_wagers DECIMAL(10, 2) DEFAULT 0,

    -- Calculation metadata
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_period_start DATE,
    calculation_period_end DATE,
    min_active_weeks_required INTEGER DEFAULT 3,
    data_quality_score DECIMAL(3, 2) DEFAULT 0,   -- 0-1 score of data reliability

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(player_id)
);

-- Indexes for performance
CREATE INDEX idx_player_behavior_player ON player_behavioral_analytics(player_id);
CREATE INDEX idx_player_behavior_pattern ON player_behavioral_analytics(has_established_pattern);
CREATE INDEX idx_player_behavior_expected_deposit ON player_behavioral_analytics(last_expected_deposit_time);
CREATE INDEX idx_player_behavior_last_activity ON player_behavioral_analytics(last_activity_date);
CREATE INDEX idx_player_behavior_consistent_play ON player_behavioral_analytics(consistent_play_weeks);

-- ============================================================================
-- PART 2: SCHEDULED OUTREACH MESSAGES
-- ============================================================================

-- Scheduled outreach messages table
CREATE TABLE IF NOT EXISTS scheduled_outreach_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,

    -- Message details
    message_type VARCHAR(50) NOT NULL,            -- missed_pattern, dropout, jackpot_proximity, loss_recovery, reactivation
    trigger_reason TEXT NOT NULL,                  -- Detailed explanation of why generated
    ai_generated_message TEXT NOT NULL,            -- Claude-generated content
    context_snapshot JSONB DEFAULT '{}',           -- Player data at generation time

    -- Scheduling
    scheduled_send_time TIMESTAMPTZ NOT NULL,      -- Optimal send time
    send_window_start TIME DEFAULT '09:00',        -- Earliest send time
    send_window_end TIME DEFAULT '21:00',          -- Latest send time

    -- Approval workflow
    status VARCHAR(50) DEFAULT 'proposed',         -- proposed, approved, rejected, scheduled, sent, failed, cancelled
    approval_status VARCHAR(50) DEFAULT 'pending_review', -- pending_review, approved, rejected
    approved_by UUID REFERENCES admin_users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Message editing
    edited_message TEXT,                           -- If admin edited before sending
    edit_notes TEXT,                               -- Why it was edited
    edited_at TIMESTAMPTZ,

    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    delivery_status VARCHAR(50),                   -- sent, delivered, failed, bounced
    delivery_error TEXT,
    conversation_id UUID,                          -- FK to sms_conversations

    -- Performance tracking
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    conversion_value DECIMAL(10, 2),

    -- Cost tracking
    sms_cost DECIMAL(10, 4),
    ai_generation_cost DECIMAL(10, 6),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_outreach_player ON scheduled_outreach_messages(player_id);
CREATE INDEX idx_outreach_status ON scheduled_outreach_messages(status);
CREATE INDEX idx_outreach_approval_status ON scheduled_outreach_messages(approval_status);
CREATE INDEX idx_outreach_scheduled_time ON scheduled_outreach_messages(scheduled_send_time);
CREATE INDEX idx_outreach_message_type ON scheduled_outreach_messages(message_type);
CREATE INDEX idx_outreach_created ON scheduled_outreach_messages(created_at DESC);

-- ============================================================================
-- PART 3: MESSAGE GENERATION CONTEXT
-- ============================================================================

-- Message generation context table
CREATE TABLE IF NOT EXISTS message_generation_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outreach_message_id UUID REFERENCES scheduled_outreach_messages(id) ON DELETE CASCADE,

    -- Player snapshot at generation time
    player_snapshot JSONB DEFAULT '{}',           -- Name, tier, balance, etc.
    behavioral_triggers JSONB DEFAULT '{}',       -- What caused generation
    offer_details JSONB DEFAULT '{}',             -- Bonus amounts, promo codes
    historical_context JSONB DEFAULT '{}',        -- Deposit history, patterns
    jackpot_context JSONB DEFAULT '{}',           -- Current jackpot values
    conversation_history JSONB DEFAULT '{}',      -- Recent SMS exchanges

    -- AI generation details
    ai_model VARCHAR(50),
    ai_prompt TEXT,
    ai_temperature DECIMAL(2, 1),
    ai_max_tokens INTEGER,
    generation_time_ms INTEGER,
    tokens_used INTEGER,

    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gen_context_message ON message_generation_context(outreach_message_id);
CREATE INDEX idx_gen_context_generated ON message_generation_context(generated_at DESC);

-- ============================================================================
-- PART 4: SCHEMA UPDATES TO EXISTING TABLES
-- ============================================================================

-- Add columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS optimal_contact_hours JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_behavioral_analysis TIMESTAMPTZ;

-- Add columns to sms_conversations table (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_conversations') THEN
        ALTER TABLE sms_conversations
        ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS scheduled_send_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS outreach_message_id UUID REFERENCES scheduled_outreach_messages(id);
    END IF;
END $$;

-- ============================================================================
-- PART 5: CALCULATION FUNCTIONS
-- ============================================================================

-- Function to calculate average deposit from last 10 active weeks
CREATE OR REPLACE FUNCTION calculate_player_avg_deposit(p_player_id UUID)
RETURNS TABLE (
    avg_weekly DECIMAL(10,2),
    avg_per_transaction DECIMAL(10,2),
    active_weeks_found INTEGER,
    stddev_amount DECIMAL(10,2),
    total_analyzed INTEGER,
    lookback_start DATE,
    lookback_end DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_deposits AS (
        SELECT
            DATE_TRUNC('week', created_at)::DATE as week_start,
            SUM(amount) as week_total,
            COUNT(*) as deposit_count
        FROM transactions
        WHERE user_id = p_player_id
        AND type = 'credit'
        AND subtype = 'deposit'
        AND created_at >= NOW() - INTERVAL '20 weeks'  -- Look back window
        GROUP BY DATE_TRUNC('week', created_at)
        HAVING SUM(amount) > 0  -- Only weeks with actual deposits (active weeks)
        ORDER BY DATE_TRUNC('week', created_at) DESC
        LIMIT 10  -- Take 10 most recent active weeks
    ),
    transaction_stats AS (
        SELECT
            AVG(amount) as avg_transaction,
            COUNT(*) as total_count,
            MIN(created_at)::DATE as earliest_date,
            MAX(created_at)::DATE as latest_date
        FROM transactions
        WHERE user_id = p_player_id
        AND type = 'credit'
        AND subtype = 'deposit'
        AND created_at >= (SELECT MIN(week_start) FROM weekly_deposits)
    )
    SELECT
        ROUND(AVG(wd.week_total), 2) as avg_weekly,
        ROUND((SELECT ts.avg_transaction FROM transaction_stats ts), 2) as avg_per_transaction,
        COUNT(wd.*)::INTEGER as active_weeks_found,
        ROUND(STDDEV(wd.week_total), 2) as stddev_amount,
        (SELECT ts.total_count::INTEGER FROM transaction_stats ts) as total_analyzed,
        (SELECT ts.earliest_date FROM transaction_stats ts) as lookback_start,
        (SELECT ts.latest_date FROM transaction_stats ts) as lookback_end
    FROM weekly_deposits wd
    CROSS JOIN transaction_stats ts;
END;
$$ LANGUAGE plpgsql;

-- Function to detect deposit pattern (day of week and hour)
CREATE OR REPLACE FUNCTION detect_deposit_pattern(p_player_id UUID)
RETURNS TABLE (
    has_pattern BOOLEAN,
    most_common_day VARCHAR,
    most_common_hour INTEGER,
    pattern_frequency INTEGER,
    next_expected_time TIMESTAMPTZ,
    avg_days_between_deposits DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_deposits AS (
        SELECT
            created_at,
            EXTRACT(DOW FROM created_at)::INTEGER as day_of_week,
            EXTRACT(HOUR FROM created_at)::INTEGER as hour_of_day,
            TO_CHAR(created_at, 'Day') as day_name,
            LAG(created_at) OVER (ORDER BY created_at) as prev_deposit_time
        FROM transactions
        WHERE user_id = p_player_id
        AND type = 'credit'
        AND subtype = 'deposit'
        AND created_at >= NOW() - INTERVAL '12 weeks'
        ORDER BY created_at DESC
        LIMIT 15  -- Analyze last 15 deposits
    ),
    day_frequency AS (
        SELECT
            day_name,
            day_of_week,
            COUNT(*) as occurrences
        FROM recent_deposits
        GROUP BY day_name, day_of_week
        ORDER BY occurrences DESC
        LIMIT 1
    ),
    hour_frequency AS (
        SELECT
            hour_of_day,
            COUNT(*) as occurrences
        FROM recent_deposits
        WHERE day_of_week = (SELECT day_of_week FROM day_frequency)
        GROUP BY hour_of_day
        ORDER BY occurrences DESC
        LIMIT 1
    ),
    pattern_stats AS (
        SELECT
            (SELECT occurrences FROM day_frequency) >= 3 as has_pattern_bool,
            (SELECT TRIM(day_name) FROM day_frequency) as common_day,
            (SELECT hour_of_day FROM hour_frequency) as common_hour,
            (SELECT occurrences FROM day_frequency) as frequency,
            AVG(EXTRACT(EPOCH FROM (created_at - prev_deposit_time))/86400.0)::DECIMAL(5,2) as avg_days_between
        FROM recent_deposits
        WHERE prev_deposit_time IS NOT NULL
    )
    SELECT
        ps.has_pattern_bool,
        ps.common_day,
        ps.common_hour,
        ps.frequency::INTEGER,
        -- Calculate next expected time
        CASE
            WHEN ps.has_pattern_bool THEN
                -- Find next occurrence of the common day/hour
                (NOW() + ((df.day_of_week - EXTRACT(DOW FROM NOW())::INTEGER + 7) % 7 || ' days')::INTERVAL)::DATE
                + (ps.common_hour || ' hours')::INTERVAL
            ELSE NULL
        END as next_expected,
        ps.avg_days_between
    FROM pattern_stats ps
    CROSS JOIN day_frequency df;
END;
$$ LANGUAGE plpgsql;

-- Function to get optimal send time based on player patterns
CREATE OR REPLACE FUNCTION get_optimal_send_time(
    p_player_id UUID,
    p_base_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_optimal_hour INTEGER;
    v_next_send_time TIMESTAMPTZ;
    v_send_date DATE;
BEGIN
    -- Get player's most common deposit hour
    SELECT most_common_hour INTO v_optimal_hour
    FROM detect_deposit_pattern(p_player_id);

    -- If no pattern, use default time (2 PM)
    IF v_optimal_hour IS NULL THEN
        v_optimal_hour := 14;
    END IF;

    -- Ensure within quiet hours (9 AM - 9 PM)
    IF v_optimal_hour < 9 THEN
        v_optimal_hour := 9;
    ELSIF v_optimal_hour > 21 THEN
        v_optimal_hour := 14;  -- Default to afternoon
    END IF;

    -- Calculate next send time
    v_send_date := p_base_time::DATE;
    v_next_send_time := v_send_date + (v_optimal_hour || ' hours')::INTERVAL;

    -- If the calculated time is in the past, move to next day
    IF v_next_send_time < p_base_time THEN
        v_next_send_time := v_next_send_time + INTERVAL '1 day';
    END IF;

    RETURN v_next_send_time;
END;
$$ LANGUAGE plpgsql;

-- Function to update player behavioral analytics
CREATE OR REPLACE FUNCTION update_player_behavioral_analytics(p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_avg_stats RECORD;
    v_pattern_stats RECORD;
    v_last_activity TIMESTAMPTZ;
    v_days_inactive INTEGER;
    v_consistent_weeks INTEGER;
BEGIN
    -- Calculate deposit averages
    SELECT * INTO v_avg_stats
    FROM calculate_player_avg_deposit(p_player_id);

    -- Detect deposit pattern
    SELECT * INTO v_pattern_stats
    FROM detect_deposit_pattern(p_player_id);

    -- Get last activity
    SELECT MAX(created_at) INTO v_last_activity
    FROM transactions
    WHERE user_id = p_player_id
    AND (
        (type = 'credit' AND subtype = 'deposit') OR
        (type = 'debit' AND subtype = 'wager')
    );

    -- Calculate days inactive
    v_days_inactive := EXTRACT(DAY FROM NOW() - COALESCE(v_last_activity, NOW()))::INTEGER;

    -- Calculate consistent play weeks (weeks with at least 1 deposit in last 12 weeks)
    SELECT COUNT(DISTINCT DATE_TRUNC('week', created_at)) INTO v_consistent_weeks
    FROM transactions
    WHERE user_id = p_player_id
    AND type = 'credit'
    AND subtype = 'deposit'
    AND created_at >= NOW() - INTERVAL '12 weeks';

    -- Insert or update analytics record
    INSERT INTO player_behavioral_analytics (
        player_id,
        avg_deposit_per_active_week,
        avg_deposit_per_transaction,
        active_weeks_in_lookback,
        stddev_deposit_amount,
        total_deposits_analyzed,
        calculation_period_start,
        calculation_period_end,
        has_established_pattern,
        most_frequent_deposit_day,
        most_frequent_deposit_hour,
        deposit_frequency_days,
        last_expected_deposit_time,
        last_activity_date,
        days_since_last_activity,
        consistent_play_weeks,
        activity_pattern_type,
        last_calculated_at,
        data_quality_score
    ) VALUES (
        p_player_id,
        v_avg_stats.avg_weekly,
        v_avg_stats.avg_per_transaction,
        v_avg_stats.active_weeks_found,
        v_avg_stats.stddev_amount,
        v_avg_stats.total_analyzed,
        v_avg_stats.lookback_start,
        v_avg_stats.lookback_end,
        v_pattern_stats.has_pattern,
        v_pattern_stats.most_common_day,
        v_pattern_stats.most_common_hour,
        v_pattern_stats.avg_days_between_deposits,
        v_pattern_stats.next_expected_time,
        v_last_activity,
        v_days_inactive,
        v_consistent_weeks,
        CASE
            WHEN v_pattern_stats.has_pattern THEN 'regular_weekly'
            WHEN v_consistent_weeks >= 8 THEN 'consistent'
            WHEN v_consistent_weeks >= 4 THEN 'sporadic'
            ELSE 'new_or_inactive'
        END,
        NOW(),
        CASE
            WHEN v_avg_stats.active_weeks_found >= 8 THEN 1.0
            WHEN v_avg_stats.active_weeks_found >= 5 THEN 0.7
            WHEN v_avg_stats.active_weeks_found >= 3 THEN 0.5
            ELSE 0.3
        END
    )
    ON CONFLICT (player_id)
    DO UPDATE SET
        avg_deposit_per_active_week = EXCLUDED.avg_deposit_per_active_week,
        avg_deposit_per_transaction = EXCLUDED.avg_deposit_per_transaction,
        active_weeks_in_lookback = EXCLUDED.active_weeks_in_lookback,
        stddev_deposit_amount = EXCLUDED.stddev_deposit_amount,
        total_deposits_analyzed = EXCLUDED.total_deposits_analyzed,
        calculation_period_start = EXCLUDED.calculation_period_start,
        calculation_period_end = EXCLUDED.calculation_period_end,
        has_established_pattern = EXCLUDED.has_established_pattern,
        most_frequent_deposit_day = EXCLUDED.most_frequent_deposit_day,
        most_frequent_deposit_hour = EXCLUDED.most_frequent_deposit_hour,
        deposit_frequency_days = EXCLUDED.deposit_frequency_days,
        last_expected_deposit_time = EXCLUDED.last_expected_deposit_time,
        last_activity_date = EXCLUDED.last_activity_date,
        days_since_last_activity = EXCLUDED.days_since_last_activity,
        consistent_play_weeks = EXCLUDED.consistent_play_weeks,
        activity_pattern_type = EXCLUDED.activity_pattern_type,
        last_calculated_at = EXCLUDED.last_calculated_at,
        data_quality_score = EXCLUDED.data_quality_score,
        updated_at = NOW();

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating behavioral analytics for player %: %', p_player_id, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE player_behavioral_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_generation_context ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin users can manage behavioral analytics"
    ON player_behavioral_analytics FOR ALL USING (true);

CREATE POLICY "Admin users can manage outreach messages"
    ON scheduled_outreach_messages FOR ALL USING (true);

CREATE POLICY "Admin users can view generation context"
    ON message_generation_context FOR ALL USING (true);

-- ============================================================================
-- PART 7: HELPER VIEWS
-- ============================================================================

-- View for players with missed deposit patterns
CREATE OR REPLACE VIEW players_with_missed_patterns AS
SELECT
    u.id as player_id,
    u.email,
    u.external_user_id,
    pba.most_frequent_deposit_day,
    pba.most_frequent_deposit_hour,
    pba.last_expected_deposit_time,
    pba.last_activity_date,
    pba.avg_deposit_per_active_week,
    EXTRACT(EPOCH FROM (NOW() - pba.last_expected_deposit_time))/3600 as hours_since_expected
FROM users u
JOIN player_behavioral_analytics pba ON u.id = pba.player_id
WHERE pba.has_established_pattern = true
AND pba.last_expected_deposit_time IS NOT NULL
AND pba.last_expected_deposit_time < NOW() - INTERVAL '24 hours'
AND pba.last_activity_date < pba.last_expected_deposit_time
AND NOT EXISTS (
    SELECT 1 FROM scheduled_outreach_messages som
    WHERE som.player_id = u.id
    AND som.message_type = 'missed_pattern'
    AND som.created_at > NOW() - INTERVAL '7 days'
    AND som.status NOT IN ('rejected', 'failed', 'cancelled')
);

-- View for engaged players who dropped off
CREATE OR REPLACE VIEW players_engaged_dropout AS
SELECT
    u.id as player_id,
    u.email,
    u.external_user_id,
    pba.consistent_play_weeks,
    pba.days_since_last_activity,
    pba.last_activity_date,
    pba.avg_deposit_per_active_week,
    pba.activity_pattern_type
FROM users u
JOIN player_behavioral_analytics pba ON u.id = pba.player_id
WHERE pba.consistent_play_weeks >= 3
AND pba.days_since_last_activity >= 7
AND pba.data_quality_score >= 0.5
AND NOT EXISTS (
    SELECT 1 FROM scheduled_outreach_messages som
    WHERE som.player_id = u.id
    AND som.message_type = 'engaged_player_dropout'
    AND som.created_at > NOW() - INTERVAL '7 days'
    AND som.status NOT IN ('rejected', 'failed', 'cancelled')
);

-- ============================================================================
-- PART 8: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE player_behavioral_analytics IS 'Stores calculated behavioral patterns and deposit analytics for players';
COMMENT ON TABLE scheduled_outreach_messages IS 'Queue of AI-generated outreach messages awaiting approval and sending';
COMMENT ON TABLE message_generation_context IS 'Stores context used for AI message generation for audit and analysis';

COMMENT ON COLUMN player_behavioral_analytics.avg_deposit_per_active_week IS 'Average deposit amount calculated from last 10 active weeks only (weeks with deposits)';
COMMENT ON COLUMN player_behavioral_analytics.has_established_pattern IS 'True if player has deposited at same day/time at least 3 times';
COMMENT ON COLUMN player_behavioral_analytics.last_expected_deposit_time IS 'Calculated time when next deposit is expected based on historical pattern';
COMMENT ON COLUMN player_behavioral_analytics.data_quality_score IS 'Reliability score (0-1) based on amount of historical data available';

COMMENT ON COLUMN scheduled_outreach_messages.approval_status IS 'Workflow status: pending_review, approved, rejected';
COMMENT ON COLUMN scheduled_outreach_messages.scheduled_send_time IS 'Optimal time to send based on player behavior patterns';
COMMENT ON COLUMN scheduled_outreach_messages.context_snapshot IS 'JSON snapshot of player state at message generation time';

-- ============================================================================
-- PART 9: TRIGGER DETECTION FUNCTIONS
-- ============================================================================

-- Function to get players near jackpot ticket threshold
CREATE OR REPLACE FUNCTION get_players_near_jackpot_threshold(threshold_percentage DECIMAL DEFAULT 0.85)
RETURNS TABLE (
    player_id UUID,
    external_user_id VARCHAR,
    email VARCHAR,
    current_tier_id UUID,
    tier_name VARCHAR,
    tickets_this_draw INTEGER,
    wager_since_last_ticket DECIMAL(10,2),
    amount_needed DECIMAL(10,2),
    progress_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH player_wagers AS (
        SELECT
            t.user_id,
            SUM(CASE WHEN t.type = 'debit' AND t.subtype = 'wager' THEN t.amount ELSE 0 END) as total_wagered,
            MAX(t.created_at) as last_wager
        FROM transactions t
        WHERE t.created_at >= (
            SELECT MAX(draw_date)
            FROM jackpot_draws
        )
        GROUP BY t.user_id
    ),
    player_tickets AS (
        SELECT
            jt.player_id,
            COUNT(*) as ticket_count
        FROM jackpot_tickets jt
        WHERE jt.draw_id = (SELECT id FROM jackpot_draws ORDER BY draw_date DESC LIMIT 1)
        GROUP BY jt.player_id
    ),
    player_tiers AS (
        SELECT
            pl.player_id,
            pl.current_tier_id,
            lt.tier_name,
            lt.jackpot_ticket_rate
        FROM player_loyalty pl
        JOIN loyalty_tiers lt ON pl.current_tier_id = lt.id
    )
    SELECT
        u.id as player_id,
        u.external_user_id,
        u.email,
        pt.current_tier_id,
        pt.tier_name,
        COALESCE(pti.ticket_count, 0)::INTEGER as tickets_this_draw,
        COALESCE(pw.total_wagered, 0) - (COALESCE(pti.ticket_count, 0) * pt.jackpot_ticket_rate) as wager_since_last_ticket,
        pt.jackpot_ticket_rate - (COALESCE(pw.total_wagered, 0) - (COALESCE(pti.ticket_count, 0) * pt.jackpot_ticket_rate)) as amount_needed,
        ((COALESCE(pw.total_wagered, 0) - (COALESCE(pti.ticket_count, 0) * pt.jackpot_ticket_rate)) / pt.jackpot_ticket_rate * 100)::DECIMAL(5,2) as progress_percentage
    FROM users u
    JOIN player_tiers pt ON u.id = pt.player_id
    LEFT JOIN player_wagers pw ON u.id = pw.user_id
    LEFT JOIN player_tickets pti ON u.id = pti.player_id
    WHERE pw.total_wagered IS NOT NULL
    AND pw.last_wager > NOW() - INTERVAL '7 days'  -- Active in last week
    AND ((COALESCE(pw.total_wagered, 0) - (COALESCE(pti.ticket_count, 0) * pt.jackpot_ticket_rate)) / pt.jackpot_ticket_rate) >= threshold_percentage
    AND ((COALESCE(pw.total_wagered, 0) - (COALESCE(pti.ticket_count, 0) * pt.jackpot_ticket_rate)) / pt.jackpot_ticket_rate) < 1.0;
END;
$$ LANGUAGE plpgsql;

-- Function to get players with significant losses
CREATE OR REPLACE FUNCTION get_players_with_significant_losses(
    days_back INTEGER DEFAULT 3,
    min_loss_amount DECIMAL DEFAULT 500
)
RETURNS TABLE (
    player_id UUID,
    external_user_id VARCHAR,
    email VARCHAR,
    net_amount DECIMAL(10,2),
    total_deposits DECIMAL(10,2),
    total_wagers DECIMAL(10,2),
    total_wins DECIMAL(10,2),
    transaction_count INTEGER,
    days_back INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH player_activity AS (
        SELECT
            t.user_id,
            SUM(CASE WHEN t.type = 'credit' AND t.subtype = 'deposit' THEN t.amount ELSE 0 END) as deposits,
            SUM(CASE WHEN t.type = 'debit' AND t.subtype = 'wager' THEN t.amount ELSE 0 END) as wagers,
            SUM(CASE WHEN t.type = 'credit' AND t.subtype = 'win' THEN t.amount ELSE 0 END) as wins,
            COUNT(*) as txn_count
        FROM transactions t
        WHERE t.created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY t.user_id
    )
    SELECT
        u.id,
        u.external_user_id,
        u.email,
        (pa.deposits + pa.wins - pa.wagers)::DECIMAL(10,2) as net_amount,
        pa.deposits::DECIMAL(10,2),
        pa.wagers::DECIMAL(10,2),
        pa.wins::DECIMAL(10,2),
        pa.txn_count::INTEGER,
        days_back
    FROM users u
    JOIN player_activity pa ON u.id = pa.user_id
    WHERE (pa.deposits + pa.wins - pa.wagers) <= -min_loss_amount
    AND pa.deposits > 0  -- Must have deposited in this period
    ORDER BY (pa.deposits + pa.wins - pa.wagers) ASC;
END;
$$ LANGUAGE plpgsql;
