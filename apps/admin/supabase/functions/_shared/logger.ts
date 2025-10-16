/**
 * Structured logging utility for Admin Edge Functions
 * Provides consistent log formatting with severity levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  function?: string
  [key: string]: any
}

/**
 * Structured logger for Edge Functions
 */
class Logger {
  private functionName: string

  constructor(functionName: string) {
    this.functionName = functionName
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      function: this.functionName,
      message,
      ...context
    }
    return JSON.stringify(logData)
  }

  debug(message: string, context?: LogContext): void {
    console.log(this.formatLog('debug', message, context))
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatLog('info', message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog('warn', message, context))
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    }
    console.error(this.formatLog('error', message, errorContext))
  }
}

/**
 * Create a logger instance for an Edge Function
 */
export function createLogger(functionName: string): Logger {
  return new Logger(functionName)
}
