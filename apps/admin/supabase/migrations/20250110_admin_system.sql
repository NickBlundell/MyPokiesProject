-- Admin System Database Schema for MyPokies Admin Panel
-- This migration adds admin-specific tables to the existing MyPokies database

-- ============================================================================
-- Admin Users & Roles
-- ============================================================================

-- Admin roles enum
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'support', 'marketing', 'finance');

-- Admin users table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role admin_role NOT NULL DEFAULT 'support',
    permissions TEXT[] DEFAULT '{}',
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    last_ip INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);

-- Admin sessions table for tracking active sessions
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token_hash);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Admin audit logs table
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON admin_audit_logs(created_at DESC);

-- ============================================================================
-- CRM & Player Management
-- ============================================================================

-- Player notes table
CREATE TABLE player_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'support', 'compliance', 'vip', 'marketing')),
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes not visible to support staff
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_notes_player ON player_notes(player_id);
CREATE INDEX idx_player_notes_admin ON player_notes(admin_user_id);
CREATE INDEX idx_player_notes_category ON player_notes(category);
CREATE INDEX idx_player_notes_created ON player_notes(created_at DESC);

-- Player tags for segmentation
CREATE TABLE player_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    added_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, tag)
);

CREATE INDEX idx_player_tags_player ON player_tags(player_id);
CREATE INDEX idx_player_tags_tag ON player_tags(tag);

-- Player segments for marketing
CREATE TABLE player_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- Stores segment criteria as JSON
    is_dynamic BOOLEAN DEFAULT TRUE, -- Dynamic segments update automatically
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_segments_name ON player_segments(name);
CREATE INDEX idx_segments_dynamic ON player_segments(is_dynamic);

-- Player segment members (for static segments)
CREATE TABLE player_segment_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id UUID REFERENCES player_segments(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(segment_id, player_id)
);

CREATE INDEX idx_segment_members_segment ON player_segment_members(segment_id);
CREATE INDEX idx_segment_members_player ON player_segment_members(player_id);

-- ============================================================================
-- Marketing Campaigns
-- ============================================================================

-- Marketing campaigns table
CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
    segment_id UUID REFERENCES player_segments(id) ON DELETE SET NULL,
    content JSONB NOT NULL, -- Email/SMS content with templates
    schedule JSONB, -- Scheduling information
    metrics JSONB, -- Campaign performance metrics
    budget DECIMAL(20, 2),
    spent DECIMAL(20, 2) DEFAULT 0,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_campaigns_type ON marketing_campaigns(type);
CREATE INDEX idx_campaigns_segment ON marketing_campaigns(segment_id);
CREATE INDEX idx_campaigns_scheduled ON marketing_campaigns(scheduled_at);

-- Campaign sends tracking
CREATE TABLE campaign_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'failed', 'bounced')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    revenue_generated DECIMAL(20, 2),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_player ON campaign_sends(player_id);
CREATE INDEX idx_campaign_sends_status ON campaign_sends(status);

-- ============================================================================
-- Support System
-- ============================================================================

-- Support tickets table
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(100),
    assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_tickets_player ON support_tickets(player_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_created ON support_tickets(created_at DESC);

-- Ticket messages
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('player', 'admin')),
    sender_id UUID, -- References either player or admin user
    message TEXT NOT NULL,
    attachments JSONB,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes between support staff
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_sender ON ticket_messages(sender_id);

-- ============================================================================
-- Compliance & Risk Management
-- ============================================================================

-- Compliance checks table
CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('kyc', 'aml', 'source_of_funds', 'pep', 'sanctions')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'manual_review', 'expired')),
    provider VARCHAR(100), -- External provider used for the check
    result JSONB, -- Detailed check results
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    notes TEXT,
    documents JSONB, -- Document URLs/references
    checked_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_player ON compliance_checks(player_id);
CREATE INDEX idx_compliance_type ON compliance_checks(check_type);
CREATE INDEX idx_compliance_status ON compliance_checks(status);
CREATE INDEX idx_compliance_expires ON compliance_checks(expires_at);

