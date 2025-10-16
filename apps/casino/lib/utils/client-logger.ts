/**
 * Browser-compatible logger for client-side code
 *
 * This logger:
 * - Only logs in development mode
 * - Adds timestamps and context
 * - Is tree-shakeable for production builds
 * - Can be extended to send logs to monitoring services in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: unknown;
  [key: string]: unknown;
}

class ClientLogger {
  private isDevelopment: boolean;

  constructor() {
    // Check if we're in development mode
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString();
    const context = options?.context ? `[${options.context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${context} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log errors
    if (!this.isDevelopment && level !== 'error') {
      return false;
    }
    return true;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, options?: LogOptions): void {
    if (!this.shouldLog('debug')) return;

    const formattedMessage = this.formatMessage('debug', message, options);
    console.debug(formattedMessage);

    if (options?.data) {
      console.debug('Data:', options.data);
    }
  }

  /**
   * Log informational messages (development only)
   */
  info(message: string, options?: LogOptions): void {
    if (!this.shouldLog('info')) return;

    const formattedMessage = this.formatMessage('info', message, options);
    console.info(formattedMessage);

    if (options?.data) {
      console.info('Data:', options.data);
    }
  }

  /**
   * Log warning messages (development only)
   */
  warn(message: string, options?: LogOptions): void {
    if (!this.shouldLog('warn')) return;

    const formattedMessage = this.formatMessage('warn', message, options);
    console.warn(formattedMessage);

    if (options?.data) {
      console.warn('Data:', options.data);
    }
  }

  /**
   * Log error messages (always logged, even in production)
   * In production, you could extend this to send to a monitoring service
   */
  error(message: string, options?: LogOptions): void {
    const formattedMessage = this.formatMessage('error', message, options);
    console.error(formattedMessage);

    if (options?.data) {
      console.error('Data:', options.data);
    }

    // In production, send to monitoring service
    if (!this.isDevelopment) {
      this.sendToMonitoring('error', message, options);
    }
  }

  /**
   * Send logs to Sentry monitoring service in production
   */
  private sendToMonitoring(level: LogLevel, message: string, options?: LogOptions): void {
    try {
      // Dynamic import to avoid SSR issues
      import('@sentry/nextjs').then(Sentry => {
        if (level === 'error') {
          Sentry.captureException(new Error(message), {
            level: 'error',
            extra: options
          })
        } else {
          Sentry.captureMessage(message, {
            level: level as any,
            extra: options
          })
        }
      }).catch(() => {
        // Sentry not available, ignore
      })
    } catch (error) {
      // Ignore Sentry errors
    }
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger();

// Export convenience functions that can be tree-shaken
export const logDebug = (message: string, options?: LogOptions) => clientLogger.debug(message, options);
export const logInfo = (message: string, options?: LogOptions) => clientLogger.info(message, options);
export const logWarn = (message: string, options?: LogOptions) => clientLogger.warn(message, options);
export const logError = (message: string, options?: LogOptions) => clientLogger.error(message, options);
