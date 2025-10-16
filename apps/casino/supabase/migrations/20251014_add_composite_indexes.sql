-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================
-- Purpose: Add multi-column indexes optimized for common query patterns
-- to improve query performance and reduce database load
--
-- Target query patterns:
-- 1. Active bonuses for user: WHERE user_id = ? AND status = 'active'
-- 2. Recent transactions: WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC
-- 3. Eligible jackpot tickets: WHERE jackpot_pool_id = ? AND draw_eligible = true
-- 4. Active game rounds: WHERE user_id = ? AND status = 'active'
-- ============================================

-- 1. PLAYER_BONUSES: Active bonuses for user
-- ============================================
-- Covering index for active bonuses with frequently accessed columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_user_status_active
  ON player_bonuses(user_id, status)
  INCLUDE (bonus_amount, wagering_requirement_total, wagering_completed, expires_at)
  WHERE status = 'active';

COMMENT ON INDEX idx_player_bonuses_user_status_active IS
  'Composite index for active bonuses query: WHERE user_id = ? AND status = ''active''';

-- Index for all statuses (not just active) with created date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_user_status_created
  ON player_bonuses(user_id, status, created_at DESC);

COMMENT ON INDEX idx_player_bonuses_user_status_created IS
  'Composite index for user bonuses by status with ordering';

-- 2. TRANSACTIONS: Recent transactions with time range
-- ============================================
-- Composite index with ORDER BY column and covering frequently accessed fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_time_desc
  ON transactions(user_id, created_at DESC)
  INCLUDE (type, amount, balance_after, status);

COMMENT ON INDEX idx_transactions_user_time_desc IS
  'Composite index for recent transactions: WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC';

