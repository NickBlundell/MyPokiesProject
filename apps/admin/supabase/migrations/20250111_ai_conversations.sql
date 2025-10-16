-- AI-Powered SMS Conversations and Analytics
-- Extension to SMS CRM system for AI-generated messages and conversation tracking

-- SMS Conversations table (groups messages into conversations)
CREATE TABLE IF NOT EXISTS sms_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Participants
    phone_number VARCHAR(20) NOT NULL,
    lead_id UUID REFERENCES marketing_leads(id),
    player_id UUID, -- References users table when they become a player

    -- Conversation metadata
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, converted
    channel VARCHAR(20) DEFAULT 'sms', -- sms, whatsapp, etc.

    -- AI Configuration
    ai_enabled BOOLEAN DEFAULT true,
    ai_model VARCHAR(50) DEFAULT 'claude-3-opus', -- anthropic model
    ai_temperature DECIMAL(2, 1) DEFAULT 0.7,
    ai_persona VARCHAR(100) DEFAULT 'friendly_casino_host', -- Preset personas
    custom_instructions TEXT, -- Custom AI behavior instructions

    -- Context for AI
    conversation_goal VARCHAR(100), -- signup, deposit, reactivation, support
    player_context JSONB DEFAULT '{}', -- Player history, preferences, etc.

    -- Metrics
    message_count INTEGER DEFAULT 0,
    ai_message_count INTEGER DEFAULT 0,
    human_message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    last_ai_message_at TIMESTAMPTZ,
    last_human_message_at TIMESTAMPTZ,

    -- Conversion tracking
    conversion_goal VARCHAR(50), -- signup, first_deposit, return_player
    converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMPTZ,
    conversion_value DECIMAL(10, 2),
    time_to_conversion INTERVAL,

    -- Engagement metrics
    response_rate DECIMAL(5, 2), -- Percentage of AI messages that got responses
    avg_response_time INTERVAL,
    sentiment_score DECIMAL(3, 2), -- -1 to 1, analyzed by AI
    engagement_score DECIMAL(5, 2), -- 0-100 based on various factors

    -- Metadata
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Message Generation Logs
CREATE TABLE IF NOT EXISTS ai_message_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- References
    conversation_id UUID REFERENCES sms_conversations(id),
    message_id UUID REFERENCES sms_messages(id),

    -- AI Request
    prompt TEXT NOT NULL,
    context JSONB, -- Conversation history, player data, etc.
    model VARCHAR(50),
    temperature DECIMAL(2, 1),
    max_tokens INTEGER,

    -- AI Response
    generated_message TEXT,
    ai_confidence DECIMAL(3, 2), -- Confidence score if available
    generation_time_ms INTEGER, -- Time taken to generate
    tokens_used INTEGER,

    -- Cost tracking
    api_cost DECIMAL(10, 6), -- Cost in USD

    -- Human override
    human_edited BOOLEAN DEFAULT false,
    edited_message TEXT,
    edited_by UUID REFERENCES admin_users(id),
    edit_reason TEXT,

    -- Performance
    message_sent BOOLEAN DEFAULT false,
    delivery_status VARCHAR(50),
    recipient_responded BOOLEAN DEFAULT false,
    response_time INTERVAL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Templates (AI conversation starters and flows)
CREATE TABLE IF NOT EXISTS conversation_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Template details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- acquisition, retention, reactivation, support

    -- AI Configuration
    goal VARCHAR(100) NOT NULL,
    persona VARCHAR(100),
    opening_message TEXT NOT NULL,
    system_prompt TEXT NOT NULL, -- Instructions for AI

    -- Flow configuration
    max_messages INTEGER DEFAULT 10, -- Max AI messages in conversation
    success_criteria JSONB, -- What defines success for this template
    fallback_to_human_after INTEGER DEFAULT 5, -- Messages before human takeover

    -- Target audience
    target_segment VARCHAR(100), -- new_leads, inactive_players, vips, etc.
    eligibility_criteria JSONB,

    -- Performance metrics
    times_used INTEGER DEFAULT 0,
    total_conversations INTEGER DEFAULT 0,
    successful_conversations INTEGER DEFAULT 0,
    avg_conversion_rate DECIMAL(5, 2),
    avg_messages_to_conversion DECIMAL(5, 2),

    -- Status
    active BOOLEAN DEFAULT true,
    tested BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES admin_users(id),

    -- Metadata
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Twilio Configuration
CREATE TABLE IF NOT EXISTS sms_provider_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Provider details
    provider_name VARCHAR(50) NOT NULL, -- twilio, messagebird, etc.
    active BOOLEAN DEFAULT false,

    -- API Configuration
    account_sid VARCHAR(255),
    auth_token_encrypted TEXT, -- Encrypted auth token
    api_key VARCHAR(255),
    api_secret_encrypted TEXT,

    -- Phone numbers
    phone_numbers JSONB DEFAULT '[]', -- Array of configured phone numbers
    default_from_number VARCHAR(20),

    -- Webhooks
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    status_callback_url TEXT,

    -- Settings
    max_messages_per_second INTEGER DEFAULT 10,
    retry_failed_messages BOOLEAN DEFAULT true,
    max_retry_attempts INTEGER DEFAULT 3,

    -- Cost tracking
    cost_per_sms DECIMAL(10, 4) DEFAULT 0.0075, -- Default Twilio pricing
    monthly_budget DECIMAL(10, 2),
    current_month_spend DECIMAL(10, 2) DEFAULT 0,

    -- Metadata
    configured_by UUID REFERENCES admin_users(id),
    configured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Provider Configuration (Anthropic)
