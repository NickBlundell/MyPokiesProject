/**
 * Database migration scripts for optimization
 */

export interface Migration {
  name: string
  description: string
  up: string
  down: string
}

export const databaseMigrations: Migration[] = [
  {
    name: '001_create_core_indexes',
    description: 'Create core performance indexes for user and transaction tables',
    up: `
      -- User indexes
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_user_id ON users(external_user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified, created_at)
        WHERE phone_verified = true;

      -- Balance indexes
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_balances_user_currency ON user_balances(user_id, currency);
      CREATE INDEX IF NOT EXISTS idx_user_balances_updated ON user_balances(updated_at);

      -- Transaction indexes
      CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tid ON transactions(tid);
      CREATE INDEX IF NOT EXISTS idx_transactions_game_round ON transactions(game_round_id)
        WHERE game_round_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_transactions_type_created ON transactions(type, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_rollback ON transactions(rollback_tid)
        WHERE rollback_tid IS NOT NULL;

      -- Game round indexes
      CREATE INDEX IF NOT EXISTS idx_game_rounds_user_started ON game_rounds(user_id, started_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_game_rounds_id_unique ON game_rounds(game_round_id);
      CREATE INDEX IF NOT EXISTS idx_game_rounds_status ON game_rounds(status, started_at DESC);
    `,
    down: `
      DROP INDEX IF EXISTS idx_users_auth_user_id;
      DROP INDEX IF EXISTS idx_users_external_user_id;
      DROP INDEX IF EXISTS idx_users_email;
      DROP INDEX IF EXISTS idx_users_phone_verified;
      DROP INDEX IF EXISTS idx_user_balances_user_currency;
      DROP INDEX IF EXISTS idx_user_balances_updated;
      DROP INDEX IF EXISTS idx_transactions_user_created;
      DROP INDEX IF EXISTS idx_transactions_tid;
      DROP INDEX IF EXISTS idx_transactions_game_round;
      DROP INDEX IF EXISTS idx_transactions_type_created;
      DROP INDEX IF EXISTS idx_transactions_rollback;
      DROP INDEX IF EXISTS idx_game_rounds_user_started;
      DROP INDEX IF EXISTS idx_game_rounds_id_unique;
      DROP INDEX IF EXISTS idx_game_rounds_status;
    `
  },
  {
    name: '002_create_loyalty_indexes',
    description: 'Create indexes for loyalty program tables',
    up: `
      -- Loyalty indexes
      CREATE UNIQUE INDEX IF NOT EXISTS idx_player_loyalty_user ON player_loyalty(user_id);
      CREATE INDEX IF NOT EXISTS idx_player_loyalty_tier_points ON player_loyalty(tier_level, total_points DESC);
      CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_created ON loyalty_points_transactions(user_id, created_at DESC);
    `,
    down: `
      DROP INDEX IF EXISTS idx_player_loyalty_user;
      DROP INDEX IF EXISTS idx_player_loyalty_tier_points;
      DROP INDEX IF EXISTS idx_loyalty_points_user_created;
    `
  },
  {
    name: '003_create_jackpot_indexes',
    description: 'Create indexes for jackpot system tables',
    up: `
      -- Jackpot indexes
      CREATE INDEX IF NOT EXISTS idx_jackpot_tickets_user_draw ON jackpot_tickets(user_id, draw_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jackpot_tickets_draw_number ON jackpot_tickets(draw_id, ticket_number);
      CREATE INDEX IF NOT EXISTS idx_jackpot_winners_draw ON jackpot_winners(draw_id);
      CREATE INDEX IF NOT EXISTS idx_jackpot_winners_user ON jackpot_winners(user_id, won_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_player_ticket_counts_user_pool ON player_ticket_counts(user_id, pool_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_jackpot_tickets_user_draw;
      DROP INDEX IF EXISTS idx_jackpot_tickets_draw_number;
      DROP INDEX IF EXISTS idx_jackpot_winners_draw;
      DROP INDEX IF EXISTS idx_jackpot_winners_user;
      DROP INDEX IF EXISTS idx_player_ticket_counts_user_pool;
    `
  },
  {
    name: '004_create_bonus_indexes',
    description: 'Create indexes for bonus system tables',
    up: `
      -- Bonus indexes
      CREATE INDEX IF NOT EXISTS idx_player_bonuses_user_status ON player_bonuses(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_player_bonuses_expires ON player_bonuses(expires_at)
        WHERE status = 'active' AND expires_at IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_bonus_wagering_user_bonus ON bonus_wagering_contributions(user_id, player_bonus_id);
      CREATE INDEX IF NOT EXISTS idx_ai_offered_bonuses_user ON ai_offered_bonuses(user_id, offered_at DESC);
    `,
    down: `
      DROP INDEX IF EXISTS idx_player_bonuses_user_status;
      DROP INDEX IF EXISTS idx_player_bonuses_expires;
      DROP INDEX IF EXISTS idx_bonus_wagering_user_bonus;
      DROP INDEX IF EXISTS idx_ai_offered_bonuses_user;
    `
  },
  {
    name: '005_create_sms_crm_indexes',
    description: 'Create indexes for SMS and CRM tables',
    up: `
      -- SMS/CRM indexes
      CREATE INDEX IF NOT EXISTS idx_sms_messages_phone_created ON sms_messages(phone_number, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_conversations_phone ON sms_conversations(phone_number);
      CREATE INDEX IF NOT EXISTS idx_pending_ai_replies_process ON pending_ai_auto_replies(process_after, processed)
        WHERE processed = false;
    `,
    down: `
      DROP INDEX IF EXISTS idx_sms_messages_phone_created;
      DROP INDEX IF EXISTS idx_sms_conversations_phone;
      DROP INDEX IF EXISTS idx_pending_ai_replies_process;
    `
  },
  {
    name: '006_create_admin_audit_indexes',
    description: 'Create indexes for admin and audit tables',
    up: `
      -- Admin/Audit indexes
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_created ON admin_audit_logs(admin_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_created ON admin_audit_logs(action, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_admin_player_actions_player ON admin_player_actions(player_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_callback_logs_created ON callback_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_callback_logs_hmac_failed ON callback_logs(hmac_valid, created_at DESC)
        WHERE hmac_valid = false;
    `,
    down: `
      DROP INDEX IF EXISTS idx_admin_audit_logs_admin_created;
      DROP INDEX IF EXISTS idx_admin_audit_logs_action_created;
      DROP INDEX IF EXISTS idx_admin_player_actions_player;
      DROP INDEX IF EXISTS idx_callback_logs_created;
      DROP INDEX IF EXISTS idx_callback_logs_hmac_failed;
    `
  },
  {
    name: '007_create_analytics_indexes',
    description: 'Create indexes for analytics and reporting',
    up: `
      -- Analytics indexes
      CREATE INDEX IF NOT EXISTS idx_transactions_daily_stats ON transactions(DATE(created_at), type, currency);
      CREATE INDEX IF NOT EXISTS idx_game_rounds_daily_stats ON game_rounds(DATE(started_at), status);
      CREATE INDEX IF NOT EXISTS idx_users_registration_date ON users(DATE(created_at));
      CREATE INDEX IF NOT EXISTS idx_transactions_amount_range ON transactions(currency, amount);
    `,
    down: `
      DROP INDEX IF EXISTS idx_transactions_daily_stats;
      DROP INDEX IF EXISTS idx_game_rounds_daily_stats;
      DROP INDEX IF EXISTS idx_users_registration_date;
      DROP INDEX IF EXISTS idx_transactions_amount_range;
    `
  },
  {
    name: '008_create_materialized_views',
    description: 'Create materialized views for performance',
    up: `
      -- Daily transaction summary
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_transaction_summary AS
      SELECT
        DATE(created_at) as date,
        user_id,
        currency,
        COUNT(*) FILTER (WHERE type = 'debit') as total_bets,
        COUNT(*) FILTER (WHERE type = 'credit') as total_wins,
        SUM(amount) FILTER (WHERE type = 'debit') as total_wagered,
        SUM(amount) FILTER (WHERE type = 'credit') as total_won
      FROM transactions
      GROUP BY DATE(created_at), user_id, currency;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_transaction_summary
        ON mv_daily_transaction_summary(date, user_id, currency);

      -- Player value segments
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_player_value_segments AS
      SELECT
        u.id as user_id,
        u.created_at,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit'), 0) as lifetime_wagered,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit'), 0) as lifetime_won,
        COUNT(DISTINCT DATE(t.created_at)) as active_days,
        MAX(t.created_at) as last_activity,
        CASE
          WHEN COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit'), 0) >= 10000 THEN 'vip'
          WHEN COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit'), 0) >= 1000 THEN 'high_value'
          WHEN COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'debit'), 0) >= 100 THEN 'regular'
          ELSE 'casual'
        END as segment
      FROM users u
      LEFT JOIN transactions t ON t.user_id = u.id
      GROUP BY u.id, u.created_at;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_player_value_segments_user
        ON mv_player_value_segments(user_id);
      CREATE INDEX IF NOT EXISTS idx_mv_player_value_segments_segment
        ON mv_player_value_segments(segment, lifetime_wagered DESC);
    `,
    down: `
      DROP MATERIALIZED VIEW IF EXISTS mv_daily_transaction_summary;
      DROP MATERIALIZED VIEW IF EXISTS mv_player_value_segments;
    `
  },
  {
    name: '009_optimize_table_settings',
    description: 'Optimize table settings for performance',
    up: `
      -- Set appropriate fill factors
      ALTER TABLE transactions SET (fillfactor = 90);
      ALTER TABLE game_rounds SET (fillfactor = 90);
      ALTER TABLE user_balances SET (fillfactor = 80);
      ALTER TABLE jackpot_tickets SET (fillfactor = 95);

      -- Enable autovacuum with optimized settings
      ALTER TABLE transactions SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      );
      ALTER TABLE game_rounds SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      );
      ALTER TABLE sms_messages SET (
        autovacuum_vacuum_scale_factor = 0.2,
        autovacuum_analyze_scale_factor = 0.1
      );

      -- Update table statistics
      ANALYZE transactions;
      ANALYZE game_rounds;
      ANALYZE users;
      ANALYZE user_balances;
      ANALYZE player_bonuses;
    `,
    down: `
      -- Reset to default fill factors
      ALTER TABLE transactions RESET (fillfactor);
      ALTER TABLE game_rounds RESET (fillfactor);
      ALTER TABLE user_balances RESET (fillfactor);
      ALTER TABLE jackpot_tickets RESET (fillfactor);

      -- Reset autovacuum settings
      ALTER TABLE transactions RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
      ALTER TABLE game_rounds RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
      ALTER TABLE sms_messages RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
    `
  },
  {
    name: '010_create_refresh_functions',
    description: 'Create functions to refresh materialized views',
    up: `
      -- Function to refresh all materialized views
      CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_transaction_summary;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_player_value_segments;
      END;
      $$ LANGUAGE plpgsql;

      -- Schedule refresh (via cron or external scheduler)
      -- Example: SELECT cron.schedule('refresh-mvs', '0 */6 * * *', 'SELECT refresh_all_materialized_views()');
    `,
    down: `
      DROP FUNCTION IF EXISTS refresh_all_materialized_views();
    `
  }
]

/**
 * Apply a migration
 */
export async function applyMigration(
  client: any,
  migration: Migration,
  direction: 'up' | 'down' = 'up'
): Promise<{ success: boolean; error?: string }> {
  try {
    const sql = direction === 'up' ? migration.up : migration.down
    await client.query(sql)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Apply all migrations
 */
export async function applyAllMigrations(
  client: any,
  direction: 'up' | 'down' = 'up'
): Promise<{
  applied: string[]
  failed: string[]
  errors: Record<string, string>
}> {
  const applied: string[] = []
  const failed: string[] = []
  const errors: Record<string, string> = {}

  const migrations = direction === 'up'
    ? databaseMigrations
    : [...databaseMigrations].reverse()

  for (const migration of migrations) {
    const result = await applyMigration(client, migration, direction)
    if (result.success) {
      applied.push(migration.name)
    } else {
      failed.push(migration.name)
      errors[migration.name] = result.error || 'Unknown error'
    }
  }

  return { applied, failed, errors }
}