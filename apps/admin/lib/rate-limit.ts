import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Admin panel rate limiter - stricter than public API (5 requests per 10 seconds)
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit/mypokies-admin',
})

// Very strict rate limit for sensitive admin operations (2 requests per minute)
export const strictRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(2, '60 s'),
  analytics: true,
  prefix: '@upstash/ratelimit/mypokies-admin-strict',
})

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
export async function checkRateLimit(
  request: Request,
  options?: {
    strict?: boolean
    identifier?: string
  }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const limiter = options?.strict ? strictRatelimit : ratelimit
  const identifier = options?.identifier || getClientIdentifier(request)

  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  return {
    success,
    limit,
    remaining,
    reset,
  }
}
