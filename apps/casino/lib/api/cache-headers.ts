import { NextResponse } from 'next/server'

export type CacheStrategy =
  | 'no-cache'         // Always revalidate
  | 'private-cache'    // Cache in browser only
  | 'public-cache'     // Cache in CDN + browser
  | 'immutable'        // Never changes
  | 'real-time'        // No caching at all

interface CacheOptions {
  strategy: CacheStrategy
  maxAge?: number      // Seconds
  staleWhileRevalidate?: number // Seconds
  tags?: string[]      // For Next.js cache tags
}

/**
 * Apply cache headers to a NextResponse based on strategy
 */
export function withCacheHeaders<T>(
  data: T,
  options: CacheOptions,
  status = 200
): NextResponse {
  const response = NextResponse.json(data, { status })

  switch (options.strategy) {
    case 'no-cache':
      // Must revalidate with server
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      break

    case 'private-cache':
      // Cache in browser only (user-specific data)
      const privateMaxAge = options.maxAge || 60 // Default 1 minute
      const privateSwr = options.staleWhileRevalidate || 300 // Default 5 minutes
      response.headers.set(
        'Cache-Control',
        `private, max-age=${privateMaxAge}, stale-while-revalidate=${privateSwr}`
      )
      break

    case 'public-cache':
      // Cache in CDN and browser (public data)
      const publicMaxAge = options.maxAge || 300 // Default 5 minutes
      const publicSwr = options.staleWhileRevalidate || 3600 // Default 1 hour
      response.headers.set(
        'Cache-Control',
        `public, max-age=${publicMaxAge}, s-maxage=${publicMaxAge}, stale-while-revalidate=${publicSwr}`
      )
      break

    case 'immutable':
      // Never changes (versioned assets)
      const immutableMaxAge = options.maxAge || 31536000 // Default 1 year
      response.headers.set(
        'Cache-Control',
        `public, max-age=${immutableMaxAge}, immutable`
      )
      break

    case 'real-time':
      // No caching at all
      response.headers.set('Cache-Control', 'no-store')
      response.headers.set('X-Content-Type-Options', 'nosniff')
      break
  }

  // Add cache tags for Next.js revalidation
  if (options.tags && options.tags.length > 0) {
    response.headers.set('X-Cache-Tags', options.tags.join(','))
  }

  // Add timestamp for debugging
  response.headers.set('X-Cache-Date', new Date().toISOString())

  return response
}

/**
 * Recommended cache strategies for different endpoints
 */
export const CACHE_STRATEGIES = {
  // Public data that changes occasionally
  JACKPOT: {
    strategy: 'public-cache' as const,
    maxAge: 30, // 30 seconds
    staleWhileRevalidate: 300, // 5 minutes
    tags: ['jackpot']
  },

  // User-specific data
  USER_BALANCE: {
    strategy: 'private-cache' as const,
    maxAge: 10, // 10 seconds
    staleWhileRevalidate: 30, // 30 seconds
    tags: ['user-balance']
  },

  // Frequently changing data
  TRANSACTIONS: {
    strategy: 'private-cache' as const,
    maxAge: 5, // 5 seconds
    staleWhileRevalidate: 15, // 15 seconds
    tags: ['transactions']
  },

  // Static reference data
  BONUS_OFFERS: {
    strategy: 'public-cache' as const,
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    tags: ['bonuses']
  },

  // Real-time critical data
  GAME_STATE: {
    strategy: 'real-time' as const,
    tags: ['game']
  },

  // Authentication endpoints
  AUTH: {
    strategy: 'no-cache' as const,
    tags: ['auth']
  }
}

/**
 * Helper to invalidate cache tags (for use after updates)
 */
export async function revalidateCache(tags: string[]) {
  if (typeof window === 'undefined') {
    // Server-side only
    try {
      const { revalidateTag } = await import('next/cache')
      for (const tag of tags) {
        revalidateTag(tag)
      }
    } catch (error) {
      console.error('Failed to revalidate cache', { error, tags })
    }
  }
}