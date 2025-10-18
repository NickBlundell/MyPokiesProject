/**
 * Browser-compatible logger for client-side code
 *
 * This logger:
 * - Only runs in browser environments (uses window object)
 * - Logs verbosely in development mode
 * - Only logs errors in production
 * - Integrates with Sentry for production error tracking
 * - Is tree-shakeable for production builds
 * - Provides structured logging with timestamps and context
 *
 * @example
 * ```typescript
 * import { logInfo, logError } from '@mypokies/monitoring/client'
 *
 * logInfo('User logged in', { context: 'auth', data: { userId: '123' } })
 * logError('Payment failed', { context: 'payments', data: error })
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogOptions {
  /** Context identifier (e.g., 'auth', 'payments', 'games') */
  context?: string
  /** Additional data to log */
  data?: unknown
  /** Any other key-value pairs for structured logging */
  [key: string]: unknown
}

class ClientLogger {
  private isDevelopment: boolean
  private isBrowser: boolean

  constructor() {
    // Check environment
    this.isBrowser = typeof window !== 'undefined'
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString()
    const context = options?.context ? `[${options.context}]` : ''
    return `${timestamp} ${level.toUpperCase()} ${context} ${message}`
  }

  private shouldLog(level: LogLevel): boolean {
    // Don't log anything if not in browser
    if (!this.isBrowser) {
      return false
    }

    // In production, only log errors
    if (!this.isDevelopment && level !== 'error') {
      return false
    }

    return true
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, options?: LogOptions): void {
    if (!this.shouldLog('debug')) return

    const formattedMessage = this.formatMessage('debug', message, options)
    console.debug(formattedMessage)

    if (options?.data) {
      console.debug('Data:', options.data)
    }
  }

  /**
   * Log informational messages (development only)
   */
  info(message: string, options?: LogOptions): void {
    if (!this.shouldLog('info')) return

    const formattedMessage = this.formatMessage('info', message, options)
    console.info(formattedMessage)

    if (options?.data) {
      console.info('Data:', options.data)
    }
  }

  /**
   * Log warning messages (development only)
   */
  warn(message: string, options?: LogOptions): void {
    if (!this.shouldLog('warn')) return

    const formattedMessage = this.formatMessage('warn', message, options)
    console.warn(formattedMessage)

    if (options?.data) {
      console.warn('Data:', options.data)
    }
  }

  /**
   * Log error messages (always logged, even in production)
   * In production, sends errors to Sentry for monitoring
   */
  error(message: string, options?: LogOptions): void {
    if (!this.isBrowser) return

    const formattedMessage = this.formatMessage('error', message, options)
    console.error(formattedMessage)

    if (options?.data) {
      console.error('Data:', options.data)
    }

    // In production, send to Sentry
    if (!this.isDevelopment) {
      this.sendToSentry('error', message, options)
    }
  }

  /**
   * Send logs to Sentry monitoring service in production
   * Uses dynamic import to avoid SSR issues and reduce bundle size
   */
  private sendToSentry(level: LogLevel, message: string, options?: LogOptions): void {
    if (!this.isBrowser) return

    try {
      // Dynamic import to avoid SSR issues and tree-shake in development
      import('@sentry/nextjs')
        .then((Sentry) => {
          if (level === 'error') {
            Sentry.captureException(new Error(message), {
              level: 'error',
              extra: options,
            })
          } else {
            Sentry.captureMessage(message, {
              level: level as any,
              extra: options,
            })
          }
        })
        .catch(() => {
          // Sentry not available, silently ignore
          // This can happen if Sentry is not configured or fails to load
        })
    } catch {
      // Ignore any Sentry errors to prevent logger from breaking the app
    }
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger()

// Export convenience functions that can be tree-shaken in production
export const logDebug = (message: string, options?: LogOptions) =>
  clientLogger.debug(message, options)
export const logInfo = (message: string, options?: LogOptions) => clientLogger.info(message, options)
export const logWarn = (message: string, options?: LogOptions) => clientLogger.warn(message, options)
export const logError = (message: string, options?: LogOptions) =>
  clientLogger.error(message, options)
