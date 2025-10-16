-- Phase 2: Email Communication Tracking
-- Migration Date: 2025-01-14
-- Purpose: Track email campaigns and individual email sends for marketing analytics

-- ============================================================================
-- PART 1: Email Campaigns Table
-- ============================================================================

-- This table tracks email marketing campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Campaign details
    campaign_name VARCHAR(200) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL CHECK (
        campaign_type IN (
            'promotional',
            'transactional',
            'retention',
            'reactivation',
            'vip',
            'newsletter',
            'bonus_offer',
            'system'
        )
    ),

    -- Email content
    subject_line TEXT NOT NULL,
    preview_text TEXT,
    email_template_id UUID, -- Reference to template system if exists

    -- Targeting
    target_segment VARCHAR(100), -- 'all', 'vip', 'inactive_30d', etc.
    target_criteria JSONB, -- Detailed targeting rules

    -- Bonus/Offer details (if applicable)
    bonus_offer_id UUID REFERENCES bonus_offers(id) ON DELETE SET NULL,

    -- Scheduling
    scheduled_send_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (
        status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')
    ),

    -- Statistics (cached for performance)
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(20,2) DEFAULT 0,

    -- Calculated metrics
    open_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_delivered > 0
        THEN (total_opened::DECIMAL / total_delivered * 100)
        ELSE 0 END
    ) STORED,
    click_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_delivered > 0
        THEN (total_clicked::DECIMAL / total_delivered * 100)
        ELSE 0 END
    ) STORED,
    conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_delivered > 0
        THEN (total_conversions::DECIMAL / total_delivered * 100)
        ELSE 0 END
    ) STORED,

    -- Metadata
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_send_at) WHERE status = 'scheduled';
CREATE INDEX idx_email_campaigns_bonus ON email_campaigns(bonus_offer_id) WHERE bonus_offer_id IS NOT NULL;
CREATE INDEX idx_email_campaigns_created ON email_campaigns(created_at DESC);

-- ============================================================================
-- PART 2: Email Sends Table
-- ============================================================================

-- This table tracks individual email sends to players
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Email details
    recipient_email VARCHAR(255) NOT NULL,
    subject_line TEXT NOT NULL,

    -- Personalization
    personalization_data JSONB, -- Variables used in template

    -- Delivery tracking
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    bounce_reason TEXT,
    bounce_type VARCHAR(20), -- 'hard', 'soft', 'complaint'

    -- Engagement tracking
    opened_at TIMESTAMPTZ,
    first_click_at TIMESTAMPTZ,
    click_count INTEGER DEFAULT 0,
    links_clicked JSONB, -- Array of clicked links with timestamps

    -- Conversion tracking
    converted_at TIMESTAMPTZ,
    conversion_type VARCHAR(50), -- 'deposit', 'bonus_claim', 'wager', etc.
    conversion_value DECIMAL(20,2),

    -- Unsubscribe tracking
    unsubscribed_at TIMESTAMPTZ,
    unsubscribe_reason TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'sent',
            'delivered',
            'opened',
            'clicked',
            'converted',
            'bounced',
            'unsubscribed',
            'failed'
        )
    ),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_email_sends_player ON email_sends(player_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);
CREATE INDEX idx_email_sends_sent ON email_sends(sent_at DESC);
CREATE INDEX idx_email_sends_opened ON email_sends(opened_at DESC) WHERE opened_at IS NOT NULL;
CREATE INDEX idx_email_sends_converted ON email_sends(converted_at DESC) WHERE converted_at IS NOT NULL;
CREATE INDEX idx_email_sends_bounced ON email_sends(bounced_at, bounce_type) WHERE bounced_at IS NOT NULL;

-- Composite index for campaign performance queries
CREATE INDEX idx_email_sends_campaign_engagement
    ON email_sends(campaign_id, status, converted_at);

-- ============================================================================
-- PART 3: Row Level Security
-- ============================================================================

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Admin users can view all campaigns and sends
CREATE POLICY "Admin users can view email campaigns"
    ON email_campaigns FOR SELECT
    USING (true);

CREATE POLICY "Admin users can view email sends"
    ON email_sends FOR SELECT
    USING (true);

-- Service role can manage all
CREATE POLICY "Service role can manage email campaigns"
    ON email_campaigns FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage email sends"
    ON email_sends FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 4: Helper Functions
-- ============================================================================

