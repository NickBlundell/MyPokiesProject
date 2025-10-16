-- Migration: Fix Missing CONCURRENTLY on Index Creation
-- Purpose: Add CONCURRENTLY to all CREATE INDEX statements to avoid table locks during deployment
-- Priority: 8/10
-- Estimated Time: 2 hours

-- NOTE: This migration recreates indexes with CONCURRENTLY to avoid table locks.
-- The existing indexes will be dropped and recreated.
-- CONCURRENTLY cannot be used inside a transaction block, so each statement must be run separately.

-- ============================================================================
-- IMPORTANT: This file should be run statement by statement, not as a single transaction
-- In Supabase, you may need to run each statement individually through the SQL editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop and recreate indexes from 20250110_performance_indexes.sql
-- ============================================================================

-- Games indexes
DROP INDEX IF EXISTS idx_games_active_category;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_active_category ON games(is_active, category) WHERE is_active = true;

DROP INDEX IF EXISTS idx_games_active_new;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_active_new ON games(is_active, is_new) WHERE is_active = true;

DROP INDEX IF EXISTS idx_games_active_jackpot;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_active_jackpot ON games(is_active, has_jackpot) WHERE is_active = true;

DROP INDEX IF EXISTS idx_games_display_order;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_display_order ON games(display_order) WHERE is_active = true;

DROP INDEX IF EXISTS idx_games_provider;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_provider ON games(provider) WHERE is_active = true;

DROP INDEX IF EXISTS idx_games_search;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_search ON games USING gin(to_tsvector('english', game_name || ' ' || COALESCE(provider, '')));

-- User balances indexes
DROP INDEX IF EXISTS idx_user_balances_user_currency;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_balances_user_currency ON user_balances(user_id, currency);

DROP INDEX IF EXISTS idx_user_balances_user;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_balances_user ON user_balances(user_id);

-- Transactions indexes
DROP INDEX IF EXISTS idx_transactions_user_created;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);

DROP INDEX IF EXISTS idx_transactions_type;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type ON transactions(type);

DROP INDEX IF EXISTS idx_transactions_status;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status ON transactions(status) WHERE status = 'completed';

-- Game rounds indexes
DROP INDEX IF EXISTS idx_game_rounds_user_created;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_user_created ON game_rounds(user_id, created_at DESC);

DROP INDEX IF EXISTS idx_game_rounds_game;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_game ON game_rounds(game_id);

-- Jackpot tickets indexes
DROP INDEX IF EXISTS idx_jackpot_tickets_user_pool;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_tickets_user_pool ON jackpot_tickets(user_id, jackpot_pool_id);

DROP INDEX IF EXISTS idx_jackpot_tickets_pool_created;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_tickets_pool_created ON jackpot_tickets(jackpot_pool_id, earned_at DESC);

-- Player loyalty indexes
DROP INDEX IF EXISTS idx_player_loyalty_user;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_loyalty_user ON player_loyalty(user_id);

DROP INDEX IF EXISTS idx_player_loyalty_tier;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_loyalty_tier ON player_loyalty(current_tier_id);

DROP INDEX IF EXISTS idx_player_loyalty_points;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_loyalty_points ON player_loyalty(total_points_earned DESC);

-- Player bonuses indexes
DROP INDEX IF EXISTS idx_player_bonuses_user_status;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_user_status ON player_bonuses(user_id, status) WHERE status IN ('active', 'pending');

DROP INDEX IF EXISTS idx_player_bonuses_expires;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_expires ON player_bonuses(expires_at) WHERE status = 'active';

-- Callback logs indexes
DROP INDEX IF EXISTS idx_callback_logs_created;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_callback_logs_created ON callback_logs(created_at DESC);

DROP INDEX IF EXISTS idx_callback_logs_user_created;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_callback_logs_user_created ON callback_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_callback_logs_hmac;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_callback_logs_hmac ON callback_logs(hmac_valid) WHERE hmac_valid = false;

-- Other indexes
DROP INDEX IF EXISTS idx_users_auth;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth ON users(auth_user_id);

DROP INDEX IF EXISTS idx_jackpot_pools_active;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_pools_active ON jackpot_pools(status) WHERE status = 'active';

DROP INDEX IF EXISTS idx_games_updated;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_updated ON games(updated_at DESC) WHERE is_active = true;

DROP INDEX IF EXISTS idx_jackpot_pools_updated;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jackpot_pools_updated ON jackpot_pools(updated_at DESC) WHERE status = 'active';

DROP INDEX IF EXISTS idx_user_balances_updated;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_balances_updated ON user_balances(updated_at DESC);

-- ============================================================================
-- STEP 2: Fix indexes from 20250107_games_catalog.sql
-- ============================================================================

DROP INDEX IF EXISTS idx_games_game_id;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_game_id ON games(game_id);

DROP INDEX IF EXISTS idx_games_system_id;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_system_id ON games(system_id);

DROP INDEX IF EXISTS idx_games_game_type;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_game_type ON games(game_type);

DROP INDEX IF EXISTS idx_games_category;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_category ON games(category);

DROP INDEX IF EXISTS idx_games_active;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_active ON games(is_active);

-- ============================================================================
-- STEP 3: Fix indexes from 20250108_phone_verification_bonus.sql
-- ============================================================================

DROP INDEX IF EXISTS idx_users_phone_bonus_claimed;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_bonus_claimed ON users(phone_bonus_claimed);

