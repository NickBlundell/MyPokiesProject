/**
 * Monitoring, metrics, and observability
 */

// Export edge-compatible logger (for Next.js middleware and edge functions)
export {
  edgeLogger,
  createEdgeLogger,
  LogLevel as EdgeLogLevel,
  type EdgeLogContext,
} from './edge-logger'

// Export metrics
export {
  MetricsManager,
  Timer,
  createMetricsMiddleware,
  withDbMetrics,
  withCacheMetrics,
  type MetricsOptions,
} from './metrics'

// Export logging
export {
  Logger,
  LogLevel,
  createLogger,
  logger,
  createLoggingMiddleware,
  createErrorLoggingMiddleware,
  type LoggerOptions,
  type LogContext,
} from './logger'

// Export error tracking
export {
  ErrorTracker,
  createErrorTracker,
  createErrorMiddleware,
  BusinessError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  type ErrorTrackingOptions,
  type ErrorContext,
} from './error-tracking'

// Export tracing
export {
  TracingManager,
  createTracingManager,
  createTracingMiddleware,
  Trace,
  extractTraceContext,
  injectTraceContext,
  type TracingOptions,
} from './tracing'

// Export health checks
export {
  HealthManager,
  createHealthManager,
  commonHealthChecks,
  type HealthCheck,
  type HealthCheckResult,
  type SystemHealth,
} from './health'

// Export monitoring facade
export { MonitoringSystem, createMonitoring } from './monitoring'