-- Function to update campaign statistics
CREATE OR REPLACE FUNCTION update_campaign_stats(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE email_campaigns
    SET
        total_sent = (
            SELECT COUNT(*) FROM email_sends
            WHERE campaign_id = p_campaign_id AND sent_at IS NOT NULL
        ),
        total_delivered = (
            SELECT COUNT(*) FROM email_sends
            WHERE campaign_id = p_campaign_id AND delivered_at IS NOT NULL
        ),
        total_bounced = (
            SELECT COUNT(*) FROM email_sends
            WHERE campaign_id = p_campaign_id AND bounced_at IS NOT NULL
        ),
        total_opened = (
            SELECT COUNT(*) FROM email_sends
            WHERE campaign_id = p_campaign_id AND opened_at IS NOT NULL
        ),
        total_clicked = (
            SELECT COUNT(*) FROM email_sends
            WHERE campaign_id = p_campaign_id AND first_click_at IS NOT NULL
        ),
        total_conversions = (
            SELECT COUNT(*) FROM email_sends
            WHERE campaign_id = p_campaign_id AND converted_at IS NOT NULL
        ),
        total_revenue = (
            SELECT COALESCE(SUM(conversion_value), 0) FROM email_sends
            WHERE campaign_id = p_campaign_id AND converted_at IS NOT NULL
        ),
        updated_at = NOW()
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_campaign_stats(UUID) TO service_role;

-- Function to track email open
CREATE OR REPLACE FUNCTION track_email_open(p_email_send_id UUID)
RETURNS VOID AS $$
DECLARE
    v_campaign_id UUID;
BEGIN
    UPDATE email_sends
    SET
        opened_at = COALESCE(opened_at, NOW()),
        status = CASE
            WHEN status NOT IN ('clicked', 'converted', 'unsubscribed') THEN 'opened'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_email_send_id
    RETURNING campaign_id INTO v_campaign_id;

    -- Update campaign stats
    IF v_campaign_id IS NOT NULL THEN
        PERFORM update_campaign_stats(v_campaign_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_email_open(UUID) TO service_role;

-- Function to track email click
CREATE OR REPLACE FUNCTION track_email_click(
    p_email_send_id UUID,
    p_link_url TEXT
)
RETURNS VOID AS $$
DECLARE
    v_campaign_id UUID;
    v_links_clicked JSONB;
BEGIN
    -- Get current links clicked
    SELECT links_clicked INTO v_links_clicked
    FROM email_sends
    WHERE id = p_email_send_id;

    -- Append new click
    v_links_clicked := COALESCE(v_links_clicked, '[]'::JSONB) ||
        jsonb_build_object(
            'url', p_link_url,
            'clicked_at', NOW()
        );

    -- Update email send
    UPDATE email_sends
    SET
        first_click_at = COALESCE(first_click_at, NOW()),
        click_count = click_count + 1,
        links_clicked = v_links_clicked,
        opened_at = COALESCE(opened_at, NOW()), -- Clicking implies opening
        status = CASE
            WHEN status NOT IN ('converted', 'unsubscribed') THEN 'clicked'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_email_send_id
    RETURNING campaign_id INTO v_campaign_id;

    -- Update campaign stats
    IF v_campaign_id IS NOT NULL THEN
        PERFORM update_campaign_stats(v_campaign_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_email_click(UUID, TEXT) TO service_role;

-- Function to track email conversion
CREATE OR REPLACE FUNCTION track_email_conversion(
    p_email_send_id UUID,
    p_conversion_type VARCHAR,
    p_conversion_value DECIMAL DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_campaign_id UUID;
BEGIN
    UPDATE email_sends
    SET
        converted_at = NOW(),
        conversion_type = p_conversion_type,
        conversion_value = p_conversion_value,
        status = 'converted',
        updated_at = NOW()
    WHERE id = p_email_send_id
    RETURNING campaign_id INTO v_campaign_id;

    -- Update campaign stats
    IF v_campaign_id IS NOT NULL THEN
        PERFORM update_campaign_stats(v_campaign_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_email_conversion(UUID, VARCHAR, DECIMAL) TO service_role;

-- ============================================================================
-- PART 5: Campaign Performance View
-- ============================================================================

CREATE OR REPLACE VIEW email_campaign_performance AS
SELECT
    ec.id as campaign_id,
    ec.campaign_name,
    ec.campaign_type,
    ec.subject_line,
    ec.status,
    ec.sent_at,

    -- Volume metrics
    ec.total_recipients,
    ec.total_sent,
    ec.total_delivered,
    ec.total_bounced,

    -- Engagement metrics
    ec.total_opened,
    ec.total_clicked,
    ec.total_unsubscribed,
    ec.open_rate,
    ec.click_rate,

    -- Conversion metrics
    ec.total_conversions,
    ec.conversion_rate,
    ec.total_revenue,

    -- Revenue per send
    CASE WHEN ec.total_delivered > 0
        THEN ec.total_revenue / ec.total_delivered
        ELSE 0
    END as revenue_per_send,

    -- Engagement score (weighted metric)
    (
        (ec.open_rate * 0.3) +
        (ec.click_rate * 0.4) +
        (ec.conversion_rate * 0.3)
    ) as engagement_score,

    -- Time metrics
    ec.created_at,
    ec.created_by,

    -- Creator details
    au.full_name as created_by_name
FROM email_campaigns ec
LEFT JOIN admin_users au ON ec.created_by = au.id;

GRANT SELECT ON email_campaign_performance TO service_role;

-- ============================================================================
-- PART 6: Player Email Stats View
-- ============================================================================

-- View showing email engagement stats per player
CREATE OR REPLACE VIEW player_email_stats AS
SELECT
    es.player_id,
    u.email as player_email,

    -- Volume
    COUNT(*) as total_emails_received,
    COUNT(*) FILTER (WHERE es.delivered_at IS NOT NULL) as total_delivered,
    COUNT(*) FILTER (WHERE es.bounced_at IS NOT NULL) as total_bounced,

    -- Engagement
    COUNT(*) FILTER (WHERE es.opened_at IS NOT NULL) as total_opened,
    COUNT(*) FILTER (WHERE es.first_click_at IS NOT NULL) as total_clicked,
    COUNT(*) FILTER (WHERE es.converted_at IS NOT NULL) as total_conversions,

    -- Rates
    CASE WHEN COUNT(*) FILTER (WHERE es.delivered_at IS NOT NULL) > 0
        THEN (COUNT(*) FILTER (WHERE es.opened_at IS NOT NULL)::DECIMAL /
              COUNT(*) FILTER (WHERE es.delivered_at IS NOT NULL) * 100)
        ELSE 0
    END as open_rate,

    CASE WHEN COUNT(*) FILTER (WHERE es.delivered_at IS NOT NULL) > 0
        THEN (COUNT(*) FILTER (WHERE es.first_click_at IS NOT NULL)::DECIMAL /
              COUNT(*) FILTER (WHERE es.delivered_at IS NOT NULL) * 100)
        ELSE 0
    END as click_rate,

    -- Revenue
    SUM(es.conversion_value) as total_conversion_value,

    -- Last engagement
    MAX(es.sent_at) as last_email_sent,
    MAX(es.opened_at) as last_email_opened,
    MAX(es.first_click_at) as last_email_clicked,

    -- Unsubscribe status
    MAX(es.unsubscribed_at) as unsubscribed_at,

    -- Engagement level
    CASE
        WHEN COUNT(*) FILTER (WHERE es.opened_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0) > 0.5
            THEN 'highly_engaged'
        WHEN COUNT(*) FILTER (WHERE es.opened_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0) > 0.2
            THEN 'engaged'
        WHEN COUNT(*) FILTER (WHERE es.opened_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0) > 0
            THEN 'low_engagement'
        ELSE 'no_engagement'
    END as engagement_level

FROM email_sends es
LEFT JOIN users u ON es.player_id = u.id
GROUP BY es.player_id, u.email;

GRANT SELECT ON player_email_stats TO service_role;

-- ============================================================================
-- PART 7: Trigger for Updated At
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER update_email_sends_updated_at
    BEFORE UPDATE ON email_sends
    FOR EACH ROW
    EXECUTE FUNCTION update_email_updated_at();

-- ============================================================================
-- PART 8: Data Cleanup Function
-- ============================================================================

-- Function to clean up old email tracking data
CREATE OR REPLACE FUNCTION cleanup_old_email_data(
    p_days_to_keep INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete old email sends for completed campaigns older than specified days
    DELETE FROM email_sends
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
    AND campaign_id IN (
        SELECT id FROM email_campaigns WHERE status = 'sent'
    );

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE 'Cleaned up % old email send records', v_deleted_count;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_old_email_data(INTEGER) TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE email_campaigns IS 'Tracks email marketing campaigns with performance metrics';
COMMENT ON TABLE email_sends IS 'Tracks individual email sends to players with engagement tracking';
COMMENT ON COLUMN email_campaigns.target_criteria IS 'JSONB field containing detailed targeting rules for campaign recipients';
COMMENT ON COLUMN email_sends.personalization_data IS 'JSONB field containing template variables used for email personalization';
COMMENT ON COLUMN email_sends.links_clicked IS 'JSONB array tracking all links clicked with timestamps';
COMMENT ON FUNCTION update_campaign_stats(UUID) IS 'Updates cached campaign statistics from email_sends data';
COMMENT ON FUNCTION track_email_open(UUID) IS 'Records an email open event and updates campaign stats';
COMMENT ON FUNCTION track_email_click(UUID, TEXT) IS 'Records an email click event with link URL';
COMMENT ON FUNCTION track_email_conversion(UUID, VARCHAR, DECIMAL) IS 'Records a conversion event from an email campaign';
COMMENT ON VIEW email_campaign_performance IS 'Comprehensive campaign performance metrics for reporting';
COMMENT ON VIEW player_email_stats IS 'Player-level email engagement statistics';

-- Output summary
DO $$
DECLARE
    v_campaign_count INTEGER;
    v_send_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_campaign_count FROM email_campaigns;
    SELECT COUNT(*) INTO v_send_count FROM email_sends;

    RAISE NOTICE '==========================================='
    RAISE NOTICE 'Email Tracking Migration Completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Email campaigns in database: %', v_campaign_count;
    RAISE NOTICE 'Email sends in database: %', v_send_count;
    RAISE NOTICE 'Run SELECT * FROM email_campaign_performance; to view campaign stats';
    RAISE NOTICE 'Run SELECT * FROM player_email_stats; to view player engagement';
END $$;
