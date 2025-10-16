/**
 * Unified monitoring system
 */

import { MetricsManager } from './metrics'
import { Logger } from './logger'
import { ErrorTracker } from './error-tracking'
import { TracingManager } from './tracing'
import { HealthManager } from './health'

export interface MonitoringConfig {
  serviceName: string
  serviceVersion: string
  environment: string

  // Logging
  logLevel?: string
  logPretty?: boolean

  // Metrics
  metricsEnabled?: boolean
  metricsEndpoint?: string

  // Error tracking
  sentryDsn?: string
  sentryEnabled?: boolean
  sentrySampleRate?: number

  // Tracing
  tracingEnabled?: boolean
  tracingEndpoint?: string
  tracingSampleRate?: number

  // Health checks
  healthEnabled?: boolean
}

/**
 * Unified monitoring system
 */
export class MonitoringSystem {
  public readonly metrics: MetricsManager
  public readonly logger: Logger
  public readonly errors: ErrorTracker
  public readonly tracing: TracingManager
  public readonly health: HealthManager

  constructor(config: MonitoringConfig) {
    // Initialize metrics
    this.metrics = new MetricsManager({
      serviceName: config.serviceName,
      version: config.serviceVersion,
      environment: config.environment,
    })

    // Initialize logging
    this.logger = new Logger({
      serviceName: config.serviceName,
      version: config.serviceVersion,
      environment: config.environment,
      level: config.logLevel,
      pretty: config.logPretty,
    })

    // Initialize error tracking
    this.errors = new ErrorTracker({
      dsn: config.sentryDsn || '',
      environment: config.environment,
      release: config.serviceVersion,
      enabled: config.sentryEnabled,
      sampleRate: config.sentrySampleRate,
    })

    // Initialize tracing
    this.tracing = new TracingManager({
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      environment: config.environment,
      endpoint: config.tracingEndpoint,
      enabled: config.tracingEnabled,
    })

    // Initialize health checks
    this.health = new HealthManager({
      version: config.serviceVersion,
      environment: config.environment,
    })

    // Log startup
    this.logger.info('Monitoring system initialized', {
      service: config.serviceName,
      version: config.serviceVersion,
      environment: config.environment,
    })
  }

  /**
   * Create middleware stack
   */
  createMiddleware() {
    // Import middleware creators
    const { createTracingMiddleware } = require('./tracing')
    const { createLoggingMiddleware } = require('./logger')
    const { createMetricsMiddleware } = require('./metrics')
    const { createErrorMiddleware } = require('./error-tracking')

    return {
      // Apply in this order:
      tracing: createTracingMiddleware(this.tracing),
      logging: createLoggingMiddleware(this.logger),
      metrics: createMetricsMiddleware(this.metrics),
      health: this.health.createMiddleware(),
      errors: createErrorMiddleware(this.errors),
    }
  }

  /**
   * Track business event
   */
  trackEvent(
    event: string,
    properties?: Record<string, any>,
    userId?: string
  ) {
    // Log event
    this.logger.logEvent(event, { ...properties, userId })

    // Add to current span
    this.tracing.addEvent(event, properties)

    // Track specific business metrics
    switch (event) {
      case 'user_signup':
        this.metrics.recordUserSignup(properties?.method || 'unknown')
        break
      case 'user_login':
        this.metrics.recordUserLogin(properties?.method || 'unknown')
        break
      case 'transaction':
        this.metrics.recordTransaction(
          properties?.type || 'unknown',
          properties?.currency || 'USD',
          properties?.amount || 0
        )
        break
      case 'game_round':
        this.metrics.recordGameRound(
          properties?.gameId || 'unknown',
          properties?.won || false
        )
        break
      case 'bonus_claim':
        this.metrics.recordBonusClaim(properties?.bonusType || 'unknown')
        break
      case 'jackpot_tickets':
        this.metrics.recordJackpotTickets(
          properties?.count || 0,
          properties?.tier || 'unknown'
        )
        break
    }
  }

