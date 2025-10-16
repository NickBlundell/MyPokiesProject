/**
 * Application metrics collection
 */

import { metrics, Meter, Counter, Histogram, UpDownCounter, ObservableGauge } from '@opentelemetry/api'

export interface MetricsOptions {
  serviceName: string
  version: string
  environment: string
}

/**
 * Application metrics manager
 */
export class MetricsManager {
  private meter: Meter
  private counters: Map<string, Counter> = new Map()
  private histograms: Map<string, Histogram> = new Map()
  private gauges: Map<string, UpDownCounter> = new Map()

  // Pre-defined metrics
  private httpRequestCount!: Counter
  private httpRequestDuration!: Histogram
  private httpActiveRequests!: UpDownCounter
  private dbQueryCount!: Counter
  private dbQueryDuration!: Histogram
  private cacheHits!: Counter
  private cacheMisses!: Counter
  private userSignups!: Counter
  private userLogins!: Counter
  private transactions!: Counter
  private gameRounds!: Counter
  private bonusClaims!: Counter
  private jackpotTickets!: Counter
  private errors!: Counter

  constructor(options: MetricsOptions) {
    this.meter = metrics.getMeter(options.serviceName, options.version)
    this.initializeMetrics()
  }

  /**
   * Initialize pre-defined metrics
   */
  private initializeMetrics() {
    // HTTP metrics
    this.httpRequestCount = this.meter.createCounter('http_requests_total', {
      description: 'Total number of HTTP requests',
    })

    this.httpRequestDuration = this.meter.createHistogram('http_request_duration_ms', {
      description: 'HTTP request duration in milliseconds',
    })

    this.httpActiveRequests = this.meter.createUpDownCounter('http_active_requests', {
      description: 'Number of active HTTP requests',
    })

    // Database metrics
    this.dbQueryCount = this.meter.createCounter('db_queries_total', {
      description: 'Total number of database queries',
    })

    this.dbQueryDuration = this.meter.createHistogram('db_query_duration_ms', {
      description: 'Database query duration in milliseconds',
    })

    // Cache metrics
    this.cacheHits = this.meter.createCounter('cache_hits_total', {
      description: 'Total number of cache hits',
    })

    this.cacheMisses = this.meter.createCounter('cache_misses_total', {
      description: 'Total number of cache misses',
    })

    // Business metrics
    this.userSignups = this.meter.createCounter('user_signups_total', {
      description: 'Total number of user signups',
    })

    this.userLogins = this.meter.createCounter('user_logins_total', {
      description: 'Total number of user logins',
    })

    this.transactions = this.meter.createCounter('transactions_total', {
      description: 'Total number of transactions',
    })

    this.gameRounds = this.meter.createCounter('game_rounds_total', {
      description: 'Total number of game rounds',
    })

    this.bonusClaims = this.meter.createCounter('bonus_claims_total', {
      description: 'Total number of bonus claims',
    })

    this.jackpotTickets = this.meter.createCounter('jackpot_tickets_total', {
      description: 'Total number of jackpot tickets earned',
    })

    this.errors = this.meter.createCounter('errors_total', {
      description: 'Total number of errors',
    })
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ) {
    this.httpRequestCount.add(1, {
      method,
      path,
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`,
    })

    this.httpRequestDuration.record(duration, {
      method,
      path,
      status_code: statusCode.toString(),
    })
  }

  /**
   * Track active HTTP requests
   */
  incrementActiveRequests() {
    this.httpActiveRequests.add(1)
  }

  decrementActiveRequests() {
    this.httpActiveRequests.add(-1)
  }

  /**
   * Record database query
   */
  recordDbQuery(
    operation: string,
    table: string,
    duration: number,
    success: boolean
  ) {
    this.dbQueryCount.add(1, {
      operation,
      table,
      success: success.toString(),
    })

    this.dbQueryDuration.record(duration, {
      operation,
      table,
    })
  }

  /**
   * Record cache access
   */
  recordCacheHit(key: string) {
    this.cacheHits.add(1, {
      cache_type: this.getCacheType(key),
    })
  }

  recordCacheMiss(key: string) {
    this.cacheMisses.add(1, {
      cache_type: this.getCacheType(key),
    })
  }

  /**
   * Record business events
   */
  recordUserSignup(method: string) {
    this.userSignups.add(1, { method })
  }

  recordUserLogin(method: string) {
    this.userLogins.add(1, { method })
  }

  recordTransaction(type: string, currency: string, amount: number) {
    this.transactions.add(1, {
      type,
      currency,
      amount_range: this.getAmountRange(amount),
    })
  }

  recordGameRound(gameId: string, won: boolean) {
    this.gameRounds.add(1, {
      game_id: gameId,
      outcome: won ? 'win' : 'loss',
    })
  }

  recordBonusClaim(bonusType: string) {
    this.bonusClaims.add(1, { bonus_type: bonusType })
  }

  recordJackpotTickets(count: number, tier: string) {
    this.jackpotTickets.add(count, { tier })
  }

  recordError(type: string, severity: string) {
    this.errors.add(1, { type, severity })
  }

  /**
   * Create custom counter
   */
  createCounter(name: string, description: string): Counter {
    if (!this.counters.has(name)) {
      const counter = this.meter.createCounter(name, { description })
      this.counters.set(name, counter)
    }
    return this.counters.get(name)!
  }

  /**
   * Create custom histogram
   */
  createHistogram(name: string, description: string): Histogram {
    if (!this.histograms.has(name)) {
      const histogram = this.meter.createHistogram(name, { description })
      this.histograms.set(name, histogram)
    }
    return this.histograms.get(name)!
  }

  /**
   * Create custom gauge
   */
  createGauge(name: string, description: string): UpDownCounter {
    if (!this.gauges.has(name)) {
      const gauge = this.meter.createUpDownCounter(name, { description })
      this.gauges.set(name, gauge)
    }
    return this.gauges.get(name)!
  }

  /**
   * Helper: Get cache type from key
   */
  private getCacheType(key: string): string {
    if (key.startsWith('user:')) return 'user'
    if (key.startsWith('balance:')) return 'balance'
    if (key.startsWith('game:')) return 'game'
    if (key.startsWith('bonus:')) return 'bonus'
    if (key.startsWith('jackpot:')) return 'jackpot'
    if (key.startsWith('loyalty:')) return 'loyalty'
    return 'other'
  }

  /**
   * Helper: Get amount range
   */
  private getAmountRange(amount: number): string {
    if (amount < 10) return '0-10'
    if (amount < 50) return '10-50'
    if (amount < 100) return '50-100'
    if (amount < 500) return '100-500'
    if (amount < 1000) return '500-1000'
    return '1000+'
  }
}

/**
 * Timing helper
 */
export class Timer {
  private start: number

  constructor() {
    this.start = Date.now()
  }

  end(): number {
    return Date.now() - this.start
  }
}

/**
 * Request metrics middleware
 */
export function createMetricsMiddleware(metrics: MetricsManager) {
  return async (req: any, res: any, next: any) => {
    const timer = new Timer()
    metrics.incrementActiveRequests()

    // Capture original end function
    const originalEnd = res.end
    res.end = function(...args: any[]) {
      const duration = timer.end()
      metrics.decrementActiveRequests()
      metrics.recordHttpRequest(
        req.method,
        req.path || req.url,
        res.statusCode,
        duration
      )
      originalEnd.apply(res, args)
    }

    next()
  }
}

/**
 * Database query wrapper with metrics
 */
export function withDbMetrics<T>(
  metrics: MetricsManager,
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const timer = new Timer()

  return queryFn()
    .then(result => {
      metrics.recordDbQuery(operation, table, timer.end(), true)
      return result
    })
    .catch(error => {
      metrics.recordDbQuery(operation, table, timer.end(), false)
      throw error
    })
}

/**
 * Cache wrapper with metrics
 */
export function withCacheMetrics<T>(
  metrics: MetricsManager,
  key: string,
  cacheFn: () => Promise<T | null>,
  fetchFn: () => Promise<T>
): Promise<T> {
  return cacheFn().then(cached => {
    if (cached !== null) {
      metrics.recordCacheHit(key)
      return cached
    }

    metrics.recordCacheMiss(key)
    return fetchFn()
  })
}