/**
 * Edge-compatible logger for Next.js middleware and edge functions
 * This logger is lightweight and doesn't depend on Node.js-specific APIs
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface EdgeLogContext {
  [key: string]: unknown
}

class EdgeLogger {
  private level: LogLevel

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    return levels.indexOf(level) >= levels.indexOf(this.level)
  }

  private formatMessage(level: LogLevel, message: string, context?: EdgeLogContext): string {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    }
    return JSON.stringify(logEntry)
  }

  debug(message: string, context?: EdgeLogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context))
    }
  }

  info(message: string, context?: EdgeLogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context))
    }
  }

  warn(message: string, context?: EdgeLogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context))
    }
  }

  error(message: string, context?: EdgeLogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, context))
    }
  }
}

// Default edge logger instance
export const edgeLogger = new EdgeLogger(
  process.env.LOG_LEVEL as LogLevel || LogLevel.INFO
)

export function createEdgeLogger(level: LogLevel = LogLevel.INFO): EdgeLogger {
  return new EdgeLogger(level)
}
