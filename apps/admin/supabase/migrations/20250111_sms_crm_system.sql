-- SMS CRM System Database Schema
-- This migration creates tables for SMS marketing, lead management, and automatic bonus assignment

-- Lead Lists table (for organizing marketing campaigns)
CREATE TABLE IF NOT EXISTS lead_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_leads INTEGER DEFAULT 0,
    source VARCHAR(100), -- e.g., 'facebook', 'google', 'manual', 'purchased'
    campaign_type VARCHAR(50) DEFAULT 'sms', -- sms, email, both

    -- Bonus configuration for this list
    bonus_enabled BOOLEAN DEFAULT false,
    bonus_type VARCHAR(50), -- 'no_deposit', 'deposit_match', 'free_spins'
    bonus_amount DECIMAL(10, 2) DEFAULT 0,
    bonus_percentage DECIMAL(5, 2) DEFAULT 0, -- For deposit match bonuses
    bonus_code VARCHAR(50), -- Reference to bonus_offers table
    bonus_expiry_days INTEGER DEFAULT 7, -- Days until bonus expires after activation

    -- Metadata
    uploaded_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Leads table (individual leads)
CREATE TABLE IF NOT EXISTS marketing_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID REFERENCES lead_lists(id) ON DELETE CASCADE,

    -- Contact information
    phone_number VARCHAR(20) NOT NULL,
    phone_country_code VARCHAR(5) DEFAULT '+1',
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),

    -- Lead status
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, registered, converted, invalid, opted_out
    last_contacted_at TIMESTAMPTZ,
    contact_count INTEGER DEFAULT 0,

    -- Conversion tracking
    registered_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    player_id UUID, -- References users table when they register
    conversion_value DECIMAL(10, 2) DEFAULT 0,

    -- Opt-out management
    opted_out BOOLEAN DEFAULT false,
    opted_out_at TIMESTAMPTZ,
    opt_out_reason TEXT,

    -- Custom attributes (for segmentation)
    tags TEXT[], -- Array of tags
    custom_data JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(phone_number, list_id) -- Prevent duplicates in same list
);

-- SMS Messages table (all SMS communications)
CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Message details
    phone_number VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'

    -- Campaign association (foreign keys added after tables created)
    campaign_id UUID,
    lead_id UUID REFERENCES marketing_leads(id),
    template_id UUID,

    -- Delivery status
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,

    -- Provider information
    provider VARCHAR(50), -- twilio, messagebird, etc.
    provider_message_id VARCHAR(255),
    provider_status VARCHAR(100),
    provider_cost DECIMAL(10, 4) DEFAULT 0,

    -- Response tracking
    clicked_links TEXT[], -- Array of clicked links
    replied BOOLEAN DEFAULT false,
    reply_content TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Campaigns table
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Campaign details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) DEFAULT 'bulk', -- bulk, drip, triggered, transactional

    -- Targeting
    list_id UUID REFERENCES lead_lists(id),
    segment_criteria JSONB DEFAULT '{}', -- For advanced segmentation
    target_count INTEGER DEFAULT 0,

    -- Content
    template_id UUID REFERENCES sms_templates(id),
    message_content TEXT NOT NULL,
    personalization_enabled BOOLEAN DEFAULT false,

    -- Scheduling
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, active, paused, completed, cancelled
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Performance metrics
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_opt_outs INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,

    -- Cost tracking
    total_cost DECIMAL(10, 2) DEFAULT 0,
    cost_per_message DECIMAL(10, 4) DEFAULT 0,

    -- Settings
    stop_on_reply BOOLEAN DEFAULT false,
    respect_quiet_hours BOOLEAN DEFAULT true, -- Don't send between 9pm-9am
    max_messages_per_day INTEGER DEFAULT 1000,

    -- Created by
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Templates table
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Template details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- welcome, promotional, reminder, alert, verification

    -- Content
    message_template TEXT NOT NULL,
    variables TEXT[], -- e.g., ['first_name', 'bonus_amount', 'promo_code']
    character_count INTEGER,
    segment_count INTEGER DEFAULT 1, -- SMS segments (160 chars per segment)

    -- Usage stats
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Compliance
    includes_opt_out BOOLEAN DEFAULT true,
    compliance_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES admin_users(id),
    approved_at TIMESTAMPTZ,

    -- Metadata
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Bonus Assignments table (tracks bonus assignments when leads convert)
CREATE TABLE IF NOT EXISTS lead_bonus_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- References
    lead_id UUID REFERENCES marketing_leads(id),
    player_id UUID NOT NULL, -- References users table
    list_id UUID REFERENCES lead_lists(id),

    -- Bonus details
    bonus_type VARCHAR(50) NOT NULL,
    bonus_amount DECIMAL(10, 2),
    bonus_percentage DECIMAL(5, 2),
    bonus_code VARCHAR(50),

    -- Assignment tracking
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    activated BOOLEAN DEFAULT false,
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, used, expired, cancelled

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Opt-outs table (compliance tracking)
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    opted_out_at TIMESTAMPTZ DEFAULT NOW(),
    opt_out_method VARCHAR(50), -- sms_reply, web_form, support, manual
    reason TEXT,

    -- Re-opt-in tracking
    opted_back_in BOOLEAN DEFAULT false,
    opted_in_at TIMESTAMPTZ,
    opt_in_method VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Schedule table (for drip campaigns)
