/**
 * Distributed tracing with OpenTelemetry
 */

import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api'
import type { Span, Tracer, SpanOptions } from '@opentelemetry/api'

export interface TracingOptions {
  serviceName: string
  serviceVersion: string
  environment: string
  endpoint?: string
  headers?: Record<string, string>
  enabled?: boolean
}

/**
 * Tracing manager for distributed tracing
 */
export class TracingManager {
  private sdk: NodeSDK | null = null
  private tracer: Tracer
  private initialized = false

  constructor(private options: TracingOptions) {
    this.tracer = trace.getTracer(
      options.serviceName,
      options.serviceVersion
    )

    if (options.enabled !== false) {
      this.initialize()
    }
  }

  /**
   * Initialize OpenTelemetry
   */
  private initialize() {
    if (this.initialized) return

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.options.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.options.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.options.environment,
      })
    )

    const traceExporter = new OTLPTraceExporter({
      url: this.options.endpoint || 'http://localhost:4318/v1/traces',
      headers: this.options.headers,
    })

    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation (too noisy)
          },
        }),
      ],
    })

    this.sdk.start()
    this.initialized = true
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    options?: SpanOptions & { kind?: SpanKind }
  ): Span {
    return this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      ...options,
    })
  }

  /**
   * Start an active span (automatically sets as active in context)
   */
  startActiveSpan<T>(
    name: string,
    fn: (span: Span) => T,
    options?: SpanOptions
  ): T {
    return this.tracer.startActiveSpan(name, options || {}, fn)
  }

  /**
   * Wrap async function with span
   */
  async traceAsync<T>(
    name: string,
    fn: () => Promise<T>,
    options?: SpanOptions & {
      attributes?: Record<string, any>
      kind?: SpanKind
    }
  ): Promise<T> {
    return this.startActiveSpan(
      name,
      async (span) => {
        try {
          // Set attributes
          if (options?.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
              span.setAttribute(key, value)
            })
          }

          const result = await fn()
          span.setStatus({ code: SpanStatusCode.OK })
          return result
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          })

          if (error instanceof Error) {
            span.recordException(error)
          }

          throw error
        } finally {
          span.end()
        }
      },
      { kind: options?.kind || SpanKind.INTERNAL }
    )
  }

  /**
   * Wrap function with span
   */
  trace<T>(
    name: string,
    fn: () => T,
    options?: SpanOptions & {
      attributes?: Record<string, any>
      kind?: SpanKind
    }
  ): T {
    return this.startActiveSpan(
      name,
      (span) => {
        try {
          // Set attributes
          if (options?.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
              span.setAttribute(key, value)
            })
          }

          const result = fn()
          span.setStatus({ code: SpanStatusCode.OK })
          return result
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          })

          if (error instanceof Error) {
            span.recordException(error)
          }

          throw error
        } finally {
          span.end()
        }
      },
      { kind: options?.kind || SpanKind.INTERNAL }
    )
  }

  /**
   * Trace HTTP request
   */
  async traceHttpRequest<T>(
    method: string,
    url: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.traceAsync(
      `${method} ${url}`,
      fn,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'http.method': method,
          'http.url': url,
        },
      }
    )
  }

  /**
   * Trace database query
   */
  async traceDbQuery<T>(
    operation: string,
    table: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.traceAsync(
      `${operation} ${table}`,
      fn,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'db.operation': operation,
          'db.table': table,
          'db.system': 'postgresql',
        },
      }
    )
  }

  /**
   * Trace cache operation
   */
  async traceCacheOperation<T>(
    operation: string,
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.traceAsync(
      `cache.${operation}`,
      fn,
      {
        attributes: {
          'cache.operation': operation,
          'cache.key': key,
        },
      }
    )
  }

  /**
   * Get current span
   */
  getCurrentSpan(): Span | undefined {
    return trace.getActiveSpan()
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, any>) {
    const span = this.getCurrentSpan()
    if (span) {
      span.addEvent(name, attributes)
    }
  }

  /**
   * Set attribute on current span
   */
  setAttribute(key: string, value: any) {
    const span = this.getCurrentSpan()
    if (span) {
      span.setAttribute(key, value)
    }
  }

  /**
   * Set attributes on current span
   */
  setAttributes(attributes: Record<string, any>) {
    const span = this.getCurrentSpan()
    if (span) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value)
      })
    }
  }

  /**
   * Shutdown tracing
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown()
    }
  }
}

/**
 * Tracing middleware for Express/Next.js
 */
export function createTracingMiddleware(tracing: TracingManager) {
  return async (req: any, res: any, next: any) => {
    const spanName = `${req.method} ${req.path || req.url}`

    tracing.startActiveSpan(
      spanName,
      (span) => {
        // Set HTTP attributes
        span.setAttributes({
          'http.method': req.method,
          'http.url': req.url,
          'http.target': req.path,
          'http.host': req.hostname,
          'http.scheme': req.protocol,
          'http.user_agent': req.get('user-agent'),
          'http.request_id': req.requestId || req.headers['x-request-id'],
        })

        // Add user context if available
        if (req.user) {
          span.setAttributes({
            'user.id': req.user.id,
            'user.email': req.user.email,
          })
        }

        // Capture response
        const originalEnd = res.end
        res.end = function(...args: any[]) {
          // Set response attributes
          span.setAttributes({
            'http.status_code': res.statusCode,
            'http.status_class': `${Math.floor(res.statusCode / 100)}xx`,
          })

          // Set span status
          if (res.statusCode >= 400) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `HTTP ${res.statusCode}`,
            })
          } else {
            span.setStatus({ code: SpanStatusCode.OK })
          }

          span.end()
          originalEnd.apply(res, args)
        }

        next()
      },
      { kind: SpanKind.SERVER }
    )
  }
}

/**
 * Trace decorator for class methods
 */
export function Trace(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const spanName = name || `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      const tracer = trace.getTracer('default')

      return tracer.startActiveSpan(spanName, async (span) => {
        try {
          const result = await originalMethod.apply(this, args)
          span.setStatus({ code: SpanStatusCode.OK })
          return result
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          })

          if (error instanceof Error) {
            span.recordException(error)
          }

          throw error
        } finally {
          span.end()
        }
      })
    }

    return descriptor
  }
}

/**
 * Extract trace context from headers
 */
export function extractTraceContext(headers: Record<string, string>): any {
  // Extract W3C Trace Context headers
  const traceparent = headers['traceparent']
  const tracestate = headers['tracestate']

  if (traceparent) {
    return {
      traceparent,
      tracestate,
    }
  }

  return null
}

/**
 * Inject trace context into headers
 */
export function injectTraceContext(headers: Record<string, string> = {}): Record<string, string> {
  const span = trace.getActiveSpan()
  if (!span) return headers

  const spanContext = span.spanContext()
  if (!spanContext) return headers

  // W3C Trace Context format
  headers['traceparent'] = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`

  return headers
}

/**
 * Create tracing manager instance
 */
export function createTracingManager(options: TracingOptions): TracingManager {
  return new TracingManager(options)
}