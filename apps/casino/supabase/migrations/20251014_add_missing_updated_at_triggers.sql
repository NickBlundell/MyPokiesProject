-- Migration: Add Missing Triggers for updated_at Columns
-- Purpose: Add auto-update triggers for updated_at columns to track when records change
-- Priority: 9/10
-- Estimated Time: 3 hours

BEGIN;

-- ============================================================================
-- STEP 1: Create or replace the update function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Add missing triggers for admin tables
-- ============================================================================

-- admin_users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_admin_users_updated_at'
        AND tgrelid = 'admin_users'::regclass
    ) THEN
        CREATE TRIGGER update_admin_users_updated_at
        BEFORE UPDATE ON admin_users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- player_notes table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_player_notes_updated_at'
        AND tgrelid = 'player_notes'::regclass
    ) THEN
        CREATE TRIGGER update_player_notes_updated_at
        BEFORE UPDATE ON player_notes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- player_segments table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_player_segments_updated_at'
        AND tgrelid = 'player_segments'::regclass
    ) THEN
        CREATE TRIGGER update_player_segments_updated_at
        BEFORE UPDATE ON player_segments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- marketing_campaigns table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_marketing_campaigns_updated_at'
        AND tgrelid = 'marketing_campaigns'::regclass
    ) THEN
        CREATE TRIGGER update_marketing_campaigns_updated_at
        BEFORE UPDATE ON marketing_campaigns
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- support_tickets table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_support_tickets_updated_at'
        AND tgrelid = 'support_tickets'::regclass
    ) THEN
        CREATE TRIGGER update_support_tickets_updated_at
        BEFORE UPDATE ON support_tickets
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- compliance_checks table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_compliance_checks_updated_at'
        AND tgrelid = 'compliance_checks'::regclass
    ) THEN
        CREATE TRIGGER update_compliance_checks_updated_at
        BEFORE UPDATE ON compliance_checks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- player_limits table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_player_limits_updated_at'
        AND tgrelid = 'player_limits'::regclass
    ) THEN
        CREATE TRIGGER update_player_limits_updated_at
        BEFORE UPDATE ON player_limits
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- scheduled_reports table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_scheduled_reports_updated_at'
        AND tgrelid = 'scheduled_reports'::regclass
    ) THEN
        CREATE TRIGGER update_scheduled_reports_updated_at
        BEFORE UPDATE ON scheduled_reports
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Add triggers for SMS/AI conversation tables
-- ============================================================================

-- sms_conversations table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_sms_conversations_updated_at'
        AND tgrelid = 'sms_conversations'::regclass
    ) THEN
        CREATE TRIGGER update_sms_conversations_updated_at
        BEFORE UPDATE ON sms_conversations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ai_message_logs table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_ai_message_logs_updated_at'
        AND tgrelid = 'ai_message_logs'::regclass
    ) THEN
        CREATE TRIGGER update_ai_message_logs_updated_at
        BEFORE UPDATE ON ai_message_logs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- conversion_events table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_conversion_events_updated_at'
        AND tgrelid = 'conversion_events'::regclass
    ) THEN
        CREATE TRIGGER update_conversion_events_updated_at
        BEFORE UPDATE ON conversion_events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ai_conversation_summaries table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_ai_conversation_summaries_updated_at'
        AND tgrelid = 'ai_conversation_summaries'::regclass
    ) THEN
        CREATE TRIGGER update_ai_conversation_summaries_updated_at
        BEFORE UPDATE ON ai_conversation_summaries
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ai_conversation_metrics table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_ai_conversation_metrics_updated_at'
        AND tgrelid = 'ai_conversation_metrics'::regclass
    ) THEN
        CREATE TRIGGER update_ai_conversation_metrics_updated_at
        BEFORE UPDATE ON ai_conversation_metrics
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Add triggers for SMS CRM tables
-- ============================================================================

-- sms_messages table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_sms_messages_updated_at'
        AND tgrelid = 'sms_messages'::regclass
    ) THEN
        CREATE TRIGGER update_sms_messages_updated_at
        BEFORE UPDATE ON sms_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- sms_campaigns table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_sms_campaigns_updated_at'
        AND tgrelid = 'sms_campaigns'::regclass
    ) THEN
        CREATE TRIGGER update_sms_campaigns_updated_at
        BEFORE UPDATE ON sms_campaigns
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- sms_templates table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_sms_templates_updated_at'
        AND tgrelid = 'sms_templates'::regclass
    ) THEN
        CREATE TRIGGER update_sms_templates_updated_at
        BEFORE UPDATE ON sms_templates
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- sms_blacklist table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_sms_blacklist_updated_at'
        AND tgrelid = 'sms_blacklist'::regclass
    ) THEN
        CREATE TRIGGER update_sms_blacklist_updated_at
        BEFORE UPDATE ON sms_blacklist
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- sms_opt_out table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_sms_opt_out_updated_at'
        AND tgrelid = 'sms_opt_out'::regclass
    ) THEN
        CREATE TRIGGER update_sms_opt_out_updated_at
        BEFORE UPDATE ON sms_opt_out
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- sms_webhooks table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_sms_webhooks_updated_at'
        AND tgrelid = 'sms_webhooks'::regclass
    ) THEN
        CREATE TRIGGER update_sms_webhooks_updated_at
        BEFORE UPDATE ON sms_webhooks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- sms_rate_limits table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_sms_rate_limits_updated_at'
        AND tgrelid = 'sms_rate_limits'::regclass
    ) THEN
        CREATE TRIGGER update_sms_rate_limits_updated_at
        BEFORE UPDATE ON sms_rate_limits
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Add triggers for AI auto-reply tables
-- ============================================================================