-- Partial index for recent transactions only (last 90 days)
-- This keeps the index smaller and faster for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_recent
  ON transactions(user_id, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '90 days';

COMMENT ON INDEX idx_transactions_user_recent IS
  'Partial index for recent transactions (last 90 days) to optimize common time-bound queries';

-- 3. JACKPOT_TICKETS: Eligible tickets for draw
-- ============================================
-- Partial index for eligible tickets only with covering columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_tickets_pool_eligible
  ON jackpot_tickets(jackpot_pool_id, draw_eligible)
  INCLUDE (user_id, tickets, earned_from_transaction_id)
  WHERE draw_eligible = true;

COMMENT ON INDEX idx_jackpot_tickets_pool_eligible IS
  'Composite index for eligible jackpot tickets: WHERE jackpot_pool_id = ? AND draw_eligible = true';

-- Index for user's tickets across pools
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_tickets_user_pool
  ON jackpot_tickets(user_id, jackpot_pool_id, draw_eligible);

COMMENT ON INDEX idx_jackpot_tickets_user_pool IS
  'Composite index for user tickets by pool and eligibility';

-- 4. GAME_ROUNDS: Active rounds for user
-- ============================================
-- Partial index for active rounds only with covering columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_user_active
  ON game_rounds(user_id, status)
  INCLUDE (game_id, bet_amount, started_at)
  WHERE status = 'active';

COMMENT ON INDEX idx_game_rounds_user_active IS
  'Composite index for active game rounds: WHERE user_id = ? AND status = ''active''';

-- Composite index for all statuses with time ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_user_status_time
  ON game_rounds(user_id, status, started_at DESC);

COMMENT ON INDEX idx_game_rounds_user_status_time IS
  'Composite index for game rounds by user, status, and time';

-- ============================================
-- ADDITIONAL USEFUL COMPOSITE INDEXES
-- ============================================

-- SMS_MESSAGES: Recent messages for user
-- Note: sms_messages doesn't have user_id, using phone_number instead
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_phone_time
  ON sms_messages(phone_number, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_sms_messages_phone_time IS
  'Composite index for recent SMS messages by phone number';

-- USER_BALANCES: User balance lookup with currency (improved covering index)
-- Drop the existing non-covering index if it exists
DROP INDEX IF EXISTS idx_user_balances_user_currency;

-- Create improved covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_balances_user_currency_covering
  ON user_balances(user_id, currency)
  INCLUDE (balance, bonus_balance, locked_bonus);

COMMENT ON INDEX idx_user_balances_user_currency_covering IS
  'Covering index for user balance lookups with all balance fields';

-- TRANSACTIONS: Transaction type filtering for completed transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_type_time
  ON transactions(user_id, type, created_at DESC)
  WHERE status = 'completed';

COMMENT ON INDEX idx_transactions_user_type_time IS
  'Composite index for filtering transactions by type and completion status';

-- PLAYER_BONUSES: Expiring bonuses (system-wide monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_expiring
  ON player_bonuses(expires_at, status)
  WHERE status IN ('active', 'pending') AND expires_at IS NOT NULL;

COMMENT ON INDEX idx_player_bonuses_expiring IS
  'Index for monitoring expiring bonuses system-wide';

-- ============================================
-- CLEANUP: Remove redundant single-column indexes
-- ============================================
-- These are now covered by composite indexes and can be safely dropped
-- to reduce index maintenance overhead

-- Drop redundant indexes on game_rounds (covered by new composites)
DROP INDEX IF EXISTS idx_rounds_user; -- Covered by idx_game_rounds_user_status_time
DROP INDEX IF EXISTS idx_rounds_status; -- Less selective, keep composites instead

-- Drop redundant indexes on transactions (covered by new composites)
DROP INDEX IF EXISTS idx_transactions_user; -- Covered by idx_transactions_user_time_desc
DROP INDEX IF EXISTS idx_transactions_player_date; -- Duplicate of idx_transactions_user_created

-- Drop redundant index on player_bonuses
DROP INDEX IF EXISTS idx_player_bonuses_user; -- Covered by composite indexes

-- ============================================
-- STATISTICS UPDATE
-- ============================================
-- Update statistics for better query planning
ANALYZE player_bonuses;
ANALYZE transactions;
ANALYZE jackpot_tickets;
ANALYZE game_rounds;
ANALYZE sms_messages;
ANALYZE user_balances;

-- ============================================
-- INDEX USAGE MONITORING QUERY
-- ============================================
-- Run this query after deployment to monitor index usage:
/*
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN ('player_bonuses', 'transactions', 'jackpot_tickets', 'game_rounds', 'sms_messages', 'user_balances')
ORDER BY tablename, idx_scan DESC;
*/

-- ============================================
-- ROLLBACK SCRIPT
-- ============================================
-- In case of issues, use this to rollback:
/*
-- Drop new composite indexes
DROP INDEX IF EXISTS idx_player_bonuses_user_status_active;
DROP INDEX IF EXISTS idx_player_bonuses_user_status_created;
DROP INDEX IF EXISTS idx_transactions_user_time_desc;
DROP INDEX IF EXISTS idx_transactions_user_recent;
DROP INDEX IF EXISTS idx_jackpot_tickets_pool_eligible;
DROP INDEX IF EXISTS idx_jackpot_tickets_user_pool;
DROP INDEX IF EXISTS idx_game_rounds_user_active;
DROP INDEX IF EXISTS idx_game_rounds_user_status_time;
DROP INDEX IF EXISTS idx_sms_messages_phone_time;
DROP INDEX IF EXISTS idx_user_balances_user_currency_covering;
DROP INDEX IF EXISTS idx_transactions_user_type_time;
DROP INDEX IF EXISTS idx_player_bonuses_expiring;

-- Recreate dropped indexes
CREATE INDEX idx_rounds_user ON game_rounds(user_id);
CREATE INDEX idx_rounds_status ON game_rounds(status);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_player_date ON transactions(user_id, created_at DESC);
CREATE INDEX idx_player_bonuses_user ON player_bonuses(user_id);
CREATE INDEX idx_user_balances_user_currency ON user_balances(user_id, currency);
*/