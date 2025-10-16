-- Phase 1: Critical Database Fixes - Admin Player Actions Tracking
-- Migration Date: 2025-01-14
-- Purpose: Track all admin actions performed on player accounts

-- ============================================================================
-- PART 1: Admin Player Actions Table
-- ============================================================================

-- This table tracks specific admin actions on player accounts
-- Links to admin_audit_logs for full audit trail
CREATE TABLE IF NOT EXISTS admin_player_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    audit_log_id UUID REFERENCES admin_audit_logs(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,

    -- Action details
    action_type VARCHAR(100) NOT NULL,
    action_category VARCHAR(50) NOT NULL CHECK (
        action_category IN (
            'account_management',
            'balance_adjustment',
            'bonus_management',
            'compliance',
            'limits',
            'support',
            'vip_management',
            'fraud_investigation'
        )
    ),

    -- Change tracking
    field_changed VARCHAR(100),
    before_value JSONB,
    after_value JSONB,
    change_delta JSONB, -- Calculated difference for numeric fields

    -- Context
    reason TEXT NOT NULL,
    notes TEXT,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- Impact tracking
    financial_impact DECIMAL(20,2), -- If action affects balance
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_player_actions_player ON admin_player_actions(player_id);
CREATE INDEX idx_admin_player_actions_admin ON admin_player_actions(admin_user_id);
CREATE INDEX idx_admin_player_actions_type ON admin_player_actions(action_type);
CREATE INDEX idx_admin_player_actions_category ON admin_player_actions(action_category);
CREATE INDEX idx_admin_player_actions_created ON admin_player_actions(created_at DESC);
CREATE INDEX idx_admin_player_actions_risk ON admin_player_actions(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_admin_player_actions_financial ON admin_player_actions(financial_impact) WHERE financial_impact IS NOT NULL;

-- ============================================================================
-- PART 2: Row Level Security
-- ============================================================================

ALTER TABLE admin_player_actions ENABLE ROW LEVEL SECURITY;

-- Admin users can view all actions
CREATE POLICY "Admin users can view all player actions"
    ON admin_player_actions FOR SELECT
    USING (true);

-- Service role can manage all
CREATE POLICY "Service role can manage player actions"
    ON admin_player_actions FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 3: Helper Functions
-- ============================================================================

-- Function to log admin player action
CREATE OR REPLACE FUNCTION log_admin_player_action(
    p_player_id UUID,
    p_admin_user_id UUID,
    p_action_type VARCHAR,
    p_action_category VARCHAR,
    p_reason TEXT,
    p_field_changed VARCHAR DEFAULT NULL,
    p_before_value JSONB DEFAULT NULL,
    p_after_value JSONB DEFAULT NULL,
    p_financial_impact DECIMAL DEFAULT NULL,
    p_risk_level VARCHAR DEFAULT 'low',
    p_notes TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_action_id UUID;
    v_audit_log_id UUID;
    v_delta JSONB;
BEGIN
    -- Calculate delta for numeric values
    IF p_before_value IS NOT NULL AND p_after_value IS NOT NULL THEN
        BEGIN
            v_delta := jsonb_build_object(
                'difference', (p_after_value::text::numeric - p_before_value::text::numeric),
                'percentage_change',
                CASE
                    WHEN p_before_value::text::numeric != 0
                    THEN ((p_after_value::text::numeric - p_before_value::text::numeric) / p_before_value::text::numeric * 100)
                    ELSE NULL
                END
            );
        EXCEPTION WHEN OTHERS THEN
            v_delta := NULL;
        END;
    END IF;

    -- Create audit log entry first
    INSERT INTO admin_audit_logs (
        admin_user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address
    ) VALUES (
        p_admin_user_id,
        p_action_type,
        'player',
        p_player_id::TEXT,
        jsonb_build_object(
            'field_changed', p_field_changed,
            'before', p_before_value,
            'after', p_after_value,
            'reason', p_reason,
            'financial_impact', p_financial_impact
        ),
        p_ip_address
    ) RETURNING id INTO v_audit_log_id;

    -- Create player action record
    INSERT INTO admin_player_actions (
        audit_log_id,
        player_id,
        admin_user_id,
        action_type,
        action_category,
        field_changed,
        before_value,
        after_value,
        change_delta,
        reason,
        notes,
        financial_impact,
        risk_level,
        ip_address
    ) VALUES (
        v_audit_log_id,
        p_player_id,
        p_admin_user_id,
        p_action_type,
        p_action_category,
        p_field_changed,
        p_before_value,
        p_after_value,
        v_delta,
        p_reason,
        p_notes,
        p_financial_impact,
        p_risk_level,
        p_ip_address
    ) RETURNING id INTO v_action_id;

    -- Send notification for high-risk actions
    IF p_risk_level IN ('high', 'critical') THEN
        -- Could integrate with notification system here
        RAISE NOTICE 'High-risk action logged: % on player %', p_action_type, p_player_id;
    END IF;

    RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_admin_player_action TO service_role;

-- ============================================================================
-- PART 4: Player Action History View
-- ============================================================================

-- View to get formatted player action history
CREATE OR REPLACE VIEW player_action_history AS
SELECT
    apa.id,
    apa.player_id,
    u.external_user_id,
    u.email as player_email,
    apa.admin_user_id,
    au.full_name as admin_name,
    au.email as admin_email,
    apa.action_type,
    apa.action_category,
    apa.field_changed,
    apa.before_value,
    apa.after_value,
    apa.change_delta,
    apa.reason,
    apa.notes,
    apa.financial_impact,
    apa.risk_level,
    apa.requires_approval,
    apa.approved_by,
    approver.full_name as approved_by_name,
    apa.approved_at,
    apa.created_at,
    -- Format change description
    CASE
        WHEN apa.field_changed IS NOT NULL THEN
            apa.field_changed || ' changed from ' ||
            COALESCE(apa.before_value::text, 'NULL') || ' to ' ||
            COALESCE(apa.after_value::text, 'NULL')
        ELSE
            apa.action_type
    END as change_description
FROM admin_player_actions apa
LEFT JOIN users u ON apa.player_id = u.id
LEFT JOIN admin_users au ON apa.admin_user_id = au.id
LEFT JOIN admin_users approver ON apa.approved_by = approver.id;

GRANT SELECT ON player_action_history TO service_role;

-- ============================================================================
-- PART 5: Action Summary Functions
-- ============================================================================

-- Get player action summary
CREATE OR REPLACE FUNCTION get_player_action_summary(
    p_player_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    action_category VARCHAR,
    action_count BIGINT,
    last_action_at TIMESTAMPTZ,
    total_financial_impact DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        apa.action_category,
        COUNT(*) as action_count,
        MAX(apa.created_at) as last_action_at,
        SUM(apa.financial_impact) as total_financial_impact
    FROM admin_player_actions apa
    WHERE apa.player_id = p_player_id
    AND apa.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY apa.action_category
    ORDER BY action_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_player_action_summary(UUID, INTEGER) TO service_role;

-- Get admin action summary
CREATE OR REPLACE FUNCTION get_admin_action_summary(
    p_admin_user_id UUID,
    p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
    action_type VARCHAR,
    action_count BIGINT,
    affected_players BIGINT,
    total_financial_impact DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        apa.action_type,
        COUNT(*) as action_count,
        COUNT(DISTINCT apa.player_id) as affected_players,
        SUM(apa.financial_impact) as total_financial_impact
    FROM admin_player_actions apa
    WHERE apa.admin_user_id = p_admin_user_id
    AND apa.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY apa.action_type
    ORDER BY action_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_admin_action_summary(UUID, INTEGER) TO service_role;

-- ============================================================================
-- PART 6: Trigger for Auto-Risk Assessment
-- ============================================================================

-- Automatically assess risk level for certain actions
CREATE OR REPLACE FUNCTION auto_assess_action_risk()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-set risk level if not provided
    IF NEW.risk_level IS NULL THEN
        -- High-risk actions
        IF NEW.action_category IN ('balance_adjustment', 'compliance') THEN
            NEW.risk_level := 'high';
        -- Medium-risk actions
        ELSIF NEW.action_category IN ('bonus_management', 'limits') THEN
            NEW.risk_level := 'medium';
        -- Low-risk actions
        ELSE
            NEW.risk_level := 'low';
        END IF;
    END IF;

    -- Require approval for high-risk actions
    IF NEW.risk_level IN ('high', 'critical') THEN
        NEW.requires_approval := TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assess_action_risk_before_insert
    BEFORE INSERT ON admin_player_actions
    FOR EACH ROW
    EXECUTE FUNCTION auto_assess_action_risk();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE admin_player_actions IS 'Tracks all admin actions performed on player accounts with full audit trail';
COMMENT ON COLUMN admin_player_actions.action_category IS 'Category of action for grouping and filtering';
COMMENT ON COLUMN admin_player_actions.change_delta IS 'Calculated difference for numeric field changes';
COMMENT ON COLUMN admin_player_actions.financial_impact IS 'Financial impact of action (positive or negative)';
COMMENT ON COLUMN admin_player_actions.risk_level IS 'Risk level of action (auto-assessed or manual)';
COMMENT ON FUNCTION log_admin_player_action IS 'Helper function to log admin actions on player accounts';
COMMENT ON VIEW player_action_history IS 'Formatted view of player action history with admin details';
