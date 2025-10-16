-- Phase 1: Critical Database Fixes - Performance Indexes
-- Migration Date: 2025-01-14
-- Purpose: Add missing indexes to improve query performance

-- ============================================================================
-- PART 1: User Balances Indexes
-- ============================================================================

-- Composite index for common balance queries
CREATE INDEX IF NOT EXISTS idx_user_balances_user_currency_balance
    ON user_balances(user_id, currency, balance);

-- Index for finding users with low balance
CREATE INDEX IF NOT EXISTS idx_user_balances_low_balance
    ON user_balances(balance)
    WHERE balance < 10 AND balance > 0;

-- Index for finding users with bonus balance
CREATE INDEX IF NOT EXISTS idx_user_balances_with_bonus
    ON user_balances(user_id, bonus_balance)
    WHERE bonus_balance > 0;

-- ============================================================================
-- PART 2: Transactions Indexes
-- ============================================================================

-- Composite index for user transactions by date
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_desc
    ON transactions(user_id, created_at DESC);

-- Index for credit transactions (deposits)
CREATE INDEX IF NOT EXISTS idx_transactions_deposits
    ON transactions(user_id, amount, created_at DESC)
    WHERE type = 'credit' AND subtype = 'deposit';

-- Index for debit transactions (wagers)
CREATE INDEX IF NOT EXISTS idx_transactions_wagers
    ON transactions(user_id, amount, created_at DESC)
    WHERE type = 'debit' AND subtype = 'wager';

-- Index for finding recent transactions by type
CREATE INDEX IF NOT EXISTS idx_transactions_type_subtype_created
    ON transactions(type, subtype, created_at DESC);

-- Index for transaction amount range queries
CREATE INDEX IF NOT EXISTS idx_transactions_amount
    ON transactions(amount DESC)
    WHERE amount > 100;

-- ============================================================================
-- PART 3: Player Bonuses Indexes
-- ============================================================================

-- Index for active bonuses by expiry date
CREATE INDEX IF NOT EXISTS idx_player_bonuses_active_expiry
    ON player_bonuses(user_id, expires_at)
    WHERE status = 'active';

-- Index for bonuses by offer and status
CREATE INDEX IF NOT EXISTS idx_player_bonuses_offer_status
    ON player_bonuses(bonus_offer_id, status, issued_at DESC);

-- Index for finding bonuses near completion
CREATE INDEX IF NOT EXISTS idx_player_bonuses_near_completion
    ON player_bonuses(user_id, wagering_percentage)
    WHERE status = 'active' AND wagering_percentage >= 75;

-- Index for expired bonuses that need cleanup
CREATE INDEX IF NOT EXISTS idx_player_bonuses_expired_cleanup
    ON player_bonuses(expires_at)
    WHERE status IN ('pending', 'active') AND expires_at < NOW();

-- ============================================================================
-- PART 4: Player Loyalty Indexes
-- ============================================================================

-- Index for finding players by tier
CREATE INDEX IF NOT EXISTS idx_player_loyalty_tier_points
    ON player_loyalty(current_tier_id, total_points_earned DESC);

-- Index for finding inactive players
CREATE INDEX IF NOT EXISTS idx_player_loyalty_inactive
    ON player_loyalty(last_activity_at)
    WHERE last_activity_at < NOW() - INTERVAL '30 days';

-- Index for high-value players
CREATE INDEX IF NOT EXISTS idx_player_loyalty_high_value
    ON player_loyalty(lifetime_wagered DESC)
    WHERE lifetime_wagered > 10000;

-- ============================================================================
-- PART 5: SMS/Communication Indexes
-- ============================================================================

-- Index for unread SMS messages
CREATE INDEX IF NOT EXISTS idx_sms_messages_unread
    ON sms_messages(conversation_id, created_at DESC)
    WHERE read_at IS NULL;

-- Index for messages by sender type
CREATE INDEX IF NOT EXISTS idx_sms_messages_sender
    ON sms_messages(conversation_id, sender_type, created_at DESC);

-- Index for recent conversations
CREATE INDEX IF NOT EXISTS idx_sms_conversations_recent
    ON sms_conversations(last_message_at DESC NULLS LAST);

-- Index for active conversations
CREATE INDEX IF NOT EXISTS idx_sms_conversations_active
    ON sms_conversations(status, last_message_at DESC)
    WHERE status = 'active';

-- ============================================================================
-- PART 6: Support Tickets Indexes
-- ============================================================================

-- Index for open tickets by priority
CREATE INDEX IF NOT EXISTS idx_support_tickets_open_priority
    ON support_tickets(priority, created_at DESC)
    WHERE status IN ('open', 'in_progress');

-- Index for assigned tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned
    ON support_tickets(assigned_to, status, created_at DESC)
    WHERE assigned_to IS NOT NULL;

-- Index for unassigned tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_unassigned
    ON support_tickets(created_at DESC)
    WHERE assigned_to IS NULL AND status = 'open';

-- Index for tickets by player
CREATE INDEX IF NOT EXISTS idx_support_tickets_player_recent
    ON support_tickets(player_id, created_at DESC);

-- ============================================================================
-- PART 7: Marketing Campaign Indexes
-- ============================================================================

-- Index for campaign sends by status
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_status
    ON campaign_sends(campaign_id, status);

-- Index for pending campaign sends
CREATE INDEX IF NOT EXISTS idx_campaign_sends_pending
    ON campaign_sends(created_at)
    WHERE status = 'pending';

-- Index for campaign performance
CREATE INDEX IF NOT EXISTS idx_campaign_sends_performance
    ON campaign_sends(campaign_id, status, revenue_generated DESC)
    WHERE status = 'converted';

