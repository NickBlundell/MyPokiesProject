/**
 * Structured logging system
 */

import pino from 'pino'
import type { Logger as PinoLogger } from 'pino'

export interface LoggerOptions {
  serviceName: string
  version: string
  environment: string
  level?: string
  pretty?: boolean
}

export interface LogContext {
  userId?: string
  sessionId?: string
  requestId?: string
  traceId?: string
  spanId?: string
  [key: string]: any
}

/**
 * Logger wrapper with structured logging
 */
export class Logger {
  private logger: PinoLogger
  private context: LogContext = {}

  constructor(options: LoggerOptions) {
    const isDevelopment = options.environment === 'development'

    this.logger = pino({
      name: options.serviceName,
      level: options.level || (isDevelopment ? 'debug' : 'info'),
      formatters: {
        level: (label) => {
          return { level: label }
        },
      },
      base: {
        service: options.serviceName,
        version: options.version,
        env: options.environment,
        pid: process.pid,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(options.pretty && isDevelopment
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                levelFirst: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss.l',
              },
            },
          }
        : {}),
    })
  }

  /**
   * Set context for all subsequent logs
   */
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  /**
   * Clear context
   */
  clearContext() {
    this.context = {}
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = Object.create(this)
    child.logger = this.logger.child(context)
    child.context = { ...this.context, ...context }
    return child
  }

  /**
   * Log methods
   */
  debug(message: string, data?: any) {
    this.logger.debug({ ...this.context, ...data }, message)
  }

  info(message: string, data?: any) {
    this.logger.info({ ...this.context, ...data }, message)
  }

  warn(message: string, data?: any) {
    this.logger.warn({ ...this.context, ...data }, message)
  }

  error(message: string, error?: Error | any, data?: any) {
    const errorData = error instanceof Error
      ? {
          error: {
            ...error,
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : error ? { error } : {}

    this.logger.error(
      { ...this.context, ...errorData, ...data },
      message
    )
  }

  fatal(message: string, error?: Error | any, data?: any) {
    const errorData = error instanceof Error
      ? {
          error: {
            ...error,
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : error ? { error } : {}

    this.logger.fatal(
      { ...this.context, ...errorData, ...data },
      message
    )
  }

  /**
   * Performance logging
   */
  time(label: string): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.debug(`${label} completed`, { duration_ms: duration })
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req: any, res: any, duration: number) {
    const data = {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get?.('user-agent'),
      statusCode: res.statusCode,
      duration_ms: duration,
    }

    if (res.statusCode >= 500) {
      this.error('HTTP request failed', undefined, data)
    } else if (res.statusCode >= 400) {
      this.warn('HTTP request client error', data)
    } else {
      this.info('HTTP request completed', data)
    }
  }

  /**
   * Log database query
   */
  logQuery(query: string, params: any[], duration: number, error?: Error) {
    const data = {
      query: query.substring(0, 200), // Truncate long queries
      params: params?.length || 0,
      duration_ms: duration,
    }

    if (error) {
      this.error('Database query failed', error, data)
    } else if (duration > 1000) {
      this.warn('Slow database query', data)
    } else {
      this.debug('Database query completed', data)
    }
  }

  /**
   * Log cache operation
   */
  logCache(operation: 'get' | 'set' | 'delete', key: string, hit?: boolean) {
    const data = {
      operation,
      key: key.substring(0, 100), // Truncate long keys
      hit,
    }

    this.debug(`Cache ${operation}`, data)
  }

  /**
   * Log business events
   */
  logEvent(event: string, data?: any) {
    this.info(`Event: ${event}`, { event, ...data })
  }

  /**
   * Log audit trail
   */
  logAudit(action: string, userId: string, data?: any) {
    this.info('Audit log', {
      audit: true,
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...data,
    })
  }

  /**
   * Log security events
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any) {
    const logData = {
      security: true,
      event,
      severity,
      ...data,
    }

    switch (severity) {
      case 'critical':
        this.fatal(`Security: ${event}`, undefined, logData)
        break
      case 'high':
        this.error(`Security: ${event}`, undefined, logData)
        break
      case 'medium':
        this.warn(`Security: ${event}`, logData)
        break
      default:
        this.info(`Security: ${event}`, logData)
    }
  }
}

/**
 * Request logging middleware
 */
export function createLoggingMiddleware(logger: Logger) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now()
    const requestId = req.headers['x-request-id'] || generateRequestId()

    // Add request ID to request and response
    req.requestId = requestId
    res.setHeader('X-Request-ID', requestId)

    // Create child logger with request context
    req.logger = logger.child({
      requestId,
      method: req.method,
      path: req.path || req.url,
    })

    // Log request start
    req.logger.info('Request started')

    // Capture original end function
    const originalEnd = res.end
    res.end = function(...args: any[]) {
      const duration = Date.now() - start
      req.logger.logRequest(req, res, duration)
      originalEnd.apply(res, args)
    }

    next()
  }
}

/**
 * Error logging middleware
 */
export function createErrorLoggingMiddleware(logger: Logger) {
  return (err: Error, req: any, res: any, next: any) => {
    const requestLogger = req.logger || logger

    requestLogger.error('Unhandled error', err, {
      method: req.method,
      path: req.path || req.url,
      query: req.query,
      body: req.body,
    })

    // Send error response if not already sent
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
        requestId: req.requestId,
      })
    }
  }
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Create logger instance
 */
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options)
}

/**
 * Default logger instance
 */
export const logger = new Logger({
  serviceName: 'mypokies',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  level: process.env.LOG_LEVEL || 'info',
  pretty: process.env.NODE_ENV === 'development',
})