/**
 * Database index definitions and optimization strategies
 *
 * These indexes are designed to optimize the most common query patterns
 * in the MyPokies casino platform
 */

import { sql } from 'drizzle-orm'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface IndexDefinition {
  name: string
  table: string
  columns: string[]
  unique?: boolean
  partial?: string
  type?: 'btree' | 'hash' | 'gin' | 'gist'
  description: string
}

/**
 * Critical indexes for the casino platform
 */
export const CRITICAL_INDEXES: IndexDefinition[] = [
  // ============================================================================
  // User Indexes
  // ============================================================================
  {
    name: 'idx_users_auth_user_id',
    table: 'users',
    columns: ['auth_user_id'],
    unique: true,
    description: 'Fast lookup by Supabase auth ID',
  },
  {
    name: 'idx_users_external_user_id',
    table: 'users',
    columns: ['external_user_id'],
    unique: true,
    description: 'Fast lookup by Fundist user ID',
  },
  {
    name: 'idx_users_email',
    table: 'users',
    columns: ['email'],
    description: 'Email lookups for login and verification',
  },
  {
    name: 'idx_users_phone_verified',
    table: 'users',
    columns: ['phone_verified', 'created_at'],
    partial: 'WHERE phone_verified = true',
    description: 'Find verified phone users for bonus eligibility',
  },

  // ============================================================================
  // Balance Indexes
  // ============================================================================
  {
    name: 'idx_user_balances_user_currency',
    table: 'user_balances',
    columns: ['user_id', 'currency'],
    unique: true,
    description: 'Unique constraint and fast balance lookups',
  },
  {
    name: 'idx_user_balances_updated',
    table: 'user_balances',
    columns: ['updated_at'],
    description: 'For real-time balance update queries',
  },

  // ============================================================================
  // Transaction Indexes
  // ============================================================================
  {
    name: 'idx_transactions_user_created',
    table: 'transactions',
    columns: ['user_id', 'created_at DESC'],
    description: 'User transaction history (most recent first)',
  },
  {
    name: 'idx_transactions_tid',
    table: 'transactions',
    columns: ['tid'],
    unique: true,
    description: 'Fast transaction lookup by ID',
  },
  {
    name: 'idx_transactions_game_round',
    table: 'transactions',
    columns: ['game_round_id'],
    partial: 'WHERE game_round_id IS NOT NULL',
    description: 'Find all transactions for a game round',
  },
  {
    name: 'idx_transactions_type_created',
    table: 'transactions',
    columns: ['type', 'created_at DESC'],
    description: 'Transaction reports by type',
  },
  {
    name: 'idx_transactions_rollback',
    table: 'transactions',
    columns: ['rollback_tid'],
    partial: 'WHERE rollback_tid IS NOT NULL',
    description: 'Fast rollback transaction lookup',
  },

  // ============================================================================
  // Game Round Indexes
  // ============================================================================
  {
    name: 'idx_game_rounds_user_started',
    table: 'game_rounds',
    columns: ['user_id', 'started_at DESC'],
    description: 'User game history (most recent first)',
  },
  {
    name: 'idx_game_rounds_id_unique',
    table: 'game_rounds',
    columns: ['game_round_id'],
    unique: true,
    description: 'Unique game round lookup',
  },
  {
    name: 'idx_game_rounds_status',
    table: 'game_rounds',
    columns: ['status', 'started_at DESC'],
    description: 'Active/completed game rounds',
  },

  // ============================================================================
  // Loyalty Program Indexes
  // ============================================================================
  {
    name: 'idx_player_loyalty_user',
    table: 'player_loyalty',
    columns: ['user_id'],
    unique: true,
    description: 'Fast loyalty status lookup',
  },
  {
    name: 'idx_player_loyalty_tier_points',
    table: 'player_loyalty',
    columns: ['tier_level', 'total_points DESC'],
    description: 'Tier leaderboards',
  },
  {
    name: 'idx_loyalty_points_user_created',
    table: 'loyalty_points_transactions',
    columns: ['user_id', 'created_at DESC'],
    description: 'Points earning history',
  },

  // ============================================================================
  // Jackpot Indexes
  // ============================================================================
  {
    name: 'idx_jackpot_tickets_user_draw',
    table: 'jackpot_tickets',
    columns: ['user_id', 'draw_id'],
    description: 'User tickets for a specific draw',
  },
  {
    name: 'idx_jackpot_tickets_draw_number',
    table: 'jackpot_tickets',
    columns: ['draw_id', 'ticket_number'],
    unique: true,
    description: 'Unique ticket number per draw',
  },
  {
    name: 'idx_jackpot_winners_draw',
    table: 'jackpot_winners',
    columns: ['draw_id'],
    description: 'Winners for a draw',
  },
  {
    name: 'idx_jackpot_winners_user',
    table: 'jackpot_winners',
    columns: ['user_id', 'won_at DESC'],
    description: 'User jackpot win history',
  },
  {
    name: 'idx_player_ticket_counts_user_pool',
    table: 'player_ticket_counts',
    columns: ['user_id', 'pool_id'],
    unique: true,
    description: 'Fast ticket count lookup',
  },

  // ============================================================================
  // Bonus Indexes
  // ============================================================================
  {
    name: 'idx_player_bonuses_user_status',
    table: 'player_bonuses',
    columns: ['user_id', 'status'],
    description: 'Active bonuses for a user',
  },
  {
    name: 'idx_player_bonuses_expires',
    table: 'player_bonuses',
    columns: ['expires_at'],
    partial: "WHERE status = 'active' AND expires_at IS NOT NULL",
    description: 'Find expiring bonuses',
  },
  {
    name: 'idx_bonus_wagering_user_bonus',
    table: 'bonus_wagering_contributions',
    columns: ['user_id', 'player_bonus_id'],
    description: 'Wagering progress tracking',
  },
  {
    name: 'idx_ai_offered_bonuses_user',
    table: 'ai_offered_bonuses',
    columns: ['user_id', 'offered_at DESC'],
    description: 'AI bonus offers history',
  },

  // ============================================================================
  // SMS/CRM Indexes
  // ============================================================================
  {
    name: 'idx_sms_messages_phone_created',
    table: 'sms_messages',
    columns: ['phone_number', 'created_at DESC'],
    description: 'SMS conversation history',
  },
  {
    name: 'idx_sms_conversations_phone',
    table: 'sms_conversations',
    columns: ['phone_number'],
    unique: true,
    description: 'Fast conversation lookup',
  },
  {
    name: 'idx_pending_ai_replies_process',
    table: 'pending_ai_auto_replies',
    columns: ['process_after', 'processed'],
    partial: 'WHERE processed = false',
    description: 'Pending replies queue',
  },

  // ============================================================================
  // Admin/Audit Indexes
  // ============================================================================
  {
    name: 'idx_admin_audit_logs_admin_created',
    table: 'admin_audit_logs',
    columns: ['admin_id', 'created_at DESC'],
    description: 'Admin action history',
  },
  {
    name: 'idx_admin_audit_logs_action_created',
    table: 'admin_audit_logs',
    columns: ['action', 'created_at DESC'],
    description: 'Audit log by action type',
  },
  {
    name: 'idx_admin_player_actions_player',
    table: 'admin_player_actions',
    columns: ['player_id', 'created_at DESC'],
    description: 'Admin actions on specific player',
  },

  // ============================================================================
  // Callback Logs Indexes
  // ============================================================================
  {
    name: 'idx_callback_logs_created',
    table: 'callback_logs',
    columns: ['created_at DESC'],
    description: 'Recent callbacks',
  },
  {
    name: 'idx_callback_logs_hmac_failed',
    table: 'callback_logs',
    columns: ['hmac_valid', 'created_at DESC'],
    partial: 'WHERE hmac_valid = false',
    description: 'Failed HMAC validations',
  },
]