-- ============================================================================
-- PART 8: Admin Audit Indexes
-- ============================================================================

-- Index for recent admin actions
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_recent
    ON admin_audit_logs(admin_user_id, created_at DESC);

-- Index for actions by resource type
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource
    ON admin_audit_logs(resource_type, resource_id, created_at DESC);

-- Index for high-risk actions (if admin_player_actions exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_player_actions') THEN
        CREATE INDEX IF NOT EXISTS idx_admin_player_actions_high_risk
            ON admin_player_actions(created_at DESC)
            WHERE risk_level IN ('high', 'critical');
    END IF;
END $$;

-- ============================================================================
-- PART 9: Jackpot System Indexes
-- ============================================================================

-- Index for eligible tickets
CREATE INDEX IF NOT EXISTS idx_jackpot_tickets_eligible
    ON jackpot_tickets(jackpot_pool_id, user_id, earned_at DESC)
    WHERE draw_eligible = TRUE;

-- Index for player ticket counts
CREATE INDEX IF NOT EXISTS idx_player_ticket_counts_pool
    ON player_ticket_counts(jackpot_pool_id, total_tickets DESC);

-- Index for recent winners
CREATE INDEX IF NOT EXISTS idx_jackpot_winners_recent
    ON jackpot_winners(created_at DESC);

-- ============================================================================
-- PART 10: Game Statistics Indexes
-- ============================================================================

-- Index for popular games (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_statistics') THEN
        CREATE INDEX IF NOT EXISTS idx_game_statistics_popular
            ON game_statistics(total_rounds DESC, updated_at DESC);
    END IF;
END $$;

-- Index for game rounds by player
CREATE INDEX IF NOT EXISTS idx_game_rounds_user_recent
    ON game_rounds(user_id, started_at DESC);

-- Index for completed rounds
CREATE INDEX IF NOT EXISTS idx_game_rounds_completed
    ON game_rounds(completed_at DESC)
    WHERE status = 'completed';

-- ============================================================================
-- PART 11: AI/Behavioral Analytics Indexes
-- ============================================================================

-- Index for players with missed patterns
CREATE INDEX IF NOT EXISTS idx_behavioral_analytics_missed_pattern
    ON player_behavioral_analytics(last_expected_deposit_time)
    WHERE has_established_pattern = TRUE
    AND last_expected_deposit_time < NOW() - INTERVAL '24 hours';

-- Index for high-value engaged players
CREATE INDEX IF NOT EXISTS idx_behavioral_analytics_engaged
    ON player_behavioral_analytics(consistent_play_weeks DESC, avg_deposit_per_active_week DESC)
    WHERE data_quality_score >= 0.7;

-- Index for AI offered bonuses by status
CREATE INDEX IF NOT EXISTS idx_ai_offered_bonuses_status_expires
    ON ai_offered_bonuses(status, expires_at)
    WHERE status = 'offered';

-- ============================================================================
-- PART 12: Compliance Indexes
-- ============================================================================

-- Index for pending compliance checks
CREATE INDEX IF NOT EXISTS idx_compliance_checks_pending
    ON compliance_checks(check_type, created_at DESC)
    WHERE status = 'pending';

-- Index for high-risk compliance checks
CREATE INDEX IF NOT EXISTS idx_compliance_checks_high_risk
    ON compliance_checks(player_id, risk_score DESC)
    WHERE risk_score >= 70;

-- Index for expiring checks
CREATE INDEX IF NOT EXISTS idx_compliance_checks_expiring
    ON compliance_checks(expires_at)
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW() + INTERVAL '30 days';

-- ============================================================================
-- PART 13: Create Index Statistics View
-- ============================================================================

-- View to monitor index usage and effectiveness
CREATE OR REPLACE VIEW database_index_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

GRANT SELECT ON database_index_stats TO service_role;

-- ============================================================================
-- PART 14: Index Maintenance Function
-- ============================================================================

-- Function to analyze index usage and recommend cleanup
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    index_name TEXT,
    table_name TEXT,
    scans BIGINT,
    size TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        indexrelname::TEXT,
        relname::TEXT,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexrelid)),
        CASE
            WHEN idx_scan = 0 AND pg_relation_size(indexrelid) > 1048576
            THEN 'Consider dropping - unused and > 1MB'
            WHEN idx_scan < 10 AND pg_relation_size(indexrelid) > 10485760
            THEN 'Consider dropping - rarely used and > 10MB'
            WHEN idx_scan > 10000
            THEN 'Keep - heavily used'
            ELSE 'Monitor usage'
        END::TEXT
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION analyze_index_usage() TO service_role;

-- ============================================================================
-- PART 15: VACUUM and ANALYZE Recommendation
-- ============================================================================

-- Analyze all new indexes to update statistics
ANALYZE user_balances;
ANALYZE transactions;
ANALYZE player_bonuses;
ANALYZE player_loyalty;
ANALYZE sms_messages;
ANALYZE sms_conversations;
ANALYZE support_tickets;
ANALYZE campaign_sends;
ANALYZE admin_audit_logs;
ANALYZE jackpot_tickets;
ANALYZE game_rounds;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW database_index_stats IS 'Monitor index usage and effectiveness across all tables';
COMMENT ON FUNCTION analyze_index_usage() IS 'Analyze index usage patterns and recommend cleanup';

-- Output summary
DO $$
DECLARE
    v_index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Performance Indexes Migration Completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total indexes in public schema: %', v_index_count;
    RAISE NOTICE 'Run SELECT * FROM database_index_stats; to view index statistics';
    RAISE NOTICE 'Run SELECT * FROM analyze_index_usage(); to get recommendations';
END $$;