  /**
   * Track error
   */
  trackError(
    error: Error,
    context?: {
      userId?: string
      operation?: string
      [key: string]: any
    }
  ) {
    // Log error
    this.logger.error(error.message, error, context)

    // Track in error system
    this.errors.captureError(error, context)

    // Record error metric
    this.metrics.recordError(
      error.name || 'UnknownError',
      context?.severity || 'error'
    )

    // Add to span
    const span = this.tracing.getCurrentSpan()
    if (span) {
      span.recordException(error)
    }
  }

  /**
   * Track API call
   */
  async trackApiCall<T>(
    method: string,
    path: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const { Timer } = require('./metrics')
    const timer = new Timer()

    return this.tracing.traceHttpRequest(method, path, async () => {
      try {
        const result = await fn()
        const duration = timer.end()

        this.metrics.recordHttpRequest(method, path, 200, duration)
        this.logger.debug('API call completed', {
          method,
          path,
          duration,
        })

        return result
      } catch (error) {
        const duration = timer.end()
        const statusCode = (error as any).statusCode || 500

        this.metrics.recordHttpRequest(method, path, statusCode, duration)
        this.trackError(error as Error, { method, path })

        throw error
      }
    })
  }

  /**
   * Track database query
   */
  async trackDbQuery<T>(
    operation: string,
    table: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const { Timer } = require('./metrics')
    const timer = new Timer()

    return this.tracing.traceDbQuery(operation, table, async () => {
      try {
        const result = await fn()
        const duration = timer.end()

        this.metrics.recordDbQuery(operation, table, duration, true)
        this.logger.logQuery(`${operation} ${table}`, [], duration)

        return result
      } catch (error) {
        const duration = timer.end()

        this.metrics.recordDbQuery(operation, table, duration, false)
        this.logger.logQuery(`${operation} ${table}`, [], duration, error as Error)
        this.trackError(error as Error, { operation, table })

        throw error
      }
    })
  }

  /**
   * Track cache operation
   */
  async trackCacheOp<T>(
    operation: 'get' | 'set' | 'delete',
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.tracing.traceCacheOperation(operation, key, async () => {
      try {
        const result = await fn()

        // Track cache hit/miss for get operations
        if (operation === 'get') {
          if (result !== null && result !== undefined) {
            this.metrics.recordCacheHit(key)
          } else {
            this.metrics.recordCacheMiss(key)
          }
        }

        this.logger.logCache(operation, key, result !== null)

        return result
      } catch (error) {
        this.trackError(error as Error, { operation, key })
        throw error
      }
    })
  }

  /**
   * Create transaction context
   */
  createTransaction(name: string, operation: string) {
    // Tracing transactions are started via startSpan, not startTransaction
    return this.tracing.startSpan(name, { kind: 0 })
  }

  /**
   * Shutdown monitoring
   */
  async shutdown() {
    this.logger.info('Shutting down monitoring system')

    await Promise.all([
      this.errors.flush(),
      this.tracing.shutdown(),
    ])

    this.logger.info('Monitoring system shutdown complete')
  }
}

/**
 * Create monitoring system instance
 */
export function createMonitoring(config: MonitoringConfig): MonitoringSystem {
  return new MonitoringSystem(config)
}

/**
 * Global monitoring instance (lazy-loaded)
 */
let globalMonitoring: MonitoringSystem | null = null

export function getMonitoring(): MonitoringSystem {
  if (!globalMonitoring) {
    globalMonitoring = createMonitoring({
      serviceName: process.env.SERVICE_NAME || 'mypokies',
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL,
      sentryDsn: process.env.SENTRY_DSN,
      sentryEnabled: process.env.SENTRY_ENABLED === 'true',
      tracingEnabled: process.env.TRACING_ENABLED === 'true',
      tracingEndpoint: process.env.TRACING_ENDPOINT,
    })
  }

  return globalMonitoring
}