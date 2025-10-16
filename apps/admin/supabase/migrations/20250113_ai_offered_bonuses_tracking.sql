-- Track Bonuses Offered by AI to Specific Players
-- This allows the frontend to show "bonuses available to you" including AI-personalized offers

-- AI Offered Bonuses table
-- Tracks when AI offers a specific bonus to a player in conversation
CREATE TABLE IF NOT EXISTS ai_offered_bonuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- References
    player_id UUID NOT NULL, -- References users table
    conversation_id UUID REFERENCES sms_conversations(id),
    message_id UUID REFERENCES sms_messages(id), -- The AI message where bonus was offered
    bonus_code VARCHAR(50) NOT NULL, -- References bonus_offers

    -- Bonus details (snapshot at time of offer)
    bonus_name VARCHAR(255),
    bonus_type VARCHAR(50),
    bonus_amount DECIMAL(10, 2),
    match_percentage DECIMAL(5, 2),
    max_bonus_amount DECIMAL(10, 2),
    offer_details JSONB, -- Full bonus offer details

    -- Offer tracking
    offered_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Personalized expiry (e.g., 48 hours from offer)
    offer_reason TEXT, -- Why AI offered this (e.g., "Player asked about deposit bonuses")

    -- Response tracking
    player_viewed BOOLEAN DEFAULT false,
    player_viewed_at TIMESTAMPTZ,
    player_claimed BOOLEAN DEFAULT false,
    player_claimed_at TIMESTAMPTZ,
    player_bonus_id UUID, -- Link to actual player_bonuses record when claimed

    -- Status
    status VARCHAR(50) DEFAULT 'offered', -- offered, viewed, claimed, expired, declined
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_offered_bonuses_player ON ai_offered_bonuses(player_id);
CREATE INDEX idx_ai_offered_bonuses_status ON ai_offered_bonuses(status);
CREATE INDEX idx_ai_offered_bonuses_expires ON ai_offered_bonuses(expires_at) WHERE status = 'offered';
CREATE INDEX idx_ai_offered_bonuses_conversation ON ai_offered_bonuses(conversation_id);

-- Enable RLS
ALTER TABLE ai_offered_bonuses ENABLE ROW LEVEL SECURITY;

