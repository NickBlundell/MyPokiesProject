import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check if Redis is configured
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const isRedisConfigured = !!(REDIS_URL && REDIS_TOKEN)

// Create rate limiters only if Redis is configured
let ratelimit: Ratelimit | null = null
let strictRatelimit: Ratelimit | null = null

if (isRedisConfigured) {
  // Create a new ratelimiter that allows 10 requests per 10 seconds
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
    /**
     * Optional prefix for the keys used in redis. This is useful if you want to share a redis
     * instance with other applications and want to avoid key collisions. The default prefix is
     * "@upstash/ratelimit"
     */
    prefix: '@upstash/ratelimit/mypokies',
  })

  // Stricter rate limit for sensitive operations (bonus claiming, point redemption)
  strictRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 requests per minute
    analytics: true,
    prefix: '@upstash/ratelimit/mypokies-strict',
  })
}

export { ratelimit, strictRatelimit }

// Helper function to get client identifier (IP address)
export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return 'unknown'
}

// Helper function to check rate limit and return appropriate response
// If Redis is not configured, always return success
export async function checkRateLimit(
  request: Request,
  options?: {
    strict?: boolean
    identifier?: string
  }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // If Redis is not configured, skip rate limiting
  if (!isRedisConfigured) {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 60000,
    }
  }

  const limiter = options?.strict ? strictRatelimit : ratelimit
  if (!limiter) {
    // Fallback if limiter is null
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 60000,
    }
  }

  const identifier = options?.identifier || getClientIdentifier(request)

  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  return {
    success,
    limit,
    remaining,
    reset,
  }
}
