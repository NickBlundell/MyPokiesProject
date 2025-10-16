/**
 * Database connection pooling and optimization
 */

import { Pool, PoolConfig } from 'pg'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export interface PoolOptions {
  connectionString: string
  max?: number // Maximum number of connections
  min?: number // Minimum number of connections
  idleTimeoutMillis?: number // How long a connection can be idle
  connectionTimeoutMillis?: number // How long to wait for connection
  maxUses?: number // Max times a connection can be reused
  statementTimeout?: number // Statement timeout in ms
}

/**
 * Optimized connection pool manager
 */
export class ConnectionPoolManager {
  private pool: Pool | null = null
  private postgresClient: ReturnType<typeof postgres> | null = null
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    errors: 0,
  }

  constructor(private options: PoolOptions) {}

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    const poolConfig: PoolConfig = {
      connectionString: this.options.connectionString,
      max: this.options.max || 20,
      min: this.options.min || 2,
      idleTimeoutMillis: this.options.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: this.options.connectionTimeoutMillis || 5000,
      statement_timeout: this.options.statementTimeout || 30000,
    }

    this.pool = new Pool(poolConfig)

    // Set up pool event handlers
    this.pool.on('connect', () => {
      this.metrics.totalConnections++
      this.metrics.activeConnections++
    })

    this.pool.on('acquire', () => {
      this.metrics.activeConnections++
      this.metrics.idleConnections--
    })

    this.pool.on('release', () => {
      this.metrics.activeConnections--
      this.metrics.idleConnections++
    })

    this.pool.on('error', () => {
      this.metrics.errors++
    })

    // Initialize postgres client for Drizzle
    this.postgresClient = postgres(this.options.connectionString, {
      max: this.options.max || 20,
      idle_timeout: (this.options.idleTimeoutMillis || 30000) / 1000,
      connect_timeout: (this.options.connectionTimeoutMillis || 5000) / 1000,
      max_lifetime: this.options.maxUses ? 60 * 60 : undefined, // 1 hour if maxUses set
    })
  }

  /**
   * Get a client from the pool
   */
  async getClient() {
    if (!this.pool) {
      throw new Error('Pool not initialized. Call initialize() first.')
    }
    return await this.pool.connect()
  }

  /**
   * Get Drizzle instance
   */
  getDrizzle() {
    if (!this.postgresClient) {
      throw new Error('Postgres client not initialized. Call initialize() first.')
    }
    return drizzle(this.postgresClient)
  }

  /**
   * Execute a query with automatic client management
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(text, params)
      return result.rows as T[]
    } finally {
      client.release()
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T = any>(
    queries: Array<{ text: string; params?: any[] }>
  ): Promise<T[]> {
    const client = await this.getClient()
    const results: T[] = []

    try {
      await client.query('BEGIN')

      for (const query of queries) {
        const result = await client.query(query.text, query.params)
        results.push(result.rows as T)
      }

      await client.query('COMMIT')
      return results
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get pool metrics
   */
  getMetrics() {
    if (!this.pool) {
      return this.metrics
    }

    return {
      ...this.metrics,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean
    latency: number
    connections: number
  }> {
    const start = Date.now()

    try {
      const result = await this.query('SELECT 1')
      const latency = Date.now() - start

      return {
        healthy: result.length === 1,
        latency,
        connections: this.pool?.totalCount || 0,
      }
    } catch {
      return {
        healthy: false,
        latency: Date.now() - start,
        connections: 0,
      }
    }
  }

  /**
   * Gracefully close the pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }

    if (this.postgresClient) {
      await this.postgresClient.end()
      this.postgresClient = null
    }
  }

  /**
   * Optimize pool configuration based on usage
   */
  optimizePool(): { recommendations: string[] } {
    const recommendations: string[] = []
    const metrics = this.getMetrics()

    // Check if pool size is appropriate
    if (metrics.waitingRequests > 0) {
      recommendations.push(
        `Consider increasing max pool size. Currently ${metrics.waitingRequests} requests waiting.`
      )
    }

    // Check if too many idle connections
    if (metrics.idleConnections > metrics.activeConnections * 2) {
      recommendations.push(
        `Consider decreasing min pool size. Too many idle connections (${metrics.idleConnections}).`
      )
    }

    // Check error rate
    if (metrics.errors > metrics.totalConnections * 0.05) {
      recommendations.push(
        `High error rate detected (${metrics.errors} errors). Check connection stability.`
      )
    }

    return { recommendations }
  }
}

