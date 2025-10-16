-- Additional Performance Indexes Migration
-- Date: 2025-01-15
-- Purpose: Add missing indexes identified in database audit for optimal query performance

-- ============================================================================
-- User Balances Optimization
-- ============================================================================

-- Composite index for user balance queries with positive balances
-- Optimizes queries like: SELECT * FROM user_balances WHERE user_id = ? AND currency = ? AND balance > 0
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_balances_user_currency_balance
ON user_balances(user_id, currency, balance DESC)
WHERE balance > 0;

COMMENT ON INDEX idx_user_balances_user_currency_balance IS 'Optimizes balance lookups for users with positive balances';

-- ============================================================================
-- Transactions Optimization
-- ============================================================================

-- Date range queries with type filter (common in reporting)
-- Optimizes queries like: SELECT * FROM transactions WHERE user_id = ? AND created_at > ? AND type IN ('credit', 'debit')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_created_type
ON transactions(user_id, created_at DESC, type)
WHERE created_at >= NOW() - INTERVAL '1 year';

COMMENT ON INDEX idx_transactions_user_created_type IS 'Optimizes recent transaction history queries';

-- ============================================================================
-- Player Bonuses Optimization
-- ============================================================================

-- Active bonuses expiring soon (for notifications/warnings)
-- Optimizes queries like: SELECT * FROM player_bonuses WHERE user_id = ? AND status = 'active' AND expires_at IS NOT NULL ORDER BY expires_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_active_expires_soon
ON player_bonuses(user_id, expires_at ASC)
WHERE status = 'active' AND expires_at IS NOT NULL;

COMMENT ON INDEX idx_player_bonuses_active_expires_soon IS 'Optimizes active bonus expiry tracking for notifications';

-- ============================================================================
-- SMS Messages Optimization (Admin)
-- ============================================================================

-- Unread messages in conversation (if sms_conversations exists in admin)
-- Optimizes queries like: SELECT * FROM sms_messages WHERE conversation_id = ? AND read_at IS NULL ORDER BY created_at DESC
-- Note: Only create if conversation_id column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sms_messages'
        AND column_name = 'conversation_id'
    ) THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_conversation_unread
        ON sms_messages(conversation_id, created_at DESC)
        WHERE read_at IS NULL;

        COMMENT ON INDEX idx_sms_messages_conversation_unread IS 'Optimizes unread message queries in conversations';
    END IF;
END $$;

-- ============================================================================
-- Support Tickets Optimization (Admin)
-- ============================================================================

-- Open tickets assigned to specific admin
-- Optimizes queries like: SELECT * FROM support_tickets WHERE assigned_to = ? AND status IN ('open', 'in_progress') ORDER BY priority, created_at DESC
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_open_assigned
        ON support_tickets(assigned_to, status, priority, created_at DESC)
        WHERE status IN ('open', 'in_progress');

        COMMENT ON INDEX idx_support_tickets_open_assigned IS 'Optimizes admin dashboard ticket queue queries';
    END IF;
END $$;

-- ============================================================================
-- Jackpot Tickets Optimization
-- ============================================================================

-- Player's eligible tickets for current draw
-- Optimizes queries like: SELECT * FROM jackpot_tickets WHERE user_id = ? AND jackpot_pool_id = ? AND draw_eligible = true ORDER BY earned_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_tickets_user_eligible
ON jackpot_tickets(user_id, jackpot_pool_id, earned_at DESC)
WHERE draw_eligible = true;

COMMENT ON INDEX idx_jackpot_tickets_user_eligible IS 'Optimizes player eligible ticket queries for draws';

-- ============================================================================
-- Game Rounds Optimization
-- ============================================================================

-- Recent active game rounds by user
-- Optimizes queries like: SELECT * FROM game_rounds WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_user_active
ON game_rounds(user_id, started_at DESC)
WHERE status = 'active';

COMMENT ON INDEX idx_game_rounds_user_active IS 'Optimizes active game session queries';

-- ============================================================================
-- Loyalty Points Transactions Optimization
-- ============================================================================

