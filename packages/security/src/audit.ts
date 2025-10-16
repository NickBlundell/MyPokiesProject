/**
 * Audit Logging Module
 * Tracks all sensitive operations for compliance and security
 */

export interface AuditLog {
  id?: string
  timestamp: Date
  userId?: string
  adminId?: string
  action: string
  resource?: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  result: 'success' | 'failure' | 'error'
  errorMessage?: string
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'bonus_claim'
  | 'withdrawal_request'
  | 'deposit'
  | 'admin_login'
  | 'admin_action'
  | 'player_update'
  | 'player_suspend'
  | 'player_ban'
  | 'bonus_assign'
  | 'bonus_revoke'
  | 'data_export'
  | 'data_delete'
  | 'sms_send'
  | 'api_access'

class AuditLogger {
  private queue: AuditLog[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly batchSize = 100
  private readonly flushIntervalMs = 5000 // 5 seconds

  constructor() {
    // Start the flush interval
    this.startFlushInterval()
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLog, 'timestamp'>): Promise<void> {
    const log: AuditLog = {
      ...entry,
      timestamp: new Date(),
    }

    // Add to queue
    this.queue.push(log)

    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      await this.flush()
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', {
        action: log.action,
        userId: log.userId,
        result: log.result,
        details: log.details,
      })
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    action: AuditAction,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      details,
      result: 'success',
    })
  }

  /**
   * Log a failed action
   */
  async logFailure(
    action: AuditAction,
    errorMessage: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      details,
      result: 'failure',
      errorMessage,
    })
  }

  /**
   * Log an error
   */
  async logError(
    action: AuditAction,
    error: Error,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      details,
      result: 'error',
      errorMessage: error.message,
    })
  }

  /**
   * Flush the queue to the database
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return
    }

    const batch = this.queue.splice(0, this.batchSize)

    try {
      // In production, this would write to the database
      // For now, we'll just log that we would write
      if (process.env.NODE_ENV === 'production') {
        // await db.insert(auditLogs).values(batch)
        console.log(`[AUDIT] Would write ${batch.length} audit logs to database`)
      }
    } catch (error) {
      console.error('[AUDIT] Failed to flush audit logs:', error)
      // Re-add to queue on failure
      this.queue.unshift(...batch)
    }
  }

  /**
   * Start the flush interval
   */
  private startFlushInterval(): void {
    if (this.flushInterval) {
      return
    }

    this.flushInterval = setInterval(() => {
      this.flush().catch(console.error)
    }, this.flushIntervalMs)

    // Ensure we flush on process exit
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => {
        this.stopFlushInterval()
        this.flush()
      })
    }
  }

  /**
   * Stop the flush interval
   */
  private stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger()

/**
 * Express/Next.js middleware for audit logging
 */
export function auditMiddleware(action: AuditAction) {
  return async (req: any, res: any, next: any) => {
    const startTime = Date.now()
    const originalSend = res.send
    const originalJson = res.json

    // Capture request details
    const details = {
      method: req.method,
      path: req.path || req.url,
      query: req.query,
      // Don't log sensitive body fields
      body: sanitizeBody(req.body),
    }

    // Override response methods to capture result
    res.send = function (data: any) {
      const duration = Date.now() - startTime
      const statusCode = res.statusCode

      auditLogger.log({
        action,
        userId: req.user?.id,
        adminId: req.admin?.id,
        details: {
          ...details,
          duration,
          statusCode,
        },
        ipAddress: getIpFromRequest(req),
        userAgent: req.headers['user-agent'],
        result: statusCode >= 400 ? 'failure' : 'success',
      })

      return originalSend.call(this, data)
    }

    res.json = function (data: any) {
      const duration = Date.now() - startTime
      const statusCode = res.statusCode

      auditLogger.log({
        action,
        userId: req.user?.id,
        adminId: req.admin?.id,
        details: {
          ...details,
          duration,
          statusCode,
        },
        ipAddress: getIpFromRequest(req),
        userAgent: req.headers['user-agent'],
        result: statusCode >= 400 ? 'failure' : 'success',
        errorMessage: statusCode >= 400 ? data?.error || data?.message : undefined,
      })

      return originalJson.call(this, data)
    }

    next()
  }
}

/**
 * Sanitize request body to remove sensitive fields
 */
function sanitizeBody(body: any): any {
  if (!body) return body

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'card',
    'cvv',
    'ssn',
  ]

  const sanitized = { ...body }

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Get IP address from request
 */
function getIpFromRequest(req: any): string {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    'unknown'
  )
}