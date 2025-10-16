/**
 * Health check and readiness probes
 */

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  message?: string
  duration?: number
  metadata?: Record<string, any>
}

export interface HealthCheck {
  name: string
  check: () => Promise<HealthCheckResult>
  critical?: boolean
  timeout?: number
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  checks: Record<string, HealthCheckResult>
  version: string
  environment: string
}

/**
 * Health check manager
 */
export class HealthManager {
  private checks: Map<string, HealthCheck> = new Map()
  private startTime = Date.now()

  constructor(
    private options: {
      version: string
      environment: string
    }
  ) {}

  /**
   * Register a health check
   */
  register(check: HealthCheck) {
    this.checks.set(check.name, check)
  }

  /**
   * Register multiple health checks
   */
  registerAll(checks: HealthCheck[]) {
    checks.forEach(check => this.register(check))
  }

  /**
   * Unregister a health check
   */
  unregister(name: string) {
    this.checks.delete(name)
  }

  /**
   * Run a single health check
   */
  private async runCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const timeout = check.timeout || 5000
    const start = Date.now()

    try {
      const result = await Promise.race([
        check.check(),
        new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), timeout)
        ),
      ])

      return {
        ...result,
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start,
      }
    }
  }

  /**
   * Run all health checks
   */
  async checkHealth(): Promise<SystemHealth> {
    const results: Record<string, HealthCheckResult> = {}
    const promises: Promise<void>[] = []

    // Run all checks in parallel
    for (const [name, check] of this.checks) {
      promises.push(
        this.runCheck(check).then(result => {
          results[name] = result
        })
      )
    }

    await Promise.all(promises)

    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    for (const [name, check] of this.checks) {
      const result = results[name]

      if (result.status === 'unhealthy') {
        if (check.critical) {
          overallStatus = 'unhealthy'
          break
        } else {
          overallStatus = 'degraded'
        }
      } else if (result.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded'
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks: results,
      version: this.options.version,
      environment: this.options.environment,
    }
  }

  /**
   * Check readiness
   */
  async checkReadiness(): Promise<boolean> {
    const health = await this.checkHealth()
    return health.status !== 'unhealthy'
  }

  /**
   * Check liveness
   */
  async checkLiveness(): Promise<boolean> {
    // For liveness, we just check if the process is responsive
    // This should be a very lightweight check
    return true
  }

  /**
   * Create Express/Next.js middleware
   */
  createMiddleware() {
    return async (req: any, res: any, next: any) => {
      const path = req.path || req.url

      if (path === '/health' || path === '/healthz') {
        const health = await this.checkHealth()
        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 503

        res.status(statusCode).json(health)
      } else if (path === '/ready' || path === '/readyz') {
        const ready = await this.checkReadiness()
        res.status(ready ? 200 : 503).json({ ready })
      } else if (path === '/live' || path === '/livez') {
        const live = await this.checkLiveness()
        res.status(live ? 200 : 503).json({ live })
      } else {
        next()
      }
    }
  }
}

/**
 * Common health checks
 */
export const commonHealthChecks = {
  /**
   * Database health check
   */
  database: (
    queryFn: () => Promise<any>,
    options?: { timeout?: number }
  ): HealthCheck => ({
    name: 'database',
    critical: true,
    timeout: options?.timeout || 5000,
    async check() {
      try {
        const start = Date.now()
        await queryFn()
        const duration = Date.now() - start

        if (duration > 1000) {
          return {
            status: 'degraded',
            message: 'Slow database response',
            duration,
          }
        }

        return {
          status: 'healthy',
          duration,
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Database connection failed',
        }
      }
    },
  }),

  /**
   * Redis health check
   */
  redis: (
    pingFn: () => Promise<any>,
    options?: { timeout?: number }
  ): HealthCheck => ({
    name: 'redis',
    critical: false,
    timeout: options?.timeout || 3000,
    async check() {
      try {
        const start = Date.now()
        await pingFn()
        const duration = Date.now() - start

        if (duration > 500) {
          return {
            status: 'degraded',
            message: 'Slow Redis response',
            duration,
          }
        }

        return {
          status: 'healthy',
          duration,
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Redis connection failed',
        }
      }
    },
  }),

  /**
   * External API health check
   */
  externalApi: (
    name: string,
    url: string,
    options?: { timeout?: number; critical?: boolean }
  ): HealthCheck => ({
    name,
    critical: options?.critical || false,
    timeout: options?.timeout || 10000,
    async check() {
      try {
        const start = Date.now()
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(options?.timeout || 10000),
        })
        const duration = Date.now() - start

        if (!response.ok) {
          return {
            status: 'unhealthy',
            message: `API returned ${response.status}`,
            duration,
            metadata: {
              statusCode: response.status,
            },
          }
        }

        if (duration > 3000) {
          return {
            status: 'degraded',
            message: 'Slow API response',
            duration,
          }
        }

        return {
          status: 'healthy',
          duration,
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'API request failed',
        }
      }
    },
  }),

  /**
   * Memory health check
   */
  memory: (options?: { maxHeapUsed?: number; maxRss?: number }): HealthCheck => ({
    name: 'memory',
    critical: false,
    async check() {
      const memUsage = process.memoryUsage()
      const maxHeapUsed = options?.maxHeapUsed || 1024 * 1024 * 1024 // 1GB default
      const maxRss = options?.maxRss || 1.5 * 1024 * 1024 * 1024 // 1.5GB default

      if (memUsage.heapUsed > maxHeapUsed || memUsage.rss > maxRss) {
        return {
          status: 'degraded',
          message: 'High memory usage',
          metadata: {
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          },
        }
      }

      return {
        status: 'healthy',
        metadata: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        },
      }
    },
  }),

  /**
   * Disk space health check
   */
  diskSpace: (
    checkFn: () => Promise<{ free: number; total: number }>,
    options?: { minFreeSpace?: number }
  ): HealthCheck => ({
    name: 'diskSpace',
    critical: false,
    async check() {
      try {
        const { free, total } = await checkFn()
        const minFreeSpace = options?.minFreeSpace || 1024 * 1024 * 1024 // 1GB default
        const freePercentage = (free / total) * 100

        if (free < minFreeSpace) {
          return {
            status: 'unhealthy',
            message: 'Low disk space',
            metadata: {
              free: `${Math.round(free / 1024 / 1024)}MB`,
              total: `${Math.round(total / 1024 / 1024)}MB`,
              percentage: `${freePercentage.toFixed(1)}%`,
            },
          }
        }

        if (freePercentage < 10) {
          return {
            status: 'degraded',
            message: 'Disk space below 10%',
            metadata: {
              free: `${Math.round(free / 1024 / 1024)}MB`,
              percentage: `${freePercentage.toFixed(1)}%`,
            },
          }
        }

        return {
          status: 'healthy',
          metadata: {
            free: `${Math.round(free / 1024 / 1024)}MB`,
            percentage: `${freePercentage.toFixed(1)}%`,
          },
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Failed to check disk space',
        }
      }
    },
  }),
}

/**
 * Create health manager instance
 */
export function createHealthManager(options: {
  version: string
  environment: string
}): HealthManager {
  return new HealthManager(options)
}