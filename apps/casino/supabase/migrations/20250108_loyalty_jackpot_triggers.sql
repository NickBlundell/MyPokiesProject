-- Auto-award loyalty points and jackpot tickets on transactions
-- Triggers for automatic point/ticket generation

-- ============================================================================
-- LOYALTY POINTS AUTO-AWARD TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER;
    v_loyalty_record RECORD;
    v_new_tier_id UUID;
BEGIN
    -- Calculate points: 1 point per $10 wagered
    v_points := FLOOR(NEW.amount / 10)::INTEGER;

    IF v_points <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get or create player loyalty record
    SELECT * INTO v_loyalty_record
    FROM player_loyalty
    WHERE user_id = NEW.user_id;

    IF v_loyalty_record.id IS NULL THEN
        -- Create new loyalty record (Bronze tier)
        INSERT INTO player_loyalty (user_id, current_tier_id, total_points_earned, available_points, lifetime_wagered, last_activity_at)
        SELECT NEW.user_id, id, v_points, v_points, NEW.amount, NOW()
        FROM loyalty_tiers
        WHERE tier_level = 1
        RETURNING * INTO v_loyalty_record;
    ELSE
        -- Update existing loyalty record
        UPDATE player_loyalty
        SET
            total_points_earned = total_points_earned + v_points,
            available_points = available_points + v_points,
            lifetime_wagered = lifetime_wagered + NEW.amount,
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = v_loyalty_record.id;
    END IF;

    -- Log points transaction
    INSERT INTO loyalty_points_transactions (
        user_id,
        points,
        transaction_type,
        source,
        related_transaction_id,
        description
    ) VALUES (
        NEW.user_id,
        v_points,
        'earned',
        'wagering',
        NEW.id,
        'Points earned from ' || NEW.type || ' transaction'
    );

    -- Check for tier upgrade
    SELECT id INTO v_new_tier_id
    FROM loyalty_tiers
    WHERE points_required <= (v_loyalty_record.total_points_earned + v_points)
    ORDER BY tier_level DESC
    LIMIT 1;

    IF v_new_tier_id IS NOT NULL AND v_new_tier_id != v_loyalty_record.current_tier_id THEN
        UPDATE player_loyalty
        SET
            current_tier_id = v_new_tier_id,
            tier_started_at = NOW()
        WHERE id = v_loyalty_record.id;

        -- Could add notification here
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loyalty_points_award_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION award_loyalty_points();

-- ============================================================================
-- JACKPOT TICKETS AUTO-AWARD TRIGGER (Tier-Based)
-- ============================================================================

CREATE OR REPLACE FUNCTION award_jackpot_tickets()
RETURNS TRIGGER AS $$
DECLARE
    v_active_pool RECORD;
    v_player_tier RECORD;
    v_ticket_rate DECIMAL;
    v_tickets_earned INTEGER;
    v_next_ticket_number BIGINT;
    i INTEGER;
BEGIN
    -- Get active weekly jackpot pool
    SELECT * INTO v_active_pool
    FROM jackpot_pools
    WHERE jackpot_name = 'Weekly Main Jackpot' AND status = 'active'
    LIMIT 1;

    IF v_active_pool.id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get player's current tier to determine ticket rate
    SELECT lt.* INTO v_player_tier
    FROM player_loyalty pl
    INNER JOIN loyalty_tiers lt ON pl.current_tier_id = lt.id
    WHERE pl.user_id = NEW.user_id;

    -- Default to Bronze if no tier found
    IF v_player_tier.id IS NULL THEN
        SELECT * INTO v_player_tier
        FROM loyalty_tiers
        WHERE tier_level = 1;
    END IF;

    v_ticket_rate := v_player_tier.jackpot_ticket_rate;

    -- Calculate tickets earned based on tier
    -- Bronze: $250/ticket, Silver: $225, Gold: $200, Platinum: $175, Diamond: $150
    v_tickets_earned := FLOOR(NEW.amount / v_ticket_rate)::INTEGER;

    IF v_tickets_earned <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get next ticket number
    SELECT COALESCE(MAX(ticket_number), 0) + 1 INTO v_next_ticket_number
    FROM jackpot_tickets
    WHERE jackpot_pool_id = v_active_pool.id;

    -- Create ticket records
    FOR i IN 1..v_tickets_earned LOOP
        INSERT INTO jackpot_tickets (
            jackpot_pool_id,
            user_id,
            ticket_number,
            earned_from_transaction_id,
            wager_amount,
            earned_at
        ) VALUES (
            v_active_pool.id,
            NEW.user_id,
            v_next_ticket_number,
            NEW.id,
            NEW.amount,
            NOW()
        );

        v_next_ticket_number := v_next_ticket_number + 1;
    END LOOP;

    -- Update aggregate ticket count
    INSERT INTO player_ticket_counts (
        jackpot_pool_id,
        user_id,
        total_tickets,
        last_ticket_at,
        updated_at
    ) VALUES (
        v_active_pool.id,
        NEW.user_id,
        v_tickets_earned,
        NOW(),
        NOW()
    )
    ON CONFLICT (jackpot_pool_id, user_id)
    DO UPDATE SET
        total_tickets = player_ticket_counts.total_tickets + v_tickets_earned,
        last_ticket_at = NOW(),
        updated_at = NOW();

    -- Add contribution to jackpot pool (0.5%)
    UPDATE jackpot_pools
    SET
        current_amount = current_amount + (NEW.amount * contribution_rate),
        updated_at = NOW()
    WHERE id = v_active_pool.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jackpot_tickets_award_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION award_jackpot_tickets();

