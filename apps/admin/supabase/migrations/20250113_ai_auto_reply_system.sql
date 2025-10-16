-- AI Auto-Reply System with Delayed Batch Responses
-- This migration enables AI-powered automatic replies to player SMS messages
-- with intelligent delay and message accumulation for natural conversation flow

-- Add conversation_id to sms_messages if not exists
ALTER TABLE sms_messages
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES sms_conversations(id) ON DELETE CASCADE;

-- Add ai_generated flag to track which messages were AI-generated
ALTER TABLE sms_messages
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

-- Create index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_id ON sms_messages(conversation_id);

-- Pending AI Auto-Replies table
-- Tracks scheduled AI responses with accumulated messages
CREATE TABLE IF NOT EXISTS pending_ai_auto_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- References
    conversation_id UUID NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
    player_id UUID, -- References users table for promotion lookups
    phone_number VARCHAR(20) NOT NULL,

    -- Message accumulation
    accumulated_message_ids UUID[] DEFAULT '{}', -- Array of message IDs received during delay
    first_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,

    -- Scheduling
    scheduled_reply_time TIMESTAMPTZ NOT NULL, -- When to send the AI reply
    delay_minutes INTEGER, -- Random delay that was applied (for analytics)

    -- Processing
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    processed_at TIMESTAMPTZ,
    ai_response_sent BOOLEAN DEFAULT false,
    ai_message_id UUID REFERENCES sms_messages(id), -- The AI response message

    -- Context snapshot (for debugging)
    player_context JSONB DEFAULT '{}',
    promotion_context JSONB DEFAULT '{}',

    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pending_replies_status ON pending_ai_auto_replies(status);
CREATE INDEX idx_pending_replies_scheduled_time ON pending_ai_auto_replies(scheduled_reply_time) WHERE status = 'pending';
CREATE INDEX idx_pending_replies_conversation ON pending_ai_auto_replies(conversation_id);
CREATE INDEX idx_pending_replies_player ON pending_ai_auto_replies(player_id);