-- ============================================================================
-- STEP 4: Fix indexes from 20251014_add_wagering_requirement_remaining.sql
-- ============================================================================

DROP INDEX IF EXISTS idx_player_bonuses_wagering_remaining;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_wagering_remaining
ON player_bonuses(wagering_requirement_remaining)
WHERE status = 'active' AND wagering_requirement_remaining > 0;

DROP INDEX IF EXISTS idx_player_bonuses_user_status_remaining;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_user_status_remaining
ON player_bonuses(user_id, status, wagering_requirement_remaining)
WHERE status IN ('active', 'pending');

-- ============================================================================
-- STEP 5: Fix indexes from admin migrations
-- ============================================================================

-- From 20250114_phase1_user_constraints.sql
DROP INDEX IF EXISTS idx_users_auth_user_id;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_users_phone;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;

DROP INDEX IF EXISTS idx_users_status;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users(account_status);

DROP INDEX IF EXISTS idx_users_last_login;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);

-- From 20250114_phase2_player_sessions.sql
DROP INDEX IF EXISTS idx_player_sessions_player;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_sessions_player ON player_sessions(player_id);

DROP INDEX IF EXISTS idx_player_sessions_active;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_sessions_active ON player_sessions(player_id, is_active, last_activity_at DESC)
WHERE is_active = true;

DROP INDEX IF EXISTS idx_player_sessions_started;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_sessions_started ON player_sessions(started_at DESC);

DROP INDEX IF EXISTS idx_player_sessions_ip;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_sessions_ip ON player_sessions(ip_address);

DROP INDEX IF EXISTS idx_player_sessions_country;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_sessions_country ON player_sessions(country_code) WHERE country_code IS NOT NULL;

DROP INDEX IF EXISTS idx_player_sessions_suspicious;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_sessions_suspicious ON player_sessions(player_id, created_at DESC)
WHERE suspicious_activity = true;

DROP INDEX IF EXISTS idx_player_sessions_device;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_sessions_device ON player_sessions(device_type, device_os);

DROP INDEX IF EXISTS idx_player_sessions_analytics;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_sessions_analytics
ON player_sessions(player_id, started_at, ended_at)
INCLUDE (session_duration_minutes, pages_viewed, total_bets, total_wins);

-- From 20250114_phase2_support_attachments.sql
DROP INDEX IF EXISTS idx_support_attachments_ticket;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_attachments_ticket ON support_ticket_attachments(ticket_id);

DROP INDEX IF EXISTS idx_support_attachments_uploader;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_attachments_uploader ON support_ticket_attachments(uploaded_by);

DROP INDEX IF EXISTS idx_support_attachments_created;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_attachments_created ON support_ticket_attachments(created_at DESC);

DROP INDEX IF EXISTS idx_support_attachments_active;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_attachments_active ON support_ticket_attachments(ticket_id, created_at DESC)
WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_support_attachments_pending_scan;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_attachments_pending_scan ON support_ticket_attachments(created_at)
WHERE virus_scan_status = 'pending';

-- From 20250114_phase2_player_value_segmentation.sql
DROP INDEX IF EXISTS idx_player_value_metrics_value_score;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_value_metrics_value_score ON player_value_metrics(value_score DESC);

DROP INDEX IF EXISTS idx_player_value_metrics_engagement_score;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_value_metrics_engagement_score ON player_value_metrics(engagement_score DESC);

DROP INDEX IF EXISTS idx_player_value_metrics_tier;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_value_metrics_tier ON player_value_metrics(tier_level DESC);

DROP INDEX IF EXISTS idx_player_value_metrics_deposits;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_value_metrics_deposits ON player_value_metrics(total_deposits_value DESC);

DROP INDEX IF EXISTS idx_player_value_metrics_last_activity;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_value_metrics_last_activity ON player_value_metrics(last_activity_at DESC);

-- From 20250111_ai_conversations.sql
DROP INDEX IF EXISTS idx_sms_conversations_phone;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_conversations_phone ON sms_conversations(phone_number);

DROP INDEX IF EXISTS idx_sms_conversations_status;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_conversations_status ON sms_conversations(status);

DROP INDEX IF EXISTS idx_sms_conversations_converted;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_conversations_converted ON sms_conversations(converted);

DROP INDEX IF EXISTS idx_ai_message_logs_conversation;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_message_logs_conversation ON ai_message_logs(conversation_id);

DROP INDEX IF EXISTS idx_conversion_events_conversation;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversion_events_conversation ON conversion_events(conversation_id);

DROP INDEX IF EXISTS idx_conversion_events_type;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversion_events_type ON conversion_events(event_type);

-- From 20250112_ai_player_engagement_system.sql
DROP INDEX IF EXISTS idx_player_behavior_player;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_behavior_player ON player_behavioral_analytics(player_id);

DROP INDEX IF EXISTS idx_player_behavior_pattern;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_behavior_pattern ON player_behavioral_analytics(has_established_pattern);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Query to verify all indexes are created with proper names
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. CONCURRENTLY cannot be used within a transaction block
-- 2. Each CREATE INDEX CONCURRENTLY must be run as a separate statement
-- 3. This prevents table locks during index creation
-- 4. The process is slower but doesn't block other operations
-- 5. If an index creation fails, it leaves an invalid index that must be dropped manually

-- To check for invalid indexes:
-- SELECT * FROM pg_class, pg_index WHERE pg_index.indisvalid = false AND pg_index.indexrelid = pg_class.oid;