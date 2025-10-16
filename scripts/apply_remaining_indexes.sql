-- ============================================
-- BATCH APPLY REMAINING FOREIGN KEY INDEXES
-- Run each CREATE INDEX statement separately
-- ============================================

-- Additional transaction-related indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_round_actions_transaction_id
  ON round_actions(transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotion_wins_transaction_id
  ON promotion_wins(transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loyalty_points_related_transaction
  ON loyalty_points_transactions(related_transaction_id)
  WHERE related_transaction_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_winners_transaction_id
  ON jackpot_winners(credited_transaction_id)
  WHERE credited_transaction_id IS NOT NULL;

-- Admin-related indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_player_actions_approved_by
  ON admin_player_actions(approved_by)
  WHERE approved_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_player_actions_audit_log
  ON admin_player_actions(audit_log_id)
  WHERE audit_log_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_checks_checked_by
  ON compliance_checks(checked_by)
  WHERE checked_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_limits_admin_user
  ON player_limits(admin_user_id)
  WHERE admin_user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_tags_added_by
  ON player_tags(added_by)
  WHERE added_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_resolved_by
  ON support_tickets(resolved_by)
  WHERE resolved_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_attachments_deleted_by
  ON support_ticket_attachments(deleted_by)
  WHERE deleted_by IS NOT NULL;

-- Campaign/Marketing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_campaigns_created_by
  ON email_campaigns(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_campaigns_created_by
  ON marketing_campaigns(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_campaigns_approved_by
  ON marketing_campaigns(approved_by)
  WHERE approved_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_segments_created_by
  ON player_segments(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_reports_created_by
  ON scheduled_reports(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_outreach_approved_by
  ON scheduled_outreach_messages(approved_by)
  WHERE approved_by IS NOT NULL;

-- SMS/Messaging indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_campaign_id
  ON sms_messages(campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_templates_created_by
  ON sms_templates(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_templates_approved_by
  ON sms_templates(approved_by)
  WHERE approved_by IS NOT NULL;

-- AI Message indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_message_logs_conversation
  ON ai_message_logs(conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_message_logs_message
  ON ai_message_logs(message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_offered_bonuses_message
  ON ai_offered_bonuses(message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_ai_replies_message
  ON pending_ai_auto_replies(ai_message_id)
  WHERE ai_message_id IS NOT NULL;

-- Lead Management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_bonus_assignments_lead
  ON lead_bonus_assignments(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_bonus_assignments_list
  ON lead_bonus_assignments(list_id)
  WHERE list_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_lists_uploaded_by
  ON lead_lists(uploaded_by)
  WHERE uploaded_by IS NOT NULL;

-- Game Statistics index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_statistics_biggest_win_user
  ON game_statistics(biggest_win_user_id)
  WHERE biggest_win_user_id IS NOT NULL;