-- ai_auto_reply_settings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_ai_auto_reply_settings_updated_at'
        AND tgrelid = 'ai_auto_reply_settings'::regclass
    ) THEN
        CREATE TRIGGER update_ai_auto_reply_settings_updated_at
        BEFORE UPDATE ON ai_auto_reply_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Add triggers for AI engagement tables
-- ============================================================================

-- player_behavioral_analytics table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_player_behavioral_analytics_updated_at'
        AND tgrelid = 'player_behavioral_analytics'::regclass
    ) THEN
        CREATE TRIGGER update_player_behavioral_analytics_updated_at
        BEFORE UPDATE ON player_behavioral_analytics
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ai_outreach_messages table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_ai_outreach_messages_updated_at'
        AND tgrelid = 'ai_outreach_messages'::regclass
    ) THEN
        CREATE TRIGGER update_ai_outreach_messages_updated_at
        BEFORE UPDATE ON ai_outreach_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Add triggers for offered bonuses tracking
-- ============================================================================

-- ai_offered_bonuses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_ai_offered_bonuses_updated_at'
        AND tgrelid = 'ai_offered_bonuses'::regclass
    ) THEN
        CREATE TRIGGER update_ai_offered_bonuses_updated_at
        BEFORE UPDATE ON ai_offered_bonuses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Add triggers for archival tables
-- ============================================================================

-- archival_settings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_archival_settings_updated_at'
        AND tgrelid = 'archival_settings'::regclass
    ) THEN
        CREATE TRIGGER update_archival_settings_updated_at
        BEFORE UPDATE ON archival_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- STEP 9: Add triggers for advanced analytics tables
-- ============================================================================

-- player_funnel_events table (if it has updated_at)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'player_funnel_events'
        AND column_name = 'updated_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_player_funnel_events_updated_at'
        AND tgrelid = 'player_funnel_events'::regclass
    ) THEN
        CREATE TRIGGER update_player_funnel_events_updated_at
        BEFORE UPDATE ON player_funnel_events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION: List all tables with updated_at columns and their triggers
-- ============================================================================

DO $$
DECLARE
    v_table_name TEXT;
    v_has_trigger BOOLEAN;
    v_missing_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking tables with updated_at columns for triggers...';
    RAISE NOTICE '-----------------------------------------------------';

    FOR v_table_name IN (
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND c.column_name = 'updated_at'
        ORDER BY c.table_name
    )
    LOOP
        -- Check if trigger exists
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE c.relname = v_table_name
            AND t.tgname LIKE '%updated_at%'
        ) INTO v_has_trigger;

        IF v_has_trigger THEN
            RAISE NOTICE '✓ % - has updated_at trigger', v_table_name;
        ELSE
            RAISE WARNING '✗ % - MISSING updated_at trigger!', v_table_name;
            v_missing_count := v_missing_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '-----------------------------------------------------';
    IF v_missing_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All tables with updated_at columns have triggers!';
    ELSE
        RAISE WARNING 'Found % tables still missing updated_at triggers', v_missing_count;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (in case migration needs to be reverted)
-- ============================================================================
-- To rollback this migration, run:
/*
BEGIN;

-- Drop all the triggers created
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
DROP TRIGGER IF EXISTS update_player_notes_updated_at ON player_notes;
DROP TRIGGER IF EXISTS update_player_segments_updated_at ON player_segments;
DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON marketing_campaigns;
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
DROP TRIGGER IF EXISTS update_compliance_checks_updated_at ON compliance_checks;
DROP TRIGGER IF EXISTS update_player_limits_updated_at ON player_limits;
DROP TRIGGER IF EXISTS update_scheduled_reports_updated_at ON scheduled_reports;
DROP TRIGGER IF EXISTS update_sms_conversations_updated_at ON sms_conversations;
DROP TRIGGER IF EXISTS update_ai_message_logs_updated_at ON ai_message_logs;
DROP TRIGGER IF EXISTS update_conversion_events_updated_at ON conversion_events;
DROP TRIGGER IF EXISTS update_ai_conversation_summaries_updated_at ON ai_conversation_summaries;
DROP TRIGGER IF EXISTS update_ai_conversation_metrics_updated_at ON ai_conversation_metrics;
DROP TRIGGER IF EXISTS update_sms_messages_updated_at ON sms_messages;
DROP TRIGGER IF EXISTS update_sms_campaigns_updated_at ON sms_campaigns;
DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON sms_templates;
DROP TRIGGER IF EXISTS update_sms_blacklist_updated_at ON sms_blacklist;
DROP TRIGGER IF EXISTS update_sms_opt_out_updated_at ON sms_opt_out;
DROP TRIGGER IF EXISTS update_sms_webhooks_updated_at ON sms_webhooks;
DROP TRIGGER IF EXISTS update_sms_rate_limits_updated_at ON sms_rate_limits;
DROP TRIGGER IF EXISTS update_ai_auto_reply_settings_updated_at ON ai_auto_reply_settings;
DROP TRIGGER IF EXISTS update_player_behavioral_analytics_updated_at ON player_behavioral_analytics;
DROP TRIGGER IF EXISTS update_ai_outreach_messages_updated_at ON ai_outreach_messages;
DROP TRIGGER IF EXISTS update_ai_offered_bonuses_updated_at ON ai_offered_bonuses;
DROP TRIGGER IF EXISTS update_archival_settings_updated_at ON archival_settings;
DROP TRIGGER IF EXISTS update_player_funnel_events_updated_at ON player_funnel_events;

COMMIT;
*/