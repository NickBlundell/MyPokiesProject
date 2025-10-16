-- ============================================
-- FOREIGN KEY INDEX PERFORMANCE VERIFICATION
-- Run this script before and after applying migration
-- Save results for comparison
-- ============================================

-- Get current timestamp for reference
SELECT NOW() AS test_run_timestamp;

-- ============================================
-- HIGH PRIORITY TESTS (from TODO.md)
-- ============================================

-- Test 1: transactions JOIN with promotion_id
-- Expected improvement: 10-20x faster
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    t.id,
    t.amount,
    t.type,
    p.name as promotion_name,
    p.bonus_percentage,
    p.max_bonus_amount
FROM transactions t
LEFT JOIN promotions p ON t.promotion_id = p.id
WHERE t.user_id = (SELECT id FROM users LIMIT 1)
  AND t.created_at >= NOW() - INTERVAL '7 days'
LIMIT 100;

-- Test 2: player_bonuses JOIN with bonus_offer_id
-- Expected improvement: 5-10x faster
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    pb.id,
    pb.status,
    pb.wagering_requirement,
    pb.wagering_progress,
    bo.bonus_code,
    bo.name as bonus_name,
    bo.bonus_type
FROM player_bonuses pb
LEFT JOIN bonus_offers bo ON pb.bonus_offer_id = bo.id
WHERE pb.status = 'active'
  AND pb.expires_at > NOW()
LIMIT 100;

-- Test 3: jackpot_tickets JOIN with transaction
-- Expected improvement: 50-100x faster (transactions table is very large)
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    jt.id,
    jt.ticket_number,
    jt.draw_eligible,
    t.amount as transaction_amount,
    t.type as transaction_type,
    t.created_at as earned_at
FROM jackpot_tickets jt
LEFT JOIN transactions t ON jt.earned_from_transaction_id = t.id
WHERE jt.draw_eligible = true
  AND jt.created_at >= NOW() - INTERVAL '24 hours'
LIMIT 100;

-- Test 4: campaign_sends JOIN with campaign
-- Note: Already has index, but verify performance
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    cs.id,
    cs.status,
    cs.scheduled_for,
    mc.name as campaign_name,
    mc.channel,
    mc.status as campaign_status
FROM campaign_sends cs
JOIN marketing_campaigns mc ON cs.campaign_id = mc.id
WHERE cs.status = 'pending'
  AND cs.scheduled_for <= NOW() + INTERVAL '1 hour'
LIMIT 100;

-- ============================================
-- ADDITIONAL CRITICAL PATH TESTS
-- ============================================

-- Test 5: Game rounds with transactions
-- Expected improvement: 20-50x faster
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    gr.id as round_id,
    gr.game_id,
    COUNT(t.id) as transaction_count,
    SUM(CASE WHEN t.type = 'wager' THEN t.amount ELSE 0 END) as total_wagered,
    SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END) as total_payout
FROM game_rounds gr
LEFT JOIN transactions t ON t.game_round_id = gr.id
WHERE gr.created_at >= NOW() - INTERVAL '1 hour'
GROUP BY gr.id, gr.game_id
LIMIT 50;

-- Test 6: Promotion wins with transactions
-- Expected improvement: 15-30x faster
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    pw.id,
    pw.win_amount,
    pw.promotion_type,
    t.amount as original_wager,
    t.created_at as transaction_date
FROM promotion_wins pw
LEFT JOIN transactions t ON pw.transaction_id = t.id
WHERE pw.created_at >= NOW() - INTERVAL '7 days'
LIMIT 100;

-- Test 7: Loyalty points with transactions
-- Expected improvement: 10-25x faster
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    lpt.id,
    lpt.points_earned,
    lpt.points_spent,
    lpt.reason,
    t.type as transaction_type,
    t.amount as transaction_amount
FROM loyalty_points_transactions lpt
LEFT JOIN transactions t ON lpt.related_transaction_id = t.id
WHERE lpt.user_id = (SELECT id FROM users WHERE loyalty_status = 'active' LIMIT 1)
ORDER BY lpt.created_at DESC
LIMIT 50;

-- ============================================
-- ADMIN PANEL PERFORMANCE TESTS
-- ============================================

-- Test 8: Admin actions with approval tracking
-- Expected improvement: 5-15x faster
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    apa.id,
    apa.action_type,
    apa.status,
    au.username as approved_by_username,
    au.role as approver_role
FROM admin_player_actions apa
LEFT JOIN admin_users au ON apa.approved_by = au.id
WHERE apa.status = 'pending_approval'
ORDER BY apa.created_at DESC
LIMIT 50;

-- Test 9: Support tickets with resolution tracking
-- Expected improvement: 10-20x faster
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    st.id,
    st.subject,
    st.status,
    st.priority,
    au.username as resolved_by_username,
    st.resolved_at
FROM support_tickets st
LEFT JOIN admin_users au ON st.resolved_by = au.id
WHERE st.status = 'resolved'
  AND st.resolved_at >= NOW() - INTERVAL '7 days'
ORDER BY st.resolved_at DESC
LIMIT 100;

-- ============================================
-- AI/MESSAGING PERFORMANCE TESTS
-- ============================================

-- Test 10: AI message logs with conversation context
-- Expected improvement: 10-20x faster
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT
    aml.id,
    aml.ai_response,
    aml.tokens_used,
    sc.phone_number,
    sc.status as conversation_status
FROM ai_message_logs aml
LEFT JOIN sms_conversations sc ON aml.conversation_id = sc.id
WHERE aml.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY aml.created_at DESC
LIMIT 50;

-- ============================================
-- AGGREGATE PERFORMANCE METRICS
-- ============================================

-- Check index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_%transaction%'
    OR indexname LIKE 'idx_%promotion%'
    OR indexname LIKE 'idx_%bonus%'
    OR indexname LIKE 'idx_%jackpot%'
    OR indexname LIKE 'idx_%campaign%'
  )
ORDER BY idx_scan DESC;

-- Check table scan vs index scan ratio
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    CASE
        WHEN seq_scan + idx_scan = 0 THEN 0
        ELSE ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
    END as index_usage_percent,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'transactions', 'player_bonuses', 'jackpot_tickets',
    'campaign_sends', 'promotion_wins', 'game_rounds',
    'loyalty_points_transactions', 'admin_player_actions',
    'support_tickets', 'ai_message_logs'
  )
ORDER BY seq_scan DESC;

-- ============================================
-- EXPECTED RESULTS SUMMARY
-- ============================================
-- Before indexes:
--   - Sequential Scans on large tables
--   - High buffer reads
--   - Execution times in 100s of milliseconds
--   - Low index usage percentage
--
-- After indexes:
--   - Index Scans or Bitmap Index Scans
--   - Lower buffer reads
--   - Execution times in single-digit milliseconds
--   - High index usage percentage (>90%)
-- ============================================