CREATE TABLE IF NOT EXISTS ai_provider_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Provider details
    provider_name VARCHAR(50) DEFAULT 'anthropic',
    active BOOLEAN DEFAULT false,

    -- API Configuration
    api_key_encrypted TEXT, -- Encrypted API key
    api_endpoint VARCHAR(255) DEFAULT 'https://api.anthropic.com',
    api_version VARCHAR(20) DEFAULT '2024-01-01',

    -- Model settings
    default_model VARCHAR(50) DEFAULT 'claude-3-opus-20240229',
    default_temperature DECIMAL(2, 1) DEFAULT 0.7,
    default_max_tokens INTEGER DEFAULT 150, -- Keep SMS short

    -- Rate limiting
    max_requests_per_minute INTEGER DEFAULT 50,

    -- Cost tracking
    cost_per_1k_tokens DECIMAL(10, 6) DEFAULT 0.015, -- Opus pricing
    monthly_budget DECIMAL(10, 2),
    current_month_spend DECIMAL(10, 2) DEFAULT 0,

    -- Metadata
    configured_by UUID REFERENCES admin_users(id),
    configured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Personas (Predefined conversation styles)
CREATE TABLE IF NOT EXISTS ai_personas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Persona details
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    description TEXT,

    -- Personality configuration
    system_prompt TEXT NOT NULL, -- Core instructions for this persona
    tone VARCHAR(50), -- friendly, professional, casual, exciting
    language_style TEXT, -- How this persona speaks

    -- Behavioral rules
    do_rules TEXT[], -- Things this persona should do
    dont_rules TEXT[], -- Things this persona should never do

    -- Example messages
    example_openings TEXT[],
    example_responses JSONB, -- Common response patterns

    -- Performance
    times_used INTEGER DEFAULT 0,
    avg_engagement_score DECIMAL(5, 2),
    avg_conversion_rate DECIMAL(5, 2),

    -- Status
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversion Events (Track what leads to conversions)
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- References
    conversation_id UUID REFERENCES sms_conversations(id),
    lead_id UUID REFERENCES marketing_leads(id),
    player_id UUID,

    -- Event details
    event_type VARCHAR(50) NOT NULL, -- signup, deposit, return, purchase
    event_value DECIMAL(10, 2),
    event_data JSONB DEFAULT '{}',

    -- Attribution
    attributed_to VARCHAR(50), -- ai_conversation, manual_followup, organic
    last_touchpoint VARCHAR(100), -- Last message/action before conversion
    messages_before_conversion INTEGER,
    time_since_first_contact INTERVAL,

    -- Metadata
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Views for Conversion Tracking
CREATE OR REPLACE VIEW sms_conversion_analytics AS
SELECT
    DATE_TRUNC('day', c.started_at) as date,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN c.converted THEN c.id END) as converted_conversations,
    AVG(CASE WHEN c.converted THEN c.message_count END) as avg_messages_to_conversion,
    AVG(CASE WHEN c.converted THEN EXTRACT(EPOCH FROM c.time_to_conversion)/3600 END) as avg_hours_to_conversion,
    AVG(c.engagement_score) as avg_engagement_score,
    SUM(c.conversion_value) as total_conversion_value,
    COUNT(DISTINCT c.phone_number) as unique_contacts,
    COUNT(DISTINCT CASE WHEN c.ai_enabled THEN c.id END) as ai_conversations,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN c.converted THEN c.id END) / NULLIF(COUNT(DISTINCT c.id), 0), 2) as conversion_rate
FROM sms_conversations c
GROUP BY DATE_TRUNC('day', c.started_at)
ORDER BY date DESC;

-- View for per-campaign conversion metrics
CREATE OR REPLACE VIEW campaign_conversion_metrics AS
SELECT
    sc.id as campaign_id,
    sc.name as campaign_name,
    COUNT(DISTINCT ml.id) as total_leads,
    COUNT(DISTINCT CASE WHEN ml.status = 'converted' THEN ml.id END) as converted_leads,
    COUNT(DISTINCT conv.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN conv.converted THEN conv.id END) as successful_conversations,
    AVG(CASE WHEN conv.converted THEN conv.message_count END) as avg_messages_to_conversion,
    SUM(conv.conversion_value) as total_revenue,
    sc.total_cost as campaign_cost,
    (SUM(conv.conversion_value) - sc.total_cost) as roi,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN ml.status = 'converted' THEN ml.id END) / NULLIF(COUNT(DISTINCT ml.id), 0), 2) as lead_conversion_rate,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN conv.converted THEN conv.id END) / NULLIF(COUNT(DISTINCT conv.id), 0), 2) as conversation_conversion_rate