-- Recent points history with type filter
-- Optimizes queries like: SELECT * FROM loyalty_points_transactions WHERE user_id = ? AND transaction_type = 'earned' ORDER BY created_at DESC LIMIT 50
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loyalty_points_user_type_created
ON loyalty_points_transactions(user_id, transaction_type, created_at DESC);

COMMENT ON INDEX idx_loyalty_points_user_type_created IS 'Optimizes points history queries with type filtering';

-- ============================================================================
-- Campaign Sends Optimization (Admin)
-- ============================================================================

-- Campaign performance tracking
-- Optimizes queries like: SELECT status, COUNT(*) FROM campaign_sends WHERE campaign_id = ? GROUP BY status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_sends') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_sends_campaign_status_created
        ON campaign_sends(campaign_id, status, created_at DESC);

        COMMENT ON INDEX idx_campaign_sends_campaign_status_created IS 'Optimizes campaign performance reporting';
    END IF;
END $$;

-- ============================================================================
-- Player Loyalty Optimization
-- ============================================================================

-- Tier-based player lookup (for VIP dashboards)
-- Optimizes queries like: SELECT * FROM player_loyalty WHERE current_tier_id = ? ORDER BY lifetime_wagered DESC LIMIT 100
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_loyalty_tier_wagered
ON player_loyalty(current_tier_id, lifetime_wagered DESC);

COMMENT ON INDEX idx_player_loyalty_tier_wagered IS 'Optimizes VIP tier leaderboard queries';

-- ============================================================================
-- Callback Logs Optimization
-- ============================================================================

-- Recent failed callbacks (for monitoring)
-- Optimizes queries like: SELECT * FROM callback_logs WHERE hmac_valid = false AND created_at > ? ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_callback_logs_failed_recent
ON callback_logs(hmac_valid, created_at DESC)
WHERE hmac_valid = false AND created_at >= NOW() - INTERVAL '7 days';

COMMENT ON INDEX idx_callback_logs_failed_recent IS 'Optimizes security monitoring for failed callback attempts';

-- ============================================================================
-- Analysis and Reporting
-- ============================================================================

-- Create a function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    index_size TEXT,
    index_scans BIGINT,
    rows_read BIGINT,
    rows_fetched BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.schemaname::TEXT,
        s.tablename::TEXT,
        s.indexrelname::TEXT,
        pg_size_pretty(pg_relation_size(s.indexrelid))::TEXT as index_size,
        s.idx_scan as index_scans,
        s.idx_tup_read as rows_read,
        s.idx_tup_fetch as rows_fetched
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION analyze_index_usage IS 'Analyzes index usage statistics for performance monitoring';

-- Grant execute to service role for monitoring
GRANT EXECUTE ON FUNCTION analyze_index_usage() TO service_role;

-- ============================================================================
-- Verification
-- ============================================================================

-- Function to verify all indexes were created successfully
CREATE OR REPLACE FUNCTION verify_performance_indexes()
RETURNS TABLE(
    index_name TEXT,
    table_name TEXT,
    status TEXT
) AS $$
DECLARE
    expected_indexes TEXT[] := ARRAY[
        'idx_user_balances_user_currency_balance',
        'idx_transactions_user_created_type',
        'idx_player_bonuses_active_expires_soon',
        'idx_jackpot_tickets_user_eligible',
        'idx_game_rounds_user_active',
        'idx_loyalty_points_user_type_created',
        'idx_player_loyalty_tier_wagered',
        'idx_callback_logs_failed_recent'
    ];
    idx TEXT;
BEGIN
    FOREACH idx IN ARRAY expected_indexes
    LOOP
        IF EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
            AND indexname = idx
        ) THEN
            RETURN QUERY SELECT idx::TEXT,
                               (SELECT tablename FROM pg_indexes WHERE indexname = idx)::TEXT,
                               'EXISTS'::TEXT;
        ELSE
            RETURN QUERY SELECT idx::TEXT,
                               'unknown'::TEXT,
                               'MISSING'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_performance_indexes IS 'Verifies that all performance indexes were created successfully';

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION verify_performance_indexes() TO service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Performance indexes migration completed successfully';
    RAISE NOTICE 'Run SELECT * FROM verify_performance_indexes() to verify';
    RAISE NOTICE 'Run SELECT * FROM analyze_index_usage() to monitor index performance';
END $$;