CREATE TABLE IF NOT EXISTS campaign_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE CASCADE,

    -- Schedule details
    message_number INTEGER NOT NULL, -- Order in the sequence
    template_id UUID REFERENCES sms_templates(id),
    message_content TEXT NOT NULL,

    -- Timing
    delay_days INTEGER DEFAULT 0, -- Days after previous message
    delay_hours INTEGER DEFAULT 0, -- Hours after previous message
    send_time TIME, -- Specific time of day to send

    -- Conditions
    condition_type VARCHAR(50), -- always, if_no_reply, if_clicked, if_not_converted
    condition_data JSONB DEFAULT '{}',

    -- Status
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints after all tables are created
ALTER TABLE sms_messages
ADD CONSTRAINT fk_sms_messages_campaign
FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id) ON DELETE SET NULL;

ALTER TABLE sms_messages
ADD CONSTRAINT fk_sms_messages_template
FOREIGN KEY (template_id) REFERENCES sms_templates(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_marketing_leads_phone ON marketing_leads(phone_number);
CREATE INDEX idx_marketing_leads_status ON marketing_leads(status);
CREATE INDEX idx_marketing_leads_list_id ON marketing_leads(list_id);
CREATE INDEX idx_sms_messages_phone ON sms_messages(phone_number);
CREATE INDEX idx_sms_messages_campaign ON sms_messages(campaign_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX idx_lead_bonus_player ON lead_bonus_assignments(player_id);
CREATE INDEX idx_sms_opt_outs_phone ON sms_opt_outs(phone_number);

-- RLS Policies
ALTER TABLE lead_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_bonus_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_schedule ENABLE ROW LEVEL SECURITY;

-- Admin users can see everything
CREATE POLICY "Admin users can manage lead lists" ON lead_lists
    FOR ALL USING (true);

CREATE POLICY "Admin users can manage marketing leads" ON marketing_leads
    FOR ALL USING (true);

CREATE POLICY "Admin users can manage SMS messages" ON sms_messages
    FOR ALL USING (true);

CREATE POLICY "Admin users can manage SMS campaigns" ON sms_campaigns
    FOR ALL USING (true);

CREATE POLICY "Admin users can manage SMS templates" ON sms_templates
    FOR ALL USING (true);

CREATE POLICY "Admin users can manage lead bonuses" ON lead_bonus_assignments
    FOR ALL USING (true);

CREATE POLICY "Admin users can manage opt-outs" ON sms_opt_outs
    FOR ALL USING (true);

CREATE POLICY "Admin users can manage campaign schedules" ON campaign_schedule
    FOR ALL USING (true);

-- Helper function to check if phone number exists in opt-out list
CREATE OR REPLACE FUNCTION is_phone_opted_out(phone_number VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM sms_opt_outs
        WHERE sms_opt_outs.phone_number = $1
        AND opted_back_in = false
    );
END;
$$ LANGUAGE plpgsql;

-- Helper function to assign bonus when lead converts
CREATE OR REPLACE FUNCTION assign_lead_conversion_bonus()
RETURNS TRIGGER AS $$
DECLARE
    lead_record RECORD;
    list_record RECORD;
BEGIN
    -- Check if this is a new user registration
    IF TG_OP = 'INSERT' AND NEW.phone IS NOT NULL THEN
        -- Look for matching lead
        SELECT ml.*, ll.*
        INTO lead_record
        FROM marketing_leads ml
        JOIN lead_lists ll ON ml.list_id = ll.id
        WHERE ml.phone_number = NEW.phone
        AND ml.status != 'converted'
        AND ll.bonus_enabled = true
        ORDER BY ml.created_at DESC
        LIMIT 1;

        IF FOUND THEN
            -- Update lead status
            UPDATE marketing_leads
            SET status = 'converted',
                converted_at = NOW(),
                player_id = NEW.id
            WHERE id = lead_record.id;

            -- Create bonus assignment
            INSERT INTO lead_bonus_assignments (
                lead_id,
                player_id,
                list_id,
                bonus_type,
                bonus_amount,
                bonus_percentage,
                bonus_code,
                expires_at,
                status
            ) VALUES (
                lead_record.id,
                NEW.id,
                lead_record.list_id,
                lead_record.bonus_type,
                lead_record.bonus_amount,
                lead_record.bonus_percentage,
                lead_record.bonus_code,
                NOW() + INTERVAL '1 day' * COALESCE(lead_record.bonus_expiry_days, 7),
                'pending'
            );

            -- Create actual bonus in player_bonuses table
            IF lead_record.bonus_code IS NOT NULL THEN
                INSERT INTO player_bonuses (
                    user_id,
                    bonus_code,
                    bonus_amount,
                    status,
                    activated_at
                ) VALUES (
                    NEW.id,
                    lead_record.bonus_code,
                    lead_record.bonus_amount,
                    'active',
                    NOW()
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign bonus when user registers with phone from lead list
-- Note: This assumes the users table has a phone column
-- You may need to adjust based on your actual user table structure

-- Function to update campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
        -- Update campaign metrics based on message status changes
        IF NEW.campaign_id IS NOT NULL THEN
            IF NEW.status = 'delivered' THEN
                UPDATE sms_campaigns
                SET messages_delivered = messages_delivered + 1
                WHERE id = NEW.campaign_id;
            ELSIF NEW.status = 'failed' THEN
                UPDATE sms_campaigns
                SET messages_failed = messages_failed + 1
                WHERE id = NEW.campaign_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_campaign_metrics
AFTER UPDATE ON sms_messages
FOR EACH ROW
EXECUTE FUNCTION update_campaign_metrics();

-- Sample SMS templates
INSERT INTO sms_templates (name, category, message_template, variables, includes_opt_out) VALUES
('Welcome Bonus', 'welcome', 'Welcome to MyPokies {first_name}! 🎰 Your exclusive ${bonus_amount} bonus is waiting! Claim now: {link} Reply STOP to opt out', ARRAY['first_name', 'bonus_amount', 'link'], true),
('Deposit Match', 'promotional', 'Hey {first_name}! Get a {bonus_percentage}% match on your next deposit up to ${bonus_amount}! Use code: {promo_code} {link} Reply STOP to opt out', ARRAY['first_name', 'bonus_percentage', 'bonus_amount', 'promo_code', 'link'], true),
('Weekend Special', 'promotional', '🎉 Weekend Special at MyPokies! Deposit now for {bonus_percentage}% extra! Max bonus ${bonus_amount}. Play now: {link} Reply STOP to opt out', ARRAY['bonus_percentage', 'bonus_amount', 'link'], true),
('Inactive Player', 'reminder', 'We miss you at MyPokies {first_name}! Come back for a special ${bonus_amount} bonus just for you: {link} Reply STOP to opt out', ARRAY['first_name', 'bonus_amount', 'link'], true),
('VIP Exclusive', 'promotional', '💎 VIP EXCLUSIVE: {first_name}, your personal ${bonus_amount} bonus awaits! No deposit needed. Claim: {link} Reply STOP to opt out', ARRAY['first_name', 'bonus_amount', 'link'], true);

-- Comments for documentation
COMMENT ON TABLE lead_lists IS 'Stores marketing lead lists with bonus configuration';
COMMENT ON TABLE marketing_leads IS 'Individual marketing leads with conversion tracking';
COMMENT ON TABLE sms_messages IS 'All SMS communications with delivery tracking';
COMMENT ON TABLE sms_campaigns IS 'SMS marketing campaigns with performance metrics';
COMMENT ON TABLE sms_templates IS 'Reusable SMS message templates';
COMMENT ON TABLE lead_bonus_assignments IS 'Tracks automatic bonus assignments for converted leads';
COMMENT ON TABLE sms_opt_outs IS 'SMS opt-out list for compliance';
COMMENT ON TABLE campaign_schedule IS 'Scheduled messages for drip campaigns';