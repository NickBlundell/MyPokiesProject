/**
 * Error tracking and monitoring with Sentry
 */

import * as Sentry from '@sentry/nextjs'

export interface ErrorTrackingOptions {
  dsn: string
  environment: string
  release?: string
  sampleRate?: number
  tracesSampleRate?: number
  enabled?: boolean
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  requestId?: string
  operation?: string
  tags?: Record<string, string>
  extra?: Record<string, any>
}

/**
 * Error tracking manager
 */
export class ErrorTracker {
  private initialized = false
  private options: ErrorTrackingOptions

  constructor(options: ErrorTrackingOptions) {
    this.options = options
    if (options.enabled !== false) {
      this.initialize()
    }
  }

  /**
   * Initialize Sentry
   */
  private initialize() {
    if (this.initialized) return

    Sentry.init({
      dsn: this.options.dsn,
      environment: this.options.environment,
      release: this.options.release,
      sampleRate: this.options.sampleRate || 1.0,
      tracesSampleRate: this.options.tracesSampleRate || 0.1,

      // Integrations - most integrations are now enabled by default in v10
      // linkedErrorsIntegration is included by default
      // HTTP instrumentation is handled automatically
      integrations: [],

      // Error filtering
      beforeSend(event, hint) {
        // Filter out certain errors
        if (event.exception) {
          const error = hint.originalException

          // Skip non-errors
          if (!error || typeof error === 'string') {
            return null
          }

          // Skip certain error types
          if (typeof error === 'object' && error !== null) {
            if (('name' in error && error.name === 'AbortError') ||
                ('message' in error && typeof error.message === 'string' && error.message.includes('Network request failed'))) {
              return null
            }
          }
        }

        return event
      },

      // Breadcrumb filtering
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null
        }

        return breadcrumb
      },
    })

    this.initialized = true
  }

  /**
   * Capture error
   */
  captureError(error: Error, context?: ErrorContext) {
    if (!this.initialized) return

    Sentry.withScope((scope) => {
      // Set context
      if (context) {
        if (context.userId) {
          scope.setUser({ id: context.userId })
        }

        if (context.sessionId) {
          scope.setTag('session_id', context.sessionId)
        }

        if (context.requestId) {
          scope.setTag('request_id', context.requestId)
        }

        if (context.operation) {
          scope.setTag('operation', context.operation)
        }

        if (context.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            scope.setTag(key, value)
          })
        }

        if (context.extra) {
          Object.entries(context.extra).forEach(([key, value]) => {
            scope.setExtra(key, value)
          })
        }
      }

      // Set error level based on error type
      const level = this.getErrorLevel(error)
      scope.setLevel(level)

      // Capture the error
      Sentry.captureException(error)
    })
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: ErrorContext) {
    if (!this.initialized) return

    Sentry.withScope((scope) => {
      // Set context
      if (context) {
        this.setContext(scope, context)
      }

      scope.setLevel(level)
      Sentry.captureMessage(message, level)
    })
  }

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; username?: string; ip_address?: string } | null) {
    if (!this.initialized) return
    Sentry.setUser(user)
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    if (!this.initialized) return
    Sentry.addBreadcrumb(breadcrumb)
  }

  /**
   * Start span (replaces startTransaction in Sentry v10+)
   * Note: In v10, use Sentry.startSpan() directly with a callback for better span management
   * This method is provided for compatibility but using Sentry.startSpan() directly is recommended
   */
  startTransaction(name: string, op: string): ReturnType<typeof Sentry.startInactiveSpan> | null {
    if (!this.initialized) return null

    // In Sentry v10, startTransaction is replaced with startInactiveSpan for manual span control
    // For automatic span management, use Sentry.startSpan() with a callback instead
    return Sentry.startInactiveSpan({
      name,
      op,
    })
  }

  /**
   * Wrap async function with error tracking
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    operation: string,
    context?: ErrorContext
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      this.captureError(error as Error, {
        ...context,
        operation,
      })
      throw error
    }
  }

  /**
   * Wrap function with error tracking
   */
  wrap<T>(
    fn: () => T,
    operation: string,
    context?: ErrorContext
  ): T {
    try {
      return fn()
    } catch (error) {
      this.captureError(error as Error, {
        ...context,
        operation,
      })
      throw error
    }
  }

  /**
   * Create error boundary
   */
  createErrorBoundary(): typeof Sentry.ErrorBoundary {
    return Sentry.ErrorBoundary
  }

  /**
   * Flush pending events
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true
    return Sentry.flush(timeout)
  }

  /**
   * Close Sentry client
   */
  async close(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true
    return Sentry.close(timeout)
  }

  /**
   * Set context on scope
   */
  private setContext(scope: Sentry.Scope, context: ErrorContext) {
    if (context.userId) {
      scope.setUser({ id: context.userId })
    }

    if (context.sessionId) {
      scope.setTag('session_id', context.sessionId)
    }

    if (context.requestId) {
      scope.setTag('request_id', context.requestId)
    }

    if (context.operation) {
      scope.setTag('operation', context.operation)
    }

    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }

    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }
  }

  /**
   * Determine error level
   */
  private getErrorLevel(error: Error): Sentry.SeverityLevel {
    // Critical errors
    if (error.name === 'FatalError' ||
        error.message?.includes('FATAL') ||
        error.message?.includes('CRITICAL')) {
      return 'fatal'
    }

    // Database errors
    if (error.name === 'DatabaseError' ||
        error.message?.includes('database')) {
      return 'error'
    }

    // Validation errors
    if (error.name === 'ValidationError' ||
        error.message?.includes('validation')) {
      return 'warning'
    }

    // Default
    return 'error'
  }
}

/**
 * Error types for better categorization
 */
export class BusinessError extends Error {
  constructor(message: string, public code?: string, public statusCode?: number) {
    super(message)
    this.name = 'BusinessError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded', public retryAfter?: number) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public query?: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string, public service: string, public statusCode?: number) {
    super(message)
    this.name = 'ExternalServiceError'
  }
}

/**
 * Error middleware for Express/Next.js
 */
export function createErrorMiddleware(tracker: ErrorTracker) {
  return (err: Error, req: any, res: any, next: any) => {
    // Capture error with context
    tracker.captureError(err, {
      requestId: req.requestId || req.headers['x-request-id'],
      userId: req.user?.id,
      sessionId: req.session?.id,
      tags: {
        path: req.path || req.url,
        method: req.method,
      },
      extra: {
        query: req.query,
        body: req.body,
        headers: req.headers,
      },
    })

    // Determine status code
    let statusCode = 500
    if (err instanceof ValidationError) statusCode = 400
    if (err instanceof AuthenticationError) statusCode = 401
    if (err instanceof AuthorizationError) statusCode = 403
    if (err instanceof RateLimitError) statusCode = 429
    if (err instanceof BusinessError) statusCode = err.statusCode || 400

    // Send error response
    if (!res.headersSent) {
      res.status(statusCode).json({
        error: err.name,
        message: err.message,
        requestId: req.requestId,
        ...(process.env.NODE_ENV === 'development' && {
          stack: err.stack,
        }),
      })
    }
  }
}

/**
 * Create error tracker instance
 */
export function createErrorTracker(options: ErrorTrackingOptions): ErrorTracker {
  return new ErrorTracker(options)
}