/**
 * Performance indexes for analytics and reporting
 */
export const PERFORMANCE_INDEXES: IndexDefinition[] = [
  {
    name: 'idx_transactions_daily_stats',
    table: 'transactions',
    columns: ['DATE(created_at)', 'type', 'currency'],
    description: 'Daily transaction statistics',
  },
  {
    name: 'idx_game_rounds_daily_stats',
    table: 'game_rounds',
    columns: ['DATE(started_at)', 'status'],
    description: 'Daily game statistics',
  },
  {
    name: 'idx_users_registration_date',
    table: 'users',
    columns: ['DATE(created_at)'],
    description: 'User registration cohorts',
  },
  {
    name: 'idx_transactions_amount_range',
    table: 'transactions',
    columns: ['currency', 'amount'],
    description: 'Transaction amount analysis',
  },
]

/**
 * Create an index in the database
 */
export async function createIndex(
  supabase: SupabaseClient,
  index: IndexDefinition
): Promise<{ success: boolean; error?: string }> {
  const columns = index.columns.join(', ')
  const indexType = index.type || 'btree'
  const unique = index.unique ? 'UNIQUE' : ''
  const partial = index.partial ? `WHERE ${index.partial}` : ''

  const query = `
    CREATE ${unique} INDEX IF NOT EXISTS ${index.name}
    ON ${index.table} USING ${indexType} (${columns})
    ${partial};
  `

  try {
    const { error } = await supabase.rpc('execute_sql', { query })
    if (error) throw error
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Drop an index from the database
 */
export async function dropIndex(
  supabase: SupabaseClient,
  indexName: string
): Promise<{ success: boolean; error?: string }> {
  const query = `DROP INDEX IF EXISTS ${indexName};`

  try {
    const { error } = await supabase.rpc('execute_sql', { query })
    if (error) throw error
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if an index exists
 */
export async function indexExists(
  supabase: SupabaseClient,
  indexName: string
): Promise<boolean> {
  const query = `
    SELECT 1 FROM pg_indexes
    WHERE indexname = $1
  `

  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params: [indexName]
    })
    if (error) throw error
    return data && data.length > 0
  } catch {
    return false
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats(
  supabase: SupabaseClient,
  tableName?: string
): Promise<any[]> {
  const query = `
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan as index_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched,
      pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_stat_user_indexes
    ${tableName ? `WHERE tablename = $1` : ''}
    ORDER BY idx_scan DESC
  `

  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params: tableName ? [tableName] : []
    })
    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

/**
 * Apply all critical indexes
 */
export async function applyCriticalIndexes(
  supabase: SupabaseClient
): Promise<{ created: string[]; failed: string[]; errors: Record<string, string> }> {
  const created: string[] = []
  const failed: string[] = []
  const errors: Record<string, string> = {}

  for (const index of CRITICAL_INDEXES) {
    const result = await createIndex(supabase, index)
    if (result.success) {
      created.push(index.name)
    } else {
      failed.push(index.name)
      errors[index.name] = result.error || 'Unknown error'
    }
  }

  return { created, failed, errors }
}

/**
 * Apply performance indexes
 */
export async function applyPerformanceIndexes(
  supabase: SupabaseClient
): Promise<{ created: string[]; failed: string[]; errors: Record<string, string> }> {
  const created: string[] = []
  const failed: string[] = []
  const errors: Record<string, string> = {}

  for (const index of PERFORMANCE_INDEXES) {
    const result = await createIndex(supabase, index)
    if (result.success) {
      created.push(index.name)
    } else {
      failed.push(index.name)
      errors[index.name] = result.error || 'Unknown error'
    }
  }

  return { created, failed, errors }
}