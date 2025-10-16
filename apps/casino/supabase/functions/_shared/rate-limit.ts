/**
 * Rate Limiting Utilities for Supabase Edge Functions
 *
 * Uses Upstash Redis for distributed rate limiting to protect against
 * DDoS attacks, abuse, and database overload.
 *
 * Environment Variables Required:
 * - UPSTASH_REDIS_REST_URL: Your Upstash Redis REST URL
 * - UPSTASH_REDIS_REST_TOKEN: Your Upstash Redis REST token
 *
 * NOTE: This file is duplicated in apps/admin/supabase/functions/_shared/rate-limit.ts
 * This is intentional as Edge Functions are deployed separately and need their own copies.
 * Any changes should be made to both files.
 */

import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@2.0.6'
import { Redis } from 'https://esm.sh/@upstash/redis@1.35.5'

/**
 * Check if rate limiting is enabled via environment variables
 */
export function isRateLimitingEnabled(): boolean {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL')
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
  return !!(url && token)
}

/**
 * Create a Redis client from environment variables
 */
export function createRedisClient(): Redis {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL')
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

  if (!url || !token) {
    throw new Error('Redis credentials not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
  }

  return new Redis({
    url,
    token,
  })
}

/**
 * Rate limiter configuration options
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  requests: number
  /** Time window (e.g., '1 m', '10 s', '1 h') */
  window: string
  /** Prefix for Redis keys (for analytics and isolation) */
  prefix: string
  /** Enable analytics tracking */
  analytics?: boolean
}

/**
 * Rate limit result with metadata
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Maximum requests allowed in the window */
  limit: number
  /** Remaining requests in the current window */
  remaining: number
  /** Timestamp when the limit resets (milliseconds) */
  reset: number
  /** Whether rate limiting is enabled/configured */
  enabled: boolean
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig): Ratelimit {
  const redis = createRedisClient()

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: config.analytics ?? true,
    prefix: config.prefix,
  })
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (IP address, phone number, user ID, etc.)
 * @param config - Rate limiter configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // If rate limiting is not enabled, allow all requests
  if (!isRateLimitingEnabled()) {
    console.warn('Rate limiting not enabled - Redis credentials not configured')
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 60000,
      enabled: false,
    }
  }

  try {
    const ratelimiter = createRateLimiter(config)
    const result = await ratelimiter.limit(identifier)

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      enabled: true,
    }
  } catch (error) {
    // On error, log and allow the request (fail open to prevent service disruption)
    console.error('Rate limit check failed:', error)
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests,
      reset: Date.now() + 60000,
      enabled: false,
    }
  }
}

/**
 * Extract client IP address from request headers
 */
export function getClientIP(req: Request): string {
  // Try x-forwarded-for first (standard for proxies/load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first IP
    return forwardedFor.split(',')[0].trim()
  }

  // Try x-real-ip
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback
  return 'unknown'
}

/**
 * Create a rate limit response with appropriate headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message: string = 'Rate limit exceeded',
  options?: {
    status?: number
    contentType?: string
    body?: string
  }
): Response {
  const headers = new Headers({
    'Content-Type': options?.contentType || 'application/json',
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
  })

  const body = options?.body || JSON.stringify({
    error: message,
    limit: result.limit,
    remaining: result.remaining,
    reset: new Date(result.reset).toISOString(),
  })

  return new Response(body, {
    status: options?.status || 429,
    headers,
  })
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString())

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Log rate limit events for monitoring
 */
export function logRateLimit(params: {
  identifier: string
  result: RateLimitResult
  endpoint: string
  allowed: boolean
}) {
  const logData = {
    timestamp: new Date().toISOString(),
    endpoint: params.endpoint,
    identifier: params.identifier,
    allowed: params.allowed,
    limit: params.result.limit,
    remaining: params.result.remaining,
    reset: new Date(params.result.reset).toISOString(),
    enabled: params.result.enabled,
  }

  if (params.allowed) {
    console.log('Rate limit check passed:', logData)
  } else {
    console.warn('Rate limit exceeded:', logData)
  }
}
