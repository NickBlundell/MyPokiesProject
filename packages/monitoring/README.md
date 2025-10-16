# @mypokies/monitoring

Comprehensive monitoring, metrics, logging, and observability for MyPokies platform. Integrates Sentry for error tracking, OpenTelemetry for tracing, and Pino for structured logging.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/monitoring": "workspace:*"
  }
}
```

## Usage

### Structured Logging

```typescript
import { logger, createLogger } from '@mypokies/monitoring'

// Use default logger
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' })
logger.error('Payment failed', { error: err, amount: 100 })
logger.warn('High latency detected', { responseTime: 5000 })

// Create custom logger
const apiLogger = createLogger({
  name: 'api',
  level: 'debug'
})

apiLogger.debug('API request', { method: 'GET', path: '/users' })
```

### Metrics Collection

```typescript
import { MetricsManager, Timer } from '@mypokies/monitoring'

const metrics = new MetricsManager()

// Record a counter
metrics.increment('api.requests', { endpoint: '/users' })

// Record a gauge
metrics.gauge('active.users', 150)

// Record a histogram
metrics.histogram('api.response_time', 245, { endpoint: '/users' })

// Use timer for measuring duration
const timer = new Timer()
await doSomething()
metrics.timing('operation.duration', timer.elapsed())
```

### Database Metrics

```typescript
import { withDbMetrics } from '@mypokies/monitoring'

// Wrap database queries with metrics
const result = await withDbMetrics(
  'users.query',
  async () => {
    return await db.select().from(users)
  }
)
// Automatically tracks: query time, row count, errors
```

### Cache Metrics

```typescript
import { withCacheMetrics } from '@mypokies/monitoring'

// Track cache hit/miss rates
const data = await withCacheMetrics(
  'user.cache',
  async () => {
    return await cache.get('user:123')
  }
)
// Automatically tracks: hits, misses, latency
```

### Error Tracking

```typescript
import {
  ErrorTracker,
  createErrorTracker,
  BusinessError,
  ValidationError
} from '@mypokies/monitoring'

// Initialize error tracker
const errorTracker = createErrorTracker({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
})

// Capture exceptions
try {
  await riskyOperation()
} catch (error) {
  errorTracker.captureException(error, {
    userId: '123',
    operation: 'payment'
  })
}

// Use typed errors
throw new BusinessError('Insufficient balance', {
  userId: '123',
  balance: 50,
  required: 100
})

throw new ValidationError('Invalid email format', {
  field: 'email',
  value: 'invalid'
})
```

### Distributed Tracing

```typescript
import {
  TracingManager,
  createTracingManager,
  Trace
} from '@mypokies/monitoring'

// Initialize tracing
const tracing = createTracingManager({
  serviceName: 'mypokies-api',
  endpoint: process.env.OTEL_ENDPOINT
})

// Create spans
const trace = new Trace('user.registration')

trace.addEvent('validate_input')
await validateInput(data)

trace.addEvent('create_user')
await createUser(data)

trace.addEvent('send_welcome_email')
await sendEmail(user.email)

trace.end()
```

### Health Checks

```typescript
import {
  HealthManager,
  createHealthManager,
  commonHealthChecks
} from '@mypokies/monitoring'

const health = createHealthManager({
  checks: [
    commonHealthChecks.database(),
    commonHealthChecks.redis(),
    commonHealthChecks.diskSpace(),
    commonHealthChecks.memory()
  ]
})

// Check system health
const status = await health.check()
console.log(status.healthy) // true/false
console.log(status.checks) // Individual check results

// Use in API route
export async function GET() {
  const health = await healthManager.check()
  return Response.json(health, {
    status: health.healthy ? 200 : 503
  })
}
```

### Monitoring Middleware

```typescript
import {
  createMetricsMiddleware,
  createLoggingMiddleware,
  createErrorLoggingMiddleware,
  createTracingMiddleware,
  createErrorMiddleware
} from '@mypokies/monitoring'