-- ============================================================================
-- INITIALIZE LOYALTY FOR EXISTING USERS
-- ============================================================================

-- Create loyalty records for existing users who don't have one
INSERT INTO player_loyalty (user_id, current_tier_id, total_points_earned, available_points, lifetime_wagered)
SELECT
    u.id,
    (SELECT id FROM loyalty_tiers WHERE tier_level = 1),
    0,
    0,
    0
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM player_loyalty pl WHERE pl.user_id = u.id
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get player's current tier info
CREATE OR REPLACE FUNCTION get_player_tier_info(p_user_id UUID)
RETURNS TABLE(
    tier_name VARCHAR,
    tier_level INTEGER,
    total_points BIGINT,
    available_points BIGINT,
    cashback_rate DECIMAL,
    points_to_next_tier INTEGER,
    next_tier_name VARCHAR,
    jackpot_ticket_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lt.tier_name,
        lt.tier_level,
        pl.total_points_earned,
        pl.available_points,
        lt.cashback_rate,
        CASE
            WHEN next_tier.points_required IS NOT NULL
            THEN (next_tier.points_required - pl.total_points_earned)::INTEGER
            ELSE 0
        END as points_to_next_tier,
        next_tier.tier_name as next_tier_name,
        lt.jackpot_ticket_rate
    FROM player_loyalty pl
    INNER JOIN loyalty_tiers lt ON pl.current_tier_id = lt.id
    LEFT JOIN loyalty_tiers next_tier ON next_tier.tier_level = lt.tier_level + 1
    WHERE pl.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current jackpot info
CREATE OR REPLACE FUNCTION get_current_jackpot_info()
RETURNS TABLE(
    jackpot_id UUID,
    jackpot_name VARCHAR,
    current_amount DECIMAL,
    total_tickets BIGINT,
    next_draw_at TIMESTAMPTZ,
    hours_until_draw NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        jp.id,
        jp.jackpot_name,
        jp.current_amount,
        COUNT(jt.id)::BIGINT as total_tickets,
        jp.next_draw_at,
        EXTRACT(EPOCH FROM (jp.next_draw_at - NOW())) / 3600 as hours_until_draw
    FROM jackpot_pools jp
    LEFT JOIN jackpot_tickets jt ON jp.id = jt.jackpot_pool_id AND jt.draw_eligible = true
    WHERE jp.status = 'active' AND jp.jackpot_name = 'Weekly Main Jackpot'
    GROUP BY jp.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get player's ticket count for current draw
CREATE OR REPLACE FUNCTION get_my_jackpot_tickets(p_user_id UUID)
RETURNS TABLE(
    jackpot_name VARCHAR,
    my_tickets INTEGER,
    total_tickets BIGINT,
    my_odds_percentage DECIMAL,
    current_amount DECIMAL,
    next_draw_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        jp.jackpot_name,
        COALESCE(ptc.total_tickets, 0)::INTEGER as my_tickets,
        (SELECT COUNT(*)::BIGINT FROM jackpot_tickets WHERE jackpot_pool_id = jp.id AND draw_eligible = true) as total_tickets,
        CASE
            WHEN (SELECT COUNT(*) FROM jackpot_tickets WHERE jackpot_pool_id = jp.id AND draw_eligible = true) > 0
            THEN (COALESCE(ptc.total_tickets, 0)::DECIMAL /
                  (SELECT COUNT(*) FROM jackpot_tickets WHERE jackpot_pool_id = jp.id AND draw_eligible = true)::DECIMAL * 100)
            ELSE 0
        END as my_odds_percentage,
        jp.current_amount,
        jp.next_draw_at
    FROM jackpot_pools jp
    LEFT JOIN player_ticket_counts ptc ON jp.id = ptc.jackpot_pool_id AND ptc.user_id = p_user_id
    WHERE jp.status = 'active' AND jp.jackpot_name = 'Weekly Main Jackpot';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_loyalty_points IS 'Automatically awards loyalty points on transactions (1 pt per $10 wagered)';
COMMENT ON FUNCTION award_jackpot_tickets IS 'Automatically awards jackpot tickets based on player tier (Bronze: $250/ticket down to Diamond: $150/ticket)';
COMMENT ON FUNCTION get_player_tier_info IS 'Get player loyalty tier information and progress';
COMMENT ON FUNCTION get_current_jackpot_info IS 'Get current weekly jackpot information';
COMMENT ON FUNCTION get_my_jackpot_tickets IS 'Get player jackpot tickets and odds for current draw';
