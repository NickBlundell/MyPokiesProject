-- Migration: Add Missing Foreign Key Indexes for Performance Optimization
-- Date: 2025-10-14
-- Priority: HIGH - Addresses critical performance issues with JOINs
-- Impact: Significant query performance improvement, reduced database load

-- ============================================================================
-- FOREIGN KEY INDEX ADDITIONS
-- ============================================================================
-- PostgreSQL does not automatically create indexes on foreign key columns.
-- This causes slow JOINs and full table scans. These indexes will dramatically
-- improve query performance on common JOIN operations.

-- ----------------------------------------------------------------------------
-- 1. TRANSACTIONS TABLE - Add index on promotion_id
-- ----------------------------------------------------------------------------
-- Used in: Promotion effectiveness reports, player bonus tracking
-- Impact: Speeds up queries filtering by promotion_id

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_promotion_id
ON public.transactions(promotion_id)
WHERE promotion_id IS NOT NULL;

COMMENT ON INDEX idx_transactions_promotion_id IS
'Foreign key index for promotion_id - improves JOIN performance with promotions table';

-- ----------------------------------------------------------------------------
-- 2. PLAYER_BONUSES TABLE - Add index on bonus_offer_id
-- ----------------------------------------------------------------------------
-- Used in: Bonus redemption tracking, offer performance analysis
-- Impact: Speeds up queries joining with bonus_offers table

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_bonus_offer_id
ON public.player_bonuses(bonus_offer_id)
WHERE bonus_offer_id IS NOT NULL;

COMMENT ON INDEX idx_player_bonuses_bonus_offer_id IS
'Foreign key index for bonus_offer_id - improves JOIN performance with bonus_offers table';

-- ----------------------------------------------------------------------------
-- 3. JACKPOT_TICKETS TABLE - Add index on earned_from_transaction_id
-- ----------------------------------------------------------------------------
-- Used in: Tracking how tickets were earned, transaction-to-ticket mapping
-- Impact: Speeds up queries linking tickets to their source transactions

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_tickets_earned_from_transaction_id
ON public.jackpot_tickets(earned_from_transaction_id)
WHERE earned_from_transaction_id IS NOT NULL;

COMMENT ON INDEX idx_jackpot_tickets_earned_from_transaction_id IS
'Foreign key index for earned_from_transaction_id - improves JOIN performance with transactions table';

-- ----------------------------------------------------------------------------
-- 4. CAMPAIGN_SENDS TABLE - Add index on campaign_id
-- ----------------------------------------------------------------------------
-- Used in: Campaign performance tracking, send history queries
-- Impact: Speeds up queries filtering sends by campaign

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_sends_campaign_id
ON public.campaign_sends(campaign_id)
WHERE campaign_id IS NOT NULL;

COMMENT ON INDEX idx_campaign_sends_campaign_id IS
'Foreign key index for campaign_id - improves JOIN performance with marketing_campaigns table';

-- ----------------------------------------------------------------------------
-- 5. Additional Foreign Key Indexes for Common JOINs
-- ----------------------------------------------------------------------------

-- game_rounds.user_id (frequently joined with users)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_user_id
ON public.game_rounds(user_id);

-- game_rounds.game_id (frequently joined with games)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_game_id
ON public.game_rounds(game_id);

-- sms_messages.conversation_id (frequently filtered by conversation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_conversation_id
ON public.sms_messages(conversation_id)
WHERE conversation_id IS NOT NULL;

-- player_bonuses.user_id (critical for user bonus queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_user_id
ON public.player_bonuses(user_id);

-- transactions.user_id (critical for transaction history)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_id
ON public.transactions(user_id);

-- jackpot_tickets.user_id (for user ticket queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_tickets_user_id
ON public.jackpot_tickets(user_id);

-- jackpot_tickets.jackpot_pool_id (for pool-specific queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_tickets_jackpot_pool_id
ON public.jackpot_tickets(jackpot_pool_id);

-- ----------------------------------------------------------------------------
-- ANALYZE TABLES AFTER INDEX CREATION
-- ----------------------------------------------------------------------------
-- Update statistics for query planner to use new indexes effectively

ANALYZE public.transactions;
ANALYZE public.player_bonuses;
ANALYZE public.jackpot_tickets;
ANALYZE public.campaign_sends;
ANALYZE public.game_rounds;
ANALYZE public.sms_messages;

-- ============================================================================
-- PERFORMANCE MONITORING VIEW
-- ============================================================================
-- Create a view to monitor the effectiveness of these indexes

CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read_via_index,
    idx_tup_fetch AS tuples_fetched_via_index,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'RARELY_USED'
        WHEN idx_scan < 1000 THEN 'OCCASIONALLY_USED'
        ELSE 'FREQUENTLY_USED'
    END AS usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

COMMENT ON VIEW index_usage_stats IS
'Monitor index usage statistics to identify unused or underutilized indexes';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT on monitoring view to authenticated users
GRANT SELECT ON public.index_usage_stats TO authenticated;

-- ============================================================================
-- ROLLBACK SCRIPT (commented out for safety)
-- ============================================================================
-- To rollback this migration, uncomment and run:
/*
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_promotion_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_player_bonuses_bonus_offer_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_jackpot_tickets_earned_from_transaction_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_campaign_sends_campaign_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_game_rounds_user_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_game_rounds_game_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_sms_messages_conversation_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_player_bonuses_user_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_user_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_jackpot_tickets_user_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_jackpot_tickets_jackpot_pool_id;

DROP VIEW IF EXISTS public.index_usage_stats;
*/