// Next.js API middleware
export const middleware = [
  createLoggingMiddleware(),
  createMetricsMiddleware(),
  createTracingMiddleware(),
  createErrorMiddleware()
]
```

### Unified Monitoring System

```typescript
import { MonitoringSystem, createMonitoring } from '@mypokies/monitoring'

// Initialize complete monitoring system
const monitoring = createMonitoring({
  serviceName: 'mypokies-api',
  environment: 'production',
  sentry: {
    dsn: process.env.SENTRY_DSN
  },
  tracing: {
    enabled: true,
    endpoint: process.env.OTEL_ENDPOINT
  },
  logging: {
    level: 'info',
    pretty: false
  }
})

// Access all monitoring tools
monitoring.logger.info('App started')
monitoring.metrics.increment('app.startup')
monitoring.errorTracker.captureException(error)
```

## API Documentation

### Logger

- `logger` - Default logger instance
- `createLogger(options: LoggerOptions)` - Create custom logger
- `LogLevel` - Log levels enum (debug, info, warn, error, fatal)
- `createLoggingMiddleware()` - Request logging middleware
- `createErrorLoggingMiddleware()` - Error logging middleware

### Metrics

- `MetricsManager` - Metrics collection class
- `Timer` - Timer utility for measuring duration
- `createMetricsMiddleware()` - Metrics collection middleware
- `withDbMetrics(name, fn)` - Database metrics wrapper
- `withCacheMetrics(name, fn)` - Cache metrics wrapper

Methods:
- `increment(name, tags?)` - Increment counter
- `decrement(name, tags?)` - Decrement counter
- `gauge(name, value, tags?)` - Record gauge value
- `histogram(name, value, tags?)` - Record histogram value
- `timing(name, duration, tags?)` - Record timing

### Error Tracking

- `ErrorTracker` - Error tracking class
- `createErrorTracker(options)` - Initialize error tracker
- `createErrorMiddleware()` - Error capturing middleware

Error classes:
- `BusinessError` - Business logic errors
- `ValidationError` - Input validation errors
- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Permission errors
- `RateLimitError` - Rate limit exceeded
- `DatabaseError` - Database operation errors
- `ExternalServiceError` - Third-party service errors

### Tracing

- `TracingManager` - Distributed tracing manager
- `createTracingManager(options)` - Initialize tracing
- `Trace` - Span/trace class
- `createTracingMiddleware()` - Tracing middleware
- `extractTraceContext(headers)` - Extract trace from headers
- `injectTraceContext(headers, context)` - Inject trace to headers

### Health Checks

- `HealthManager` - Health check manager
- `createHealthManager(options)` - Create health manager
- `commonHealthChecks` - Common health check implementations
  - `database()` - Database connectivity
  - `redis()` - Redis connectivity
  - `diskSpace()` - Disk space check
  - `memory()` - Memory usage check

### Monitoring System

- `MonitoringSystem` - Complete monitoring facade
- `createMonitoring(config)` - Initialize all monitoring

## Configuration

Set the following environment variables:

```bash
# Sentry
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production

# OpenTelemetry
OTEL_ENDPOINT=your-otel-collector-endpoint
OTEL_SERVICE_NAME=mypokies-api

# Logging
LOG_LEVEL=info
LOG_PRETTY=false
```

## Development

### Build the package

```bash
npm run build
```

### Watch mode

```bash
npm run dev
```

### Type checking

```bash
npm run type-check
```

## Monitoring Best Practices

1. Log at appropriate levels (debug, info, warn, error)
2. Include context in logs (userId, requestId, etc.)
3. Track key business metrics (signups, deposits, bets)
4. Set up alerts for critical errors
5. Use distributed tracing for request flows
6. Monitor health endpoints regularly
7. Set up dashboards for key metrics
8. Review error rates daily

## Key Metrics to Track

- API request rate and latency
- Database query performance
- Cache hit/miss rates
- Error rates by endpoint
- User registration and login
- Transaction volume and value
- Game play metrics
- System resource usage

## Dependencies

- `@sentry/nextjs` - Error tracking
- `@opentelemetry/*` - Distributed tracing
- `pino` - Structured logging
- `pino-pretty` - Pretty logging (dev)