-- Players can view their own offered bonuses
CREATE POLICY "Players can view their own AI-offered bonuses" ON ai_offered_bonuses
    FOR SELECT USING (
        player_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Admin can manage all
CREATE POLICY "Admin users can manage AI-offered bonuses" ON ai_offered_bonuses
    FOR ALL USING (true);

-- Function to log when AI offers a bonus (legacy - kept for compatibility)
CREATE OR REPLACE FUNCTION log_ai_bonus_offer(
    p_player_id UUID,
    p_conversation_id UUID,
    p_message_id UUID,
    p_bonus_code VARCHAR,
    p_offer_reason TEXT DEFAULT NULL,
    p_expires_hours INTEGER DEFAULT 48
)
RETURNS UUID AS $$
DECLARE
    v_offered_bonus_id UUID;
    v_bonus_details RECORD;
BEGIN
    -- Get bonus details from bonus_offers
    SELECT * INTO v_bonus_details
    FROM bonus_offers
    WHERE bonus_code = p_bonus_code
    AND active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bonus code % not found or inactive', p_bonus_code;
    END IF;

    -- Create offered bonus record
    INSERT INTO ai_offered_bonuses (
        player_id,
        conversation_id,
        message_id,
        bonus_code,
        bonus_name,
        bonus_type,
        bonus_amount,
        match_percentage,
        max_bonus_amount,
        offer_details,
        expires_at,
        offer_reason,
        status
    ) VALUES (
        p_player_id,
        p_conversation_id,
        p_message_id,
        p_bonus_code,
        v_bonus_details.bonus_name,
        v_bonus_details.bonus_type,
        v_bonus_details.max_bonus_amount,
        v_bonus_details.match_percentage,
        v_bonus_details.max_bonus_amount,
        row_to_json(v_bonus_details),
        NOW() + (p_expires_hours || ' hours')::INTERVAL,
        p_offer_reason,
        'offered'
    )
    RETURNING id INTO v_offered_bonus_id;

    RETURN v_offered_bonus_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log AI bonus offer AND automatically credit it to player account
CREATE OR REPLACE FUNCTION log_and_credit_ai_bonus_offer(
    p_player_id UUID,
    p_conversation_id UUID,
    p_message_id UUID,
    p_bonus_code VARCHAR,
    p_offer_reason TEXT DEFAULT NULL,
    p_expires_hours INTEGER DEFAULT 48
)
RETURNS JSONB AS $$
DECLARE
    v_offered_bonus_id UUID;
    v_player_bonus_id UUID;
    v_bonus_details RECORD;
    v_existing_bonus UUID;
BEGIN
    -- Get bonus details from bonus_offers
    SELECT * INTO v_bonus_details
    FROM bonus_offers
    WHERE bonus_code = p_bonus_code
    AND active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bonus code % not found or inactive', p_bonus_code;
    END IF;

    -- Check if player already has this bonus active (don't duplicate)
    SELECT id INTO v_existing_bonus
    FROM player_bonuses
    WHERE player_id = p_player_id
    AND bonus_code = p_bonus_code
    AND status IN ('active', 'pending')
    LIMIT 1;

    IF v_existing_bonus IS NOT NULL THEN
        RAISE NOTICE 'Player already has active bonus %, skipping auto-credit', p_bonus_code;
        RETURN jsonb_build_object(
            'offered_bonus_id', NULL,
            'player_bonus_id', v_existing_bonus,
            'auto_credited', false,
            'reason', 'Player already has this bonus active'
        );
    END IF;

    -- Create offered bonus record
    INSERT INTO ai_offered_bonuses (
        player_id,
        conversation_id,
        message_id,
        bonus_code,
        bonus_name,
        bonus_type,
        bonus_amount,
        match_percentage,
        max_bonus_amount,
        offer_details,
        expires_at,
        offer_reason,
        status,
        player_claimed
    ) VALUES (
        p_player_id,
        p_conversation_id,
        p_message_id,
        p_bonus_code,
        v_bonus_details.bonus_name,
        v_bonus_details.bonus_type,
        v_bonus_details.max_bonus_amount,
        v_bonus_details.match_percentage,
        v_bonus_details.max_bonus_amount,
        row_to_json(v_bonus_details),
        NOW() + (p_expires_hours || ' hours')::INTERVAL,
        p_offer_reason,
        'claimed', -- Mark as claimed since we're auto-crediting
        true -- player_claimed = true
    )
    RETURNING id INTO v_offered_bonus_id;

    -- Automatically create player_bonuses record (auto-credit)
    INSERT INTO player_bonuses (
        player_id,
        bonus_code,
        bonus_amount,
        wagering_requirement,
        status,
        activated_at,
        expires_at
    ) VALUES (
        p_player_id,
        p_bonus_code,
        v_bonus_details.max_bonus_amount,
        v_bonus_details.max_bonus_amount * v_bonus_details.wagering_requirement_multiplier,
        'active', -- Immediately active
        NOW(),
        NOW() + (p_expires_hours || ' hours')::INTERVAL
    )
    RETURNING id INTO v_player_bonus_id;

    -- Link the ai_offered_bonuses record to the player_bonuses record
    UPDATE ai_offered_bonuses
    SET
        player_bonus_id = v_player_bonus_id,
        player_claimed_at = NOW()
    WHERE id = v_offered_bonus_id;

    -- Return details
    RETURN jsonb_build_object(
        'offered_bonus_id', v_offered_bonus_id,
        'player_bonus_id', v_player_bonus_id,
        'auto_credited', true,
        'bonus_code', p_bonus_code,
        'bonus_amount', v_bonus_details.max_bonus_amount
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get all available bonuses for a player
-- Returns general bonuses + daily promotions + AI-offered bonuses
CREATE OR REPLACE FUNCTION get_player_available_bonuses(p_player_id UUID)
RETURNS TABLE (
    bonus_id UUID,
    bonus_code VARCHAR,
    bonus_name VARCHAR,
    bonus_type VARCHAR,
    bonus_amount DECIMAL,
    match_percentage DECIMAL,
    max_bonus_amount DECIMAL,
    description TEXT,
    source VARCHAR, -- 'general', 'daily_promotion', or 'ai_offered'
    ai_offered_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    offer_reason TEXT,
    status VARCHAR,
    wagering_requirement DECIMAL,
    min_deposit DECIMAL,
    is_featured BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        -- General available bonuses (not claimed by player)
        SELECT
            bo.id::UUID as bonus_id,
            bo.bonus_code::VARCHAR,
            bo.bonus_name::VARCHAR,
            bo.bonus_type::VARCHAR,
            bo.max_bonus_amount as bonus_amount,
            bo.match_percentage,
            bo.max_bonus_amount,
            bo.terms_conditions as description,
            CASE
                WHEN bo.bonus_code LIKE 'DAILY%' OR bo.bonus_code LIKE 'MONDAY%' OR bo.bonus_code LIKE 'TUESDAY%'
                     OR bo.bonus_code LIKE 'WEDNESDAY%' OR bo.bonus_code LIKE 'THURSDAY%'
                     OR bo.bonus_code LIKE 'FRIDAY%' OR bo.bonus_code LIKE 'SATURDAY%' OR bo.bonus_code LIKE 'SUNDAY%'
                THEN 'daily_promotion'::VARCHAR
                ELSE 'general'::VARCHAR
            END as source,
            NULL::TIMESTAMPTZ as ai_offered_at,
            bo.valid_until as expires_at,
            NULL::TEXT as offer_reason,
            'available'::VARCHAR as status,
            bo.wagering_requirement_multiplier::DECIMAL,
            bo.min_deposit_amount as min_deposit,
            false as is_featured
        FROM bonus_offers bo
        WHERE bo.active = true
        AND (
            -- Include if player hasn't claimed this exact bonus yet
            NOT EXISTS (
                SELECT 1 FROM player_bonuses pb
                WHERE pb.user_id = p_player_id
                AND pb.bonus_offer_id = bo.id
                AND pb.status IN ('active', 'pending')
            )
            -- OR if it's a repeatable daily bonus
            OR (
                (bo.bonus_code LIKE 'DAILY%' OR bo.bonus_code LIKE 'MONDAY%' OR bo.bonus_code LIKE 'TUESDAY%'
                 OR bo.bonus_code LIKE 'WEDNESDAY%' OR bo.bonus_code LIKE 'THURSDAY%'
                 OR bo.bonus_code LIKE 'FRIDAY%' OR bo.bonus_code LIKE 'SATURDAY%' OR bo.bonus_code LIKE 'SUNDAY%')
                AND NOT EXISTS (
                    SELECT 1 FROM player_bonuses pb
                    WHERE pb.user_id = p_player_id
                    AND pb.bonus_offer_id = bo.id
                    AND pb.status IN ('active', 'pending')
                    AND pb.issued_at > NOW() - INTERVAL '24 hours'
                )
            )
        )

        UNION ALL

        -- AI-offered bonuses (personalized offers)
        SELECT
            aob.id::UUID as bonus_id,
            aob.bonus_code::VARCHAR,
            aob.bonus_name::VARCHAR,
            aob.bonus_type::VARCHAR,
            aob.bonus_amount,
            aob.match_percentage,
            aob.max_bonus_amount,
            aob.offer_reason as description,
            'ai_offered'::VARCHAR as source,
            aob.offered_at as ai_offered_at,
            aob.expires_at,
            aob.offer_reason,
            aob.status::VARCHAR,
            NULL::DECIMAL as wagering_requirement,
            NULL::DECIMAL as min_deposit,
            true as is_featured
        FROM ai_offered_bonuses aob
        WHERE aob.player_id = p_player_id
        AND aob.status = 'offered'
        AND (aob.expires_at IS NULL OR aob.expires_at > NOW())
        AND aob.player_claimed = false
    ) AS all_bonuses
    ORDER BY
        CASE all_bonuses.source
            WHEN 'ai_offered' THEN 1
            WHEN 'daily_promotion' THEN 2
            ELSE 3
        END,
        all_bonuses.is_featured DESC,
        all_bonuses.ai_offered_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-expire old AI-offered bonuses
CREATE OR REPLACE FUNCTION expire_old_ai_offers()
RETURNS TRIGGER AS $$
BEGIN
    -- This would typically be run by a scheduled job
    -- Mark expired offers
    UPDATE ai_offered_bonuses
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'offered'
    AND expires_at < NOW();

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- View for easy monitoring
CREATE OR REPLACE VIEW ai_offered_bonuses_summary AS
SELECT
    aob.player_id,
    u.external_user_id,
    u.email,
    aob.bonus_code,
    aob.bonus_name,
    aob.offered_at,
    aob.expires_at,
    aob.status,
    aob.player_viewed,
    aob.player_claimed,
    EXTRACT(EPOCH FROM (aob.expires_at - NOW()))/3600 as hours_until_expiry
FROM ai_offered_bonuses aob
LEFT JOIN users u ON aob.player_id = u.id
WHERE aob.status IN ('offered', 'viewed')
ORDER BY aob.offered_at DESC;

-- Comments
COMMENT ON TABLE ai_offered_bonuses IS 'Tracks bonuses that AI has specifically offered to individual players';
COMMENT ON FUNCTION log_ai_bonus_offer IS 'Logs when AI offers a bonus to a player in conversation';
COMMENT ON FUNCTION get_player_available_bonuses IS 'Returns all bonuses available to a player (general + AI-offered)';