/**
 * Query batcher for reducing database round trips
 */
export class QueryBatcher {
  private batch: Array<{
    query: string
    params?: any[]
    resolve: (value: any) => void
    reject: (error: any) => void
  }> = []

  private batchTimeout: NodeJS.Timeout | null = null
  private batchSize = 10
  private batchDelay = 10 // ms

  constructor(
    private pool: ConnectionPoolManager,
    options?: {
      batchSize?: number
      batchDelay?: number
    }
  ) {
    if (options?.batchSize) this.batchSize = options.batchSize
    if (options?.batchDelay) this.batchDelay = options.batchDelay
  }

  /**
   * Add query to batch
   */
  async add<T = any>(query: string, params?: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batch.push({ query, params, resolve, reject })

      // Process batch if it reaches the size limit
      if (this.batch.length >= this.batchSize) {
        this.flush()
      } else {
        // Schedule batch processing
        if (!this.batchTimeout) {
          this.batchTimeout = setTimeout(() => this.flush(), this.batchDelay)
        }
      }
    })
  }

  /**
   * Process the batched queries
   */
  private async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    if (this.batch.length === 0) return

    const queries = [...this.batch]
    this.batch = []

    // Build a single query with multiple statements
    const client = await this.pool.getClient()

    try {
      const results = await Promise.all(
        queries.map(({ query, params }) =>
          client.query(query, params)
        )
      )

      // Resolve all promises
      queries.forEach((item, index) => {
        item.resolve(results[index].rows)
      })
    } catch (error) {
      // Reject all promises
      queries.forEach(item => {
        item.reject(error)
      })
    } finally {
      client.release()
    }
  }

  /**
   * Force flush the batch
   */
  async forceFlush(): Promise<void> {
    await this.flush()
  }
}

/**
 * Prepared statement cache
 */
export class PreparedStatementCache {
  private statements = new Map<string, {
    name: string
    text: string
    lastUsed: Date
  }>()

  /**
   * Get or create prepared statement
   */
  async prepare(
    client: any,
    key: string,
    text: string
  ): Promise<string> {
    if (!this.statements.has(key)) {
      const name = `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await client.query({
        name,
        text,
        values: []
      })

      this.statements.set(key, {
        name,
        text,
        lastUsed: new Date()
      })
    }

    const statement = this.statements.get(key)!
    statement.lastUsed = new Date()

    return statement.name
  }

  /**
   * Clean up old statements
   */
  cleanup(maxAge = 3600000): void { // 1 hour default
    const now = Date.now()

    for (const [key, statement] of this.statements) {
      if (now - statement.lastUsed.getTime() > maxAge) {
        this.statements.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.statements.size,
      statements: Array.from(this.statements.entries()).map(([key, stmt]) => ({
        key,
        name: stmt.name,
        lastUsed: stmt.lastUsed
      }))
    }
  }
}

/**
 * Create optimized connection pool
 */
export function createOptimizedPool(
  connectionString: string,
  options?: Partial<PoolOptions>
): ConnectionPoolManager {
  const pool = new ConnectionPoolManager({
    connectionString,
    max: options?.max || 20,
    min: options?.min || 2,
    idleTimeoutMillis: options?.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: options?.connectionTimeoutMillis || 5000,
    maxUses: options?.maxUses || 1000,
    statementTimeout: options?.statementTimeout || 30000,
  })

  return pool
}