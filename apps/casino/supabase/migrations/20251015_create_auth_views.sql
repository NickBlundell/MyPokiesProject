-- PERFORMANCE FIX: Create views that eliminate the need for auth_user_id → user_id lookup
-- These views join the users table directly, eliminating 1 database round-trip per API call

-- ============================================================================
-- MY_BALANCES VIEW
-- ============================================================================

CREATE OR REPLACE VIEW my_balances AS
SELECT
  ub.currency,
  ub.balance,
  ub.bonus_balance,
  ub.locked_bonus,
  ub.updated_at,
  ub.user_id
FROM user_balances ub
JOIN users u ON ub.user_id = u.id
WHERE u.auth_user_id = auth.uid();

COMMENT ON VIEW my_balances IS
  'Returns current user balances without needing separate user lookup. Used in API routes.';

GRANT SELECT ON my_balances TO authenticated;

-- ============================================================================
-- MY_TRANSACTIONS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW my_transactions AS
SELECT
  t.id,
  t.user_id,
  t.type,
  t.currency,
  t.amount,
  t.balance_before,
  t.balance_after,
  t.description,
  t.metadata,
  t.created_at,
  t.status
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.auth_user_id = auth.uid();

COMMENT ON VIEW my_transactions IS
  'Returns current user transactions without needing separate user lookup.';

GRANT SELECT ON my_transactions TO authenticated;

-- ============================================================================
-- MY_GAME_ROUNDS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW my_game_rounds AS
SELECT
  gr.id,
  gr.user_id,
  gr.game_id,
  gr.session_id,
  gr.round_id,
  gr.bet_amount,
  gr.win_amount,
  gr.currency,
  gr.created_at,
  gr.completed_at,
  gr.status,
  gr.metadata
FROM game_rounds gr
JOIN users u ON gr.user_id = u.id
WHERE u.auth_user_id = auth.uid();

COMMENT ON VIEW my_game_rounds IS
  'Returns current user game rounds without needing separate user lookup.';

GRANT SELECT ON my_game_rounds TO authenticated;

-- ============================================================================
-- MY_BONUSES VIEW
-- ============================================================================

CREATE OR REPLACE VIEW my_bonuses AS
SELECT
  pb.id,
  pb.user_id,
  pb.bonus_id,
  pb.amount,
  pb.currency,
  pb.wagering_requirement,
  pb.wagered_amount,
  pb.status,
  pb.expires_at,
  pb.claimed_at,
  pb.completed_at,
  pb.created_at,
  b.name as bonus_name,
  b.description as bonus_description,
  b.type as bonus_type
FROM player_bonuses pb
JOIN users u ON pb.user_id = u.id
JOIN bonuses b ON pb.bonus_id = b.id
WHERE u.auth_user_id = auth.uid();

COMMENT ON VIEW my_bonuses IS
  'Returns current user bonuses with bonus details without needing separate user lookup.';

GRANT SELECT ON my_bonuses TO authenticated;

-- ============================================================================
-- MY_LOYALTY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW my_loyalty AS
SELECT
  pl.user_id,
  pl.points,
  pl.tier,
  pl.total_wagered,
  pl.total_points_earned,
  pl.updated_at,
  lt.name as tier_name,
  lt.min_points as tier_min_points,
  lt.benefits as tier_benefits
FROM player_loyalty pl
JOIN users u ON pl.user_id = u.id
LEFT JOIN loyalty_tiers lt ON pl.tier = lt.tier
WHERE u.auth_user_id = auth.uid();

COMMENT ON VIEW my_loyalty IS
  'Returns current user loyalty status with tier details without needing separate user lookup.';

GRANT SELECT ON my_loyalty TO authenticated;

-- ============================================================================
-- MY_JACKPOT_TICKETS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW my_jackpot_tickets AS
SELECT
  jt.id,
  jt.user_id,
  jt.pool_id,
  jt.ticket_number,
  jt.odds,
  jt.created_at,
  jt.draw_id,
  jp.name as pool_name,
  jp.current_amount as pool_amount,
  jp.status as pool_status
FROM jackpot_tickets jt
JOIN users u ON jt.user_id = u.id
LEFT JOIN jackpot_pools jp ON jt.pool_id = jp.id
WHERE u.auth_user_id = auth.uid();

COMMENT ON VIEW my_jackpot_tickets IS
  'Returns current user jackpot tickets with pool details without needing separate user lookup.';

GRANT SELECT ON my_jackpot_tickets TO authenticated;

-- ============================================================================
-- MY_FAVORITES VIEW
-- ============================================================================

CREATE OR REPLACE VIEW my_favorites AS
SELECT
  gf.game_id,
  gf.created_at,
  g.name as game_name,
  g.provider_id,
  g.category,
  g.thumbnail_url
FROM game_favorites gf
JOIN users u ON gf.user_id = u.id
JOIN games g ON gf.game_id = g.id
WHERE u.auth_user_id = auth.uid();

COMMENT ON VIEW my_favorites IS
  'Returns current user favorite games without needing separate user lookup.';

GRANT SELECT ON my_favorites TO authenticated;

-- ============================================================================
-- MY_PROFILE VIEW (Optimized profile data)
-- ============================================================================

CREATE OR REPLACE VIEW my_profile AS
SELECT
  u.id as user_id,
  u.external_user_id,
  u.email,
  u.created_at,
  u.last_login_at,
  u.status,
  -- Aggregate balances
  COALESCE(SUM(ub.balance), 0) as total_balance,
  COALESCE(SUM(ub.bonus_balance), 0) as total_bonus_balance,
  -- Loyalty info
  pl.points as loyalty_points,
  pl.tier as loyalty_tier,
  pl.total_wagered,
  -- Stats (using cached columns if available)
  u.total_wagered_cached,
  u.total_won_cached,
  u.transaction_count_cached,
  -- Jackpot tickets
  COUNT(DISTINCT jt.id) as total_tickets
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN player_loyalty pl ON u.id = pl.user_id
LEFT JOIN jackpot_tickets jt ON u.id = jt.user_id AND jt.draw_id IS NULL
WHERE u.auth_user_id = auth.uid()
GROUP BY
  u.id, u.external_user_id, u.email, u.created_at,
  u.last_login_at, u.status,
  pl.points, pl.tier, pl.total_wagered,
  u.total_wagered_cached, u.total_won_cached, u.transaction_count_cached;

COMMENT ON VIEW my_profile IS
  'Returns complete current user profile with aggregated data. Much faster than get_my_casino_profile().';

GRANT SELECT ON my_profile TO authenticated;

-- ============================================================================
-- PERFORMANCE IMPACT
-- ============================================================================

-- Before these views:
-- API call sequence:
--   1. supabase.auth.getUser() - 20-50ms
--   2. SELECT id FROM users WHERE auth_user_id = ? - 20-50ms
--   3. SELECT * FROM table WHERE user_id = ? - 20-100ms
--   Total: 60-200ms (3 round-trips)
--
-- After these views:
-- API call sequence:
--   1. supabase.auth.getUser() - 20-50ms
--   2. SELECT * FROM my_table - 20-100ms
--   Total: 40-150ms (2 round-trips)
--
-- Expected improvement: 30-40% faster per API call
