-- Performance Optimization Indexes
-- This migration adds indexes to improve query performance

-- Games table indexes
CREATE INDEX IF NOT EXISTS idx_games_active_category ON games(is_active, category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_games_active_new ON games(is_active, is_new) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_games_active_jackpot ON games(is_active, has_jackpot) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_games_display_order ON games(display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_games_provider ON games(provider) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_games_search ON games USING gin(to_tsvector('english', game_name || ' ' || COALESCE(provider, '')));

-- User balances indexes
CREATE INDEX IF NOT EXISTS idx_user_balances_user_currency ON user_balances(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_user_balances_user ON user_balances(user_id);

-- Transactions indexes for faster history queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status) WHERE status = 'completed';

-- Game rounds for player history
CREATE INDEX IF NOT EXISTS idx_game_rounds_user_created ON game_rounds(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_rounds_game ON game_rounds(game_id);

-- Jackpot tickets for faster lookups
CREATE INDEX IF NOT EXISTS idx_jackpot_tickets_user_pool ON jackpot_tickets(user_id, pool_id);
CREATE INDEX IF NOT EXISTS idx_jackpot_tickets_pool_created ON jackpot_tickets(pool_id, earned_at DESC);

-- Player loyalty for VIP tier lookups
CREATE INDEX IF NOT EXISTS idx_player_loyalty_user ON player_loyalty(user_id);
CREATE INDEX IF NOT EXISTS idx_player_loyalty_tier ON player_loyalty(tier_id);
CREATE INDEX IF NOT EXISTS idx_player_loyalty_points ON player_loyalty(total_points DESC);

-- Player bonuses for active bonus checks
CREATE INDEX IF NOT EXISTS idx_player_bonuses_user_status ON player_bonuses(user_id, status) WHERE status IN ('active', 'pending');
CREATE INDEX IF NOT EXISTS idx_player_bonuses_expires ON player_bonuses(expires_at) WHERE status = 'active';

-- Callback logs for debugging
CREATE INDEX IF NOT EXISTS idx_callback_logs_created ON callback_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_callback_logs_user_created ON callback_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_callback_logs_hmac ON callback_logs(hmac_valid) WHERE hmac_valid = false;

-- Game statistics for popular games
CREATE INDEX IF NOT EXISTS idx_game_statistics_plays ON game_statistics(total_plays DESC);
CREATE INDEX IF NOT EXISTS idx_game_statistics_rtp ON game_statistics(rtp DESC);

-- Composite indexes for common join patterns
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_jackpot_pools_active ON jackpot_pools(is_active) WHERE is_active = true;

-- Indexes for real-time subscriptions
CREATE INDEX IF NOT EXISTS idx_games_updated ON games(updated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jackpot_pools_updated ON jackpot_pools(updated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_balances_updated ON user_balances(updated_at DESC);

-- Function to analyze table sizes and suggest vacuum
CREATE OR REPLACE FUNCTION analyze_table_performance()
RETURNS TABLE(
    table_name text,
    row_count bigint,
    total_size text,
    indexes_size text,
    toast_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname||'.'||tablename AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_indexes_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS toast_size
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments to document index purposes
COMMENT ON INDEX idx_games_active_category IS 'Speed up category-based game filtering';
COMMENT ON INDEX idx_games_search IS 'Full-text search on game names and providers';
COMMENT ON INDEX idx_transactions_user_created IS 'Speed up transaction history queries';
COMMENT ON INDEX idx_jackpot_tickets_user_pool IS 'Fast lookup of user tickets for current pool';
COMMENT ON INDEX idx_player_bonuses_user_status IS 'Quick check for active bonuses';

-- Analyze tables to update statistics after index creation
ANALYZE games;
ANALYZE user_balances;
ANALYZE transactions;
ANALYZE game_rounds;
ANALYZE jackpot_tickets;
ANALYZE player_loyalty;
ANALYZE player_bonuses;