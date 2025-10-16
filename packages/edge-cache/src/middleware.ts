/**
 * Edge caching middleware for Next.js
 */

import { NextRequest, NextResponse } from 'next/server'
import { edgeCache, setCacheHeaders } from './edge-cache'

export interface EdgeMiddlewareOptions {
  // Cache configuration per route
  routes?: Record<string, {
    ttl?: number
    staleWhileRevalidate?: number
    tags?: string[]
    bypassCondition?: (request: NextRequest) => boolean
  }>
  // Default cache settings
  defaultTTL?: number
  // Paths to exclude from caching
  exclude?: string[]
  // Cache key generator
  generateKey?: (request: NextRequest) => string
}

/**
 * Create edge caching middleware
 */
export function createEdgeCacheMiddleware(options: EdgeMiddlewareOptions = {}) {
  return async function edgeCacheMiddleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Check if path should be excluded
    if (options.exclude?.some(path => pathname.startsWith(path))) {
      return NextResponse.next()
    }

    // Get route-specific config
    const routeConfig = Object.entries(options.routes || {}).find(([pattern]) => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'))
        return regex.test(pathname)
      }
      return pathname.startsWith(pattern)
    })?.[1]

    // Check bypass condition
    if (routeConfig?.bypassCondition?.(request)) {
      return NextResponse.next()
    }

    // Generate cache key
    const cacheKey = options.generateKey
      ? options.generateKey(request)
      : generateDefaultCacheKey(request)

    // Try to get from cache
    const cachedResponse = await edgeCache.get(cacheKey)
    if (cachedResponse) {
      // Add cache hit header
      const response = new Response(cachedResponse.body, cachedResponse)
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Continue to the application
    const response = NextResponse.next()

    // Cache the response if it's successful
    if (response.status === 200) {
      const ttl = routeConfig?.ttl || options.defaultTTL || 300
      const staleWhileRevalidate = routeConfig?.staleWhileRevalidate || 60

      // Set cache headers
      setCacheHeaders(response.headers, {
        maxAge: ttl,
        sMaxAge: ttl,
        staleWhileRevalidate,
        public: true,
      })

      // Store in edge cache
      await edgeCache.set(cacheKey, response.clone(), {
        defaultTTL: ttl,
        staleWhileRevalidate,
        tags: routeConfig?.tags,
      })

      // Add cache miss header
      response.headers.set('X-Cache', 'MISS')
    }

    return response
  }
}

/**
 * Generate default cache key
 */
function generateDefaultCacheKey(request: NextRequest): string {
  const url = request.nextUrl
  const parts = [
    url.pathname,
    url.search,
    request.headers.get('accept-language') || 'en',
    (request as any).geo?.country || 'US',
  ]

  return parts.filter(Boolean).join(':')
}

/**
 * Cache API responses at the edge
 */
export async function cacheApiResponse<T>(
  request: NextRequest,
  handler: () => Promise<T>,
  options: {
    ttl?: number
    tags?: string[]
    cacheKey?: string
  } = {}
): Promise<NextResponse> {
  const cacheKey = options.cacheKey || generateDefaultCacheKey(request)

  // Try cache first
  const cached = await edgeCache.get(cacheKey)
  if (cached) {
    const response = new NextResponse(cached.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
      },
    })

    setCacheHeaders(response.headers, {
      maxAge: options.ttl || 300,
      sMaxAge: options.ttl || 300,
      staleWhileRevalidate: 60,
      public: true,
    })

    return response
  }

  // Execute handler
  const data = await handler()

  // Create response
  const response = NextResponse.json(data, {
    status: 200,
    headers: {
      'X-Cache': 'MISS',
    },
  })

  // Set cache headers
  setCacheHeaders(response.headers, {
    maxAge: options.ttl || 300,
    sMaxAge: options.ttl || 300,
    staleWhileRevalidate: 60,
    public: true,
  })

  // Store in cache
  await edgeCache.set(cacheKey, response.clone(), {
    defaultTTL: options.ttl || 300,
    tags: options.tags,
  })

  return response
}

/**
 * Invalidate edge cache
 */
export async function invalidateCache(patterns: string[]): Promise<void> {
  // This would integrate with your CDN's purge API
  // For now, we'll just log the patterns
  console.log('Invalidating cache patterns:', patterns)

  // If using Vercel, you could use their revalidation API
  if (process.env.VERCEL_ENV) {
    try {
      await fetch(`${process.env.VERCEL_URL}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths: patterns }),
      })
    } catch (error) {
      console.error('Failed to invalidate cache:', error)
    }
  }
}

/**
 * Stale-while-revalidate handler
 */
export async function withSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    staleTime?: number
  } = {}
): Promise<T> {
  const ttl = options.ttl || 300
  const staleTime = options.staleTime || 60

  // Try to get from cache
  const cached = await edgeCache.get(key)
  if (cached) {
    const cacheAge = getCacheAge(cached.headers)

    // If cache is fresh, return it
    if (cacheAge < ttl) {
      return (await cached.json()) as T
    }

    // If cache is stale but within stale time, return it and revalidate in background
    if (cacheAge < ttl + staleTime) {
      // Return stale data immediately
      const staleData = (await cached.json()) as T

      // Revalidate in background (don't await)
      fetcher().then(async freshData => {
        const response = new Response(JSON.stringify(freshData), {
          headers: { 'Content-Type': 'application/json' },
        })
        await edgeCache.set(key, response, { defaultTTL: ttl })
      }).catch(console.error)

      return staleData
    }
  }

  // Cache miss or too stale, fetch fresh data
  const data = await fetcher()

  // Store in cache
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
  await edgeCache.set(key, response, { defaultTTL: ttl })

  return data
}

/**
 * Get cache age from headers
 */
function getCacheAge(headers: Headers): number {
  const date = headers.get('date')
  if (!date) return Infinity

  const age = Date.now() - new Date(date).getTime()
  return Math.floor(age / 1000) // Return age in seconds
}

/**
 * Cache static assets
 */
export function cacheStaticAssets(): EdgeMiddlewareOptions {
  return {
    routes: {
      '/_next/static/*': {
        ttl: 31536000, // 1 year
        tags: ['static'],
      },
      '/images/*': {
        ttl: 86400, // 1 day
        staleWhileRevalidate: 3600, // 1 hour
        tags: ['images'],
      },
      '/fonts/*': {
        ttl: 31536000, // 1 year
        tags: ['fonts'],
      },
    },
    exclude: ['/api', '/auth'],
  }
}

/**
 * Cache API routes
 */
export function cacheApiRoutes(): EdgeMiddlewareOptions {
  return {
    routes: {
      '/api/games': {
        ttl: 3600, // 1 hour
        staleWhileRevalidate: 300, // 5 minutes
        tags: ['games'],
      },
      '/api/bonuses/available': {
        ttl: 600, // 10 minutes
        staleWhileRevalidate: 60,
        tags: ['bonuses'],
      },
      '/api/jackpot/current': {
        ttl: 60, // 1 minute
        staleWhileRevalidate: 10,
        tags: ['jackpot'],
      },
      '/api/loyalty/tiers': {
        ttl: 86400, // 1 day
        tags: ['loyalty'],
      },
    },
    exclude: ['/api/player', '/api/auth'],
    generateKey: (request) => {
      // Include user ID in cache key for personalized routes
      const userId = request.headers.get('x-user-id')
      const url = request.nextUrl
      return `${url.pathname}:${url.search}:${userId || 'anonymous'}`
    },
  }
}