-- Player limits for responsible gaming
CREATE TABLE player_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    limit_type VARCHAR(50) NOT NULL CHECK (limit_type IN ('deposit_daily', 'deposit_weekly', 'deposit_monthly', 'loss_daily', 'loss_weekly', 'loss_monthly', 'session_time', 'self_exclusion')),
    limit_value DECIMAL(20, 2),
    current_value DECIMAL(20, 2) DEFAULT 0,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    set_by VARCHAR(50) CHECK (set_by IN ('player', 'admin', 'system')),
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, limit_type)
);

CREATE INDEX idx_player_limits_player ON player_limits(player_id);
CREATE INDEX idx_player_limits_type ON player_limits(limit_type);
CREATE INDEX idx_player_limits_expires ON player_limits(expires_at);

-- ============================================================================
-- Analytics & Reporting
-- ============================================================================

-- Scheduled reports configuration
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    parameters JSONB,
    format VARCHAR(20) DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv')),
    schedule JSONB NOT NULL, -- Cron expression or schedule details
    recipients TEXT[], -- Email addresses
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_active ON scheduled_reports(is_active);
CREATE INDEX idx_reports_next_run ON scheduled_reports(next_run_at);

-- Report runs history
CREATE TABLE report_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    file_url TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_runs_report ON report_runs(report_id);
CREATE INDEX idx_report_runs_status ON report_runs(status);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_user_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id VARCHAR,
    p_details JSONB,
    p_ip_address INET,
    p_user_agent TEXT
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO admin_audit_logs (
        admin_user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        p_admin_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check admin permissions
CREATE OR REPLACE FUNCTION check_admin_permission(
    p_admin_user_id UUID,
    p_permission VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_role admin_role;
    v_permissions TEXT[];
BEGIN
    SELECT role, permissions INTO v_role, v_permissions
    FROM admin_users
    WHERE id = p_admin_user_id AND is_active = TRUE;

    -- Super admins have all permissions
    IF v_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    -- Check specific permission in array
    RETURN p_permission = ANY(v_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

-- Admin users can only be managed by super admins
CREATE POLICY "Super admins can manage admin users"
    ON admin_users FOR ALL
    USING (auth.uid() IN (SELECT id FROM admin_users WHERE role = 'super_admin'));

-- All authenticated admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON admin_audit_logs FOR SELECT
    USING (auth.uid() IN (SELECT id FROM admin_users WHERE is_active = TRUE));

-- Player notes based on role
CREATE POLICY "Admins can manage player notes"
    ON player_notes FOR ALL
    USING (auth.uid() IN (SELECT id FROM admin_users WHERE is_active = TRUE));

-- Marketing campaigns based on role
CREATE POLICY "Marketing team can manage campaigns"
    ON marketing_campaigns FOR ALL
    USING (auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('super_admin', 'admin', 'marketing')));

-- Support tickets based on role
CREATE POLICY "Support team can manage tickets"
    ON support_tickets FOR ALL
    USING (auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('super_admin', 'admin', 'support')));

-- Compliance checks based on role
CREATE POLICY "Compliance team can manage checks"
    ON compliance_checks FOR ALL
    USING (auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('super_admin', 'admin')));

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_players_status_kyc ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_transactions_player_date ON transactions(user_id, created_at DESC);
CREATE INDEX idx_campaign_sends_campaign_status ON campaign_sends(campaign_id, status);

-- ============================================================================
-- Initial Admin User (for setup)
-- ============================================================================

-- Note: Password should be changed immediately after first login
-- Default password: AdminPassword123! (hashed with bcrypt)
INSERT INTO admin_users (
    email,
    full_name,
    role,
    password_hash,
    permissions
) VALUES (
    'admin@mypokies.com',
    'System Administrator',
    'super_admin',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
    ARRAY['all']
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE admin_users IS 'Admin panel users with role-based access control';
COMMENT ON TABLE admin_audit_logs IS 'Audit trail of all admin actions';
COMMENT ON TABLE player_notes IS 'Internal notes about players for CRM';
COMMENT ON TABLE player_segments IS 'Player segments for targeted marketing';
COMMENT ON TABLE marketing_campaigns IS 'Marketing campaign management';
COMMENT ON TABLE support_tickets IS 'Customer support ticket system';
COMMENT ON TABLE compliance_checks IS 'KYC/AML and compliance check records';
COMMENT ON TABLE player_limits IS 'Responsible gaming limits for players';