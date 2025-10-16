/**
 * Query optimization utilities and patterns
 */

import { sql } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Query performance metrics
 */
export interface QueryMetrics {
  query: string
  executionTime: number
  rowCount: number
  cached: boolean
  timestamp: Date
}

/**
 * Query optimization hints
 */
export interface OptimizationHint {
  type: 'index' | 'query' | 'schema' | 'cache'
  severity: 'low' | 'medium' | 'high'
  message: string
  suggestion: string
}

/**
 * Query optimizer class
 */
export class QueryOptimizer {
  private metrics: Map<string, QueryMetrics[]> = new Map()
  private slowQueryThreshold = 100 // ms

  constructor(
    private supabase?: SupabaseClient,
    private db?: PostgresJsDatabase<any>
  ) {}

  /**
   * Analyze query execution plan
   */
  async analyzeQuery(query: string): Promise<{
    plan: any
    hints: OptimizationHint[]
  }> {
    if (!this.supabase) {
      throw new Error('Supabase client required for query analysis')
    }

    // Get query execution plan
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`
    const { data: planData, error } = await this.supabase.rpc('execute_sql', {
      query: explainQuery
    })

    if (error) {
      throw new Error(`Failed to analyze query: ${error.message}`)
    }

    const plan = planData?.[0]?.['QUERY PLAN']?.[0]
    const hints = this.generateHints(plan)

    return { plan, hints }
  }

  /**
   * Generate optimization hints from execution plan
   */
  private generateHints(plan: any): OptimizationHint[] {
    const hints: OptimizationHint[] = []

    if (!plan) return hints

    // Check for sequential scans on large tables
    if (plan['Node Type'] === 'Seq Scan' && plan['Actual Rows'] > 1000) {
      hints.push({
        type: 'index',
        severity: 'high',
        message: `Sequential scan on ${plan['Relation Name']} with ${plan['Actual Rows']} rows`,
        suggestion: `Consider adding an index on frequently queried columns`
      })
    }

    // Check for high execution time
    const executionTime = plan['Actual Total Time']
    if (executionTime > this.slowQueryThreshold) {
      hints.push({
        type: 'query',
        severity: 'medium',
        message: `Query execution time ${executionTime}ms exceeds threshold`,
        suggestion: 'Consider query optimization or caching'
      })
    }

    // Check for missing index on join columns
    if (plan['Node Type'] === 'Hash Join' || plan['Node Type'] === 'Nested Loop') {
      const innerPlan = plan['Plans']?.[1]
      if (innerPlan?.['Node Type'] === 'Seq Scan') {
        hints.push({
          type: 'index',
          severity: 'high',
          message: `Join without index on ${innerPlan['Relation Name']}`,
          suggestion: `Add index on join column for ${innerPlan['Relation Name']}`
        })
      }
    }

    // Check for sort operations
    if (plan['Node Type'] === 'Sort' && plan['Actual Rows'] > 500) {
      hints.push({
        type: 'index',
        severity: 'medium',
        message: `Sorting ${plan['Actual Rows']} rows in memory`,
        suggestion: 'Consider adding an index on the ORDER BY columns'
      })
    }

    return hints
  }

  /**
   * Track query performance
   */
  trackQuery(queryKey: string, metrics: Omit<QueryMetrics, 'timestamp'>): void {
    if (!this.metrics.has(queryKey)) {
      this.metrics.set(queryKey, [])
    }

    this.metrics.get(queryKey)!.push({
      ...metrics,
      timestamp: new Date()
    })

    // Keep only last 100 entries per query
    const entries = this.metrics.get(queryKey)!
    if (entries.length > 100) {
      this.metrics.set(queryKey, entries.slice(-100))
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold?: number): Array<{
    query: string
    avgTime: number
    maxTime: number
    count: number
  }> {
    const slowThreshold = threshold || this.slowQueryThreshold
    const slowQueries: Array<{
      query: string
      avgTime: number
      maxTime: number
      count: number
    }> = []

    for (const [query, metrics] of this.metrics) {
      const times = metrics.map(m => m.executionTime)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxTime = Math.max(...times)

      if (avgTime > slowThreshold) {
        slowQueries.push({
          query,
          avgTime,
          maxTime,
          count: metrics.length
        })
      }
    }

    return slowQueries.sort((a, b) => b.avgTime - a.avgTime)
  }

  /**
   * Optimize common query patterns
   */
  optimizePattern(pattern: string): string {
    // Optimize SELECT *
    if (pattern.includes('SELECT *')) {
      return pattern.replace('SELECT *', 'SELECT /* specify columns */')
    }

    // Optimize LIKE with wildcards
    if (pattern.includes("LIKE '%")) {
      return pattern.replace("LIKE '%", "/* Consider full-text search */ LIKE '%")
    }

    // Optimize NOT IN with subquery
    if (pattern.includes('NOT IN (SELECT')) {
      return pattern.replace('NOT IN (SELECT', 'NOT EXISTS (SELECT 1 FROM')
    }

    // Optimize OR conditions
    if (pattern.includes(' OR ')) {
      return pattern + ' /* Consider using UNION for OR conditions */'
    }

    return pattern
  }

  /**
   * Get table statistics
   */
  async getTableStats(tableName: string): Promise<{
    rowCount: number
    tableSize: string
    indexSize: string
    lastVacuum: Date | null
    lastAnalyze: Date | null
  }> {
    if (!this.supabase) {
      throw new Error('Supabase client required for table statistics')
    }

    const query = `
      SELECT
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as table_size,
        pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables s
      JOIN pg_class c ON c.relname = s.relname
      WHERE s.relname = $1
    `

    const { data, error } = await this.supabase.rpc('execute_sql', {
      query,
      params: [tableName]
    })

    if (error) {
      throw new Error(`Failed to get table stats: ${error.message}`)
    }

    const stats = data?.[0]
    return {
      rowCount: stats?.row_count || 0,
      tableSize: stats?.table_size || '0',
      indexSize: stats?.index_size || '0',
      lastVacuum: stats?.last_vacuum ? new Date(stats.last_vacuum) : null,
      lastAnalyze: stats?.last_analyze ? new Date(stats.last_analyze) : null
    }
  }

  /**
   * Suggest missing indexes based on query patterns
   */
  async suggestIndexes(): Promise<Array<{
    table: string
    columns: string[]
    reason: string
    estimatedImprovement: string
  }>> {
    if (!this.supabase) {
      throw new Error('Supabase client required for index suggestions')
    }

    const query = `
      SELECT
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation,
        null_frac
      FROM pg_stats
      WHERE schemaname = 'public'
        AND n_distinct > 100
        AND correlation < 0.5
      ORDER BY n_distinct DESC
      LIMIT 20
    `

    const { data, error } = await this.supabase.rpc('execute_sql', { query })

    if (error) {
      throw new Error(`Failed to analyze statistics: ${error.message}`)
    }

    const suggestions: Array<{
      table: string
      columns: string[]
      reason: string
      estimatedImprovement: string
    }> = []

    // Analyze high cardinality columns with low correlation
    for (const stat of data || []) {
      if (stat.n_distinct > 1000 && Math.abs(stat.correlation) < 0.3) {
        suggestions.push({
          table: stat.tablename,
          columns: [stat.attname],
          reason: `High cardinality (${stat.n_distinct}) with low correlation`,
          estimatedImprovement: 'High'
        })
      }
    }

    return suggestions
  }

  /**
   * Vacuum and analyze tables
   */
  async optimizeTables(tables?: string[]): Promise<{
    vacuumed: string[]
    analyzed: string[]
    errors: Record<string, string>
  }> {
    if (!this.supabase) {
      throw new Error('Supabase client required for table optimization')
    }

    const vacuumed: string[] = []
    const analyzed: string[] = []
    const errors: Record<string, string> = {}

    const tablesToOptimize = tables || [
      'users',
      'transactions',
      'game_rounds',
      'player_bonuses',
      'jackpot_tickets'
    ]

    for (const table of tablesToOptimize) {
      try {
        // Vacuum table
        await this.supabase.rpc('execute_sql', {
          query: `VACUUM ANALYZE ${table}`
        })
        vacuumed.push(table)
        analyzed.push(table)
      } catch (error) {
        errors[table] = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return { vacuumed, analyzed, errors }
  }
}

/**
 * Common optimized query patterns
 */
export const OPTIMIZED_PATTERNS = {
  /**
   * Get user with balances (optimized with single query)
   */
  getUserWithBalances: sql`
    SELECT
      u.*,
      COALESCE(
        json_agg(
          json_build_object(
            'currency', b.currency,
            'balance', b.balance,
            'bonus_balance', b.bonus_balance,
            'locked_bonus', b.locked_bonus
          ) ORDER BY b.currency
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) as balances
    FROM users u
    LEFT JOIN user_balances b ON b.user_id = u.id
    WHERE u.id = $1
    GROUP BY u.id
  `,

  /**
   * Get recent transactions with pagination (optimized with index)
   */
  getRecentTransactions: sql`
    SELECT *
    FROM transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,

  /**
   * Get active bonuses with wagering progress (optimized join)
   */
  getActiveBonuses: sql`
    SELECT
      pb.*,
      bo.bonus_name,
      bo.bonus_code,
      bo.match_percentage,
      COALESCE(SUM(bwc.contribution_amount), 0) as wagering_progress
    FROM player_bonuses pb
    JOIN bonus_offers bo ON bo.id = pb.bonus_offer_id
    LEFT JOIN bonus_wagering_contributions bwc ON bwc.player_bonus_id = pb.id
    WHERE pb.user_id = $1
      AND pb.status = 'active'
    GROUP BY pb.id, bo.id
  `,

  /**
   * Get loyalty status with tier info (optimized single query)
   */
  getLoyaltyStatus: sql`
    SELECT
      pl.*,
      lt.tier_name,
      lt.points_required,
      lt.benefits,
      LEAD(lt.points_required) OVER (ORDER BY lt.tier_level) as next_tier_points
    FROM player_loyalty pl
    JOIN loyalty_tiers lt ON lt.tier_level = pl.tier_level
    WHERE pl.user_id = $1
  `,

  /**
   * Get jackpot tickets with odds (optimized aggregation)
   */
  getJackpotOdds: sql`
    SELECT
      ptc.ticket_count,
      ptc.pool_id,
      jp.current_amount,
      jp.draw_date,
      (ptc.ticket_count::float / NULLIF(SUM(ptc.ticket_count) OVER (), 0)) * 100 as win_percentage
    FROM player_ticket_counts ptc
    JOIN jackpot_pools jp ON jp.id = ptc.pool_id
    WHERE ptc.user_id = $1
      AND jp.status = 'active'
  `,

  /**
   * Get daily statistics (optimized with date index)
   */
  getDailyStats: sql`
    SELECT
      DATE(created_at) as date,
      COUNT(*) FILTER (WHERE type = 'debit') as total_bets,
      COUNT(*) FILTER (WHERE type = 'credit') as total_wins,
      SUM(amount) FILTER (WHERE type = 'debit') as total_wagered,
      SUM(amount) FILTER (WHERE type = 'credit') as total_won
    FROM transactions
    WHERE user_id = $1
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `,
}

/**
 * Export query optimizer instance
 */
export const queryOptimizer = new QueryOptimizer()