-- Database function to get player promotion context
-- Returns active bonuses and available offers for AI generation
CREATE OR REPLACE FUNCTION get_player_promotion_context(p_player_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    active_bonuses JSONB;
    available_offers JSONB;
BEGIN
    -- Get player's active bonuses
    -- Note: This assumes bonus tables exist in the main casino database
    -- Adjust table names based on actual schema
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'bonus_name', COALESCE(bo.bonus_name, pb.bonus_code),
            'bonus_amount', pb.bonus_amount,
            'wagering_required', pb.wagering_requirement,
            'wagering_completed', pb.wagering_completed,
            'expires_at', pb.expires_at,
            'status', pb.status
        )
    ), '[]'::jsonb) INTO active_bonuses
    FROM player_bonuses pb
    LEFT JOIN bonus_offers bo ON pb.bonus_code = bo.bonus_code
    WHERE pb.player_id = p_player_id
    AND pb.status IN ('active', 'pending');

    -- Get available bonus offers the player can claim
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'bonus_code', bonus_code,
            'bonus_name', bonus_name,
            'bonus_type', bonus_type,
            'match_percentage', match_percentage,
            'max_bonus_amount', max_bonus_amount,
            'min_deposit', min_deposit,
            'description', description
        )
    ), '[]'::jsonb) INTO available_offers
    FROM bonus_offers
    WHERE active = true
    AND (max_claims IS NULL OR max_claims > 0)
    ORDER BY CASE bonus_type
        WHEN 'no_deposit' THEN 1
        WHEN 'deposit_match' THEN 2
        WHEN 'free_spins' THEN 3
        ELSE 4
    END
    LIMIT 5; -- Limit to top 5 offers

    -- Build result JSON
    result := jsonb_build_object(
        'active_bonuses', active_bonuses,
        'available_offers', available_offers,
        'has_active_bonuses', jsonb_array_length(active_bonuses) > 0,
        'offers_available', jsonb_array_length(available_offers) > 0
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty context if tables don't exist yet
        RETURN jsonb_build_object(
            'active_bonuses', '[]'::jsonb,
            'available_offers', '[]'::jsonb,
            'has_active_bonuses', false,
            'offers_available', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Function to format accumulated messages for AI prompt
CREATE OR REPLACE FUNCTION format_accumulated_messages(message_ids UUID[])
RETURNS TEXT AS $$
DECLARE
    messages_text TEXT;
BEGIN
    SELECT string_agg(
        to_char(created_at, 'HH24:MI') || ' - ' || message_content,
        E'\n'
        ORDER BY created_at
    ) INTO messages_text
    FROM sms_messages
    WHERE id = ANY(message_ids)
    AND direction = 'inbound';

    RETURN COALESCE(messages_text, '');
END;
$$ LANGUAGE plpgsql;

-- Function to create or update pending auto-reply
-- Called by the Twilio webhook when a new inbound message arrives
CREATE OR REPLACE FUNCTION upsert_pending_auto_reply(
    p_conversation_id UUID,
    p_player_id UUID,
    p_phone_number VARCHAR,
    p_message_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_pending_reply_id UUID;
    v_existing_count INTEGER;
    v_random_delay_minutes INTEGER;
    v_scheduled_time TIMESTAMPTZ;
BEGIN
    -- Check if there's already a pending reply for this conversation
    SELECT id INTO v_pending_reply_id
    FROM pending_ai_auto_replies
    WHERE conversation_id = p_conversation_id
    AND status = 'pending'
    AND scheduled_reply_time > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_pending_reply_id IS NOT NULL THEN
        -- Update existing pending reply - add this message to accumulation
        UPDATE pending_ai_auto_replies
        SET
            accumulated_message_ids = array_append(accumulated_message_ids, p_message_id),
            last_message_at = NOW(),
            message_count = message_count + 1,
            updated_at = NOW()
        WHERE id = v_pending_reply_id;

        RETURN v_pending_reply_id;
    ELSE
        -- Create new pending reply with random delay (1-3 minutes)
        v_random_delay_minutes := 1 + floor(random() * 3)::INTEGER; -- 1 to 3 minutes
        v_scheduled_time := NOW() + (v_random_delay_minutes || ' minutes')::INTERVAL;

        INSERT INTO pending_ai_auto_replies (
            conversation_id,
            player_id,
            phone_number,
            accumulated_message_ids,
            message_count,
            scheduled_reply_time,
            delay_minutes,
            status
        ) VALUES (
            p_conversation_id,
            p_player_id,
            p_phone_number,
            ARRAY[p_message_id],
            1,
            v_scheduled_time,
            v_random_delay_minutes,
            'pending'
        )
        RETURNING id INTO v_pending_reply_id;

        RETURN v_pending_reply_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation by phone number (or create if not exists)
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_phone_number VARCHAR,
    p_player_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Try to find existing conversation
    SELECT id INTO v_conversation_id
    FROM sms_conversations
    WHERE phone_number = p_phone_number
    AND status IN ('active', 'paused')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_conversation_id IS NULL THEN
        -- Create new conversation
        INSERT INTO sms_conversations (
            phone_number,
            player_id,
            status,
            ai_enabled,
            conversation_goal,
            ai_persona
        ) VALUES (
            p_phone_number,
            p_player_id,
            'active',
            true,
            'engagement',
            'friendly_casino_host'
        )
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- View for monitoring pending auto-replies
CREATE OR REPLACE VIEW pending_auto_replies_monitoring AS
SELECT
    par.id,
    par.conversation_id,
    par.phone_number,
    par.message_count,
    par.delay_minutes,
    par.scheduled_reply_time,
    EXTRACT(EPOCH FROM (par.scheduled_reply_time - NOW()))/60 as minutes_until_send,
    par.status,
    par.retry_count,
    sc.ai_persona,
    sc.conversion_goal,
    par.created_at
FROM pending_ai_auto_replies par
JOIN sms_conversations sc ON par.conversation_id = sc.id
WHERE par.status IN ('pending', 'processing')
ORDER BY par.scheduled_reply_time ASC;

-- Enable RLS
ALTER TABLE pending_ai_auto_replies ENABLE ROW LEVEL SECURITY;

-- Admin policy
CREATE POLICY "Admin users can manage pending auto-replies" ON pending_ai_auto_replies
    FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE pending_ai_auto_replies IS 'Queues AI auto-replies with random delays and message accumulation';
COMMENT ON FUNCTION get_player_promotion_context IS 'Returns player active bonuses and available offers for AI context';
COMMENT ON FUNCTION upsert_pending_auto_reply IS 'Creates or updates pending auto-reply when new inbound message arrives';
COMMENT ON FUNCTION get_or_create_conversation IS 'Finds existing conversation or creates new one for phone number';

-- Sample data for testing (optional - comment out for production)
-- INSERT INTO ai_personas (name, display_name, tone, system_prompt) VALUES
-- ('engagement_specialist', 'Engagement Specialist', 'enthusiastic',
--  'You are an enthusiastic casino host helping players maximize their gaming experience with personalized bonuses and offers.');
