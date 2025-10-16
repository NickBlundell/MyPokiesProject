import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client (will use environment variables)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Define rate limit configurations
export const rateLimiters = {
  // Standard API rate limiting (100 requests per minute)
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  // Strict rate limiting for sensitive operations (10 requests per minute)
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1m'),
    analytics: true,
    prefix: 'ratelimit:strict',
  }),

  // Auth rate limiting (5 attempts per 15 minutes)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, '15m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  // Withdrawal/financial operations (3 per hour)
  financial: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(3, '1h'),
    analytics: true,
    prefix: 'ratelimit:financial',
  }),

  // SMS sending (20 per day)
  sms: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(20, '24h'),
    analytics: true,
    prefix: 'ratelimit:sms',
  }),

  // Bonus claims (10 per day)
  bonus: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(10, '24h'),
    analytics: true,
    prefix: 'ratelimit:bonus',
  }),
}

export type RateLimitType = keyof typeof rateLimiters

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'api'
) {
  const rateLimiter = rateLimiters[type]
  const result = await rateLimiter.limit(identifier)

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

/**
 * Middleware helper for Next.js API routes
 */
export async function rateLimitMiddleware(
  req: Request,
  type: RateLimitType = 'api'
): Promise<{ success: boolean; headers: Headers }> {
  const identifier = getIdentifier(req)
  const result = await checkRateLimit(identifier, type)

  const headers = new Headers()
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString())

  return {
    success: result.success,
    headers,
  }
}

/**
 * Get identifier from request (IP address or user ID)
 */
function getIdentifier(req: Request): string {
  // Try to get IP from various headers
  const headers = req.headers
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return ip
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(
    public limit: number,
    public reset: number,
    public remaining: number
  ) {
    super(`Rate limit exceeded. Try again at ${new Date(reset).toISOString()}`)
    this.name = 'RateLimitError'
  }
}