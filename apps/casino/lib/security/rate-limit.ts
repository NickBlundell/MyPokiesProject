import { rateLimitMiddleware, RateLimitType } from '@mypokies/security'
import { NextResponse } from 'next/server'
import { logger } from '@mypokies/monitoring'

/**
 * Apply rate limiting to API routes
 */
export async function withRateLimit(
  req: Request,
  handler: () => Promise<Response>,
  type: RateLimitType = 'api'
): Promise<Response> {
  try {
    const { success, headers } = await rateLimitMiddleware(req, type)

    if (!success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers,
      })
    }

    // Execute the actual handler
    const response = await handler()

    // Add rate limit headers to successful responses
    headers.forEach((value, key) => {
      response.headers.set(key, value)
    })

    return response
  } catch (error) {
    logger.error('Rate limit error', error, {
      url: req.url,
      method: req.method,
      rateLimitType: type,
    })
    // If rate limiting fails, allow the request through
    // but log the error for monitoring
    return handler()
  }
}

/**
 * Create a rate-limited API route handler
 */
export function createRateLimitedHandler(
  handler: (req: Request) => Promise<Response>,
  type: RateLimitType = 'api'
) {
  return async (req: Request) => {
    return withRateLimit(req, () => handler(req), type)
  }
}

/**
 * Rate limit configurations for different API endpoints
 */
export const API_RATE_LIMITS = {
  // Player API endpoints
  '/api/player/profile': 'api' as RateLimitType,
  '/api/player/balance': 'api' as RateLimitType,
  '/api/player/transactions': 'api' as RateLimitType,
  '/api/player/game-history': 'api' as RateLimitType,

  // Sensitive operations
  '/api/player/link-account': 'strict' as RateLimitType,
  '/api/player/claim-phone-bonus': 'bonus' as RateLimitType,

  // Bonus endpoints
  '/api/bonuses/claim-no-deposit': 'bonus' as RateLimitType,
  '/api/bonuses/active': 'api' as RateLimitType,
  '/api/bonuses/available': 'api' as RateLimitType,

  // Loyalty endpoints
  '/api/loyalty/redeem': 'strict' as RateLimitType,
  '/api/loyalty/status': 'api' as RateLimitType,

  // Game endpoints
  '/api/games': 'api' as RateLimitType,
  '/api/games/favorites': 'api' as RateLimitType,

  // Jackpot endpoints
  '/api/jackpot/current': 'api' as RateLimitType,
  '/api/jackpot/my-tickets': 'api' as RateLimitType,

  // Auth endpoints
  '/auth/login': 'auth' as RateLimitType,
  '/auth/sign-up': 'auth' as RateLimitType,
  '/auth/update-password': 'auth' as RateLimitType,
} as const