FROM sms_campaigns sc
LEFT JOIN marketing_leads ml ON ml.list_id = sc.list_id
LEFT JOIN sms_conversations conv ON conv.lead_id = ml.id
GROUP BY sc.id, sc.name, sc.total_cost
ORDER BY total_revenue DESC;

-- Indexes for performance
CREATE INDEX idx_sms_conversations_phone ON sms_conversations(phone_number);
CREATE INDEX idx_sms_conversations_status ON sms_conversations(status);
CREATE INDEX idx_sms_conversations_converted ON sms_conversations(converted);
CREATE INDEX idx_ai_message_logs_conversation ON ai_message_logs(conversation_id);
CREATE INDEX idx_conversion_events_conversation ON conversion_events(conversation_id);
CREATE INDEX idx_conversion_events_type ON conversion_events(event_type);

-- Sample AI Personas
INSERT INTO ai_personas (name, display_name, tone, system_prompt, do_rules, dont_rules) VALUES
('friendly_casino_host', 'Your Personal Casino Host', 'friendly',
'You are a friendly and enthusiastic casino host for MyPokies online casino. Your goal is to make players feel welcome and excited about playing. Be conversational, use appropriate emojis sparingly, and focus on the fun and entertainment aspect of gaming.',
ARRAY['Use the player''s first name when known', 'Mention specific bonuses and amounts', 'Keep messages under 160 characters', 'Include a clear call-to-action', 'Be enthusiastic but genuine'],
ARRAY['Never pressure players to deposit', 'Don''t mention gambling addiction', 'Avoid making promises about winnings', 'Don''t use excessive emojis', 'Never share other players'' information']),

('vip_concierge', 'VIP Concierge Service', 'professional',
'You are a professional VIP concierge for MyPokies high-value players. Provide white-glove service with exclusive offers and personalized attention. Be sophisticated, respectful, and focus on the premium experience.',
ARRAY['Address players formally unless instructed otherwise', 'Emphasize exclusivity and VIP benefits', 'Offer personalized bonuses', 'Provide direct assistance', 'Maintain professional tone'],
ARRAY['Don''t use slang or casual language', 'Never rush the conversation', 'Avoid generic offers', 'Don''t mention non-VIP promotions', 'Never compare to other casinos']),

('reactivation_specialist', 'Win-Back Specialist', 'casual',
'You are reaching out to inactive players to welcome them back to MyPokies. Be understanding, friendly, and focus on what''s new and exciting. Acknowledge their absence without being pushy.',
ARRAY['Acknowledge the time away casually', 'Highlight new games and features', 'Offer a compelling welcome-back bonus', 'Keep tone light and friendly', 'Make it easy to return'],
ARRAY['Don''t guilt-trip about absence', 'Avoid asking why they left', 'Don''t be overly aggressive', 'Never mention their previous losses', 'Don''t overwhelm with options']);

-- Function to generate AI message
CREATE OR REPLACE FUNCTION generate_ai_message(
    conversation_id UUID,
    context JSONB DEFAULT '{}'
)
RETURNS TEXT AS $$
DECLARE
    generated_message TEXT;
    conversation RECORD;
BEGIN
    -- Get conversation details
    SELECT * INTO conversation
    FROM sms_conversations
    WHERE id = conversation_id;

    -- This is a placeholder - actual implementation would call Anthropic API
    -- In production, this would be an edge function that calls the API
    generated_message := 'This is where the AI-generated message would appear';

    -- Log the generation
    INSERT INTO ai_message_logs (
        conversation_id,
        prompt,
        context,
        model,
        generated_message,
        generation_time_ms
    ) VALUES (
        conversation_id,
        'System prompt here',
        context,
        conversation.ai_model,
        generated_message,
        100
    );

    RETURN generated_message;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation metrics
CREATE OR REPLACE FUNCTION update_conversation_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        UPDATE sms_conversations
        SET
            message_count = message_count + 1,
            last_message_at = NEW.created_at,
            ai_message_count = CASE
                WHEN NEW.direction = 'outbound' THEN ai_message_count + 1
                ELSE ai_message_count
            END,
            human_message_count = CASE
                WHEN NEW.direction = 'inbound' THEN human_message_count + 1
                ELSE human_message_count
            END,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON sms_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_metrics();

-- Enable RLS
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin users can manage conversations" ON sms_conversations FOR ALL USING (true);
CREATE POLICY "Admin users can view AI logs" ON ai_message_logs FOR ALL USING (true);
CREATE POLICY "Admin users can manage templates" ON conversation_templates FOR ALL USING (true);
CREATE POLICY "Admin users can manage SMS config" ON sms_provider_config FOR ALL USING (true);
CREATE POLICY "Admin users can manage AI config" ON ai_provider_config FOR ALL USING (true);
CREATE POLICY "Admin users can manage personas" ON ai_personas FOR ALL USING (true);
CREATE POLICY "Admin users can view conversions" ON conversion_events FOR ALL USING (true);