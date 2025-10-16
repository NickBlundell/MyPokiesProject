import { NextResponse } from 'next/server'

/**
 * Cache configuration for API routes
 */
export const CacheConfig = {
  // Public data that changes infrequently
  LONG: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400', // 1 hour, stale for 1 day

  // Public data that changes frequently
  SHORT: 'public, max-age=60, s-maxage=60, stale-while-revalidate=300', // 1 minute, stale for 5 minutes

  // User-specific data
  PRIVATE: 'private, no-cache, no-store, must-revalidate', // No caching for user data

  // Static data that rarely changes
  STATIC: 'public, max-age=31536000, immutable', // 1 year
} as const

/**
 * Add cache headers to NextResponse
 */
export function withCache(
  response: NextResponse,
  cacheControl: string = CacheConfig.SHORT
): NextResponse {
  response.headers.set('Cache-Control', cacheControl)
  response.headers.set('CDN-Cache-Control', cacheControl)
  response.headers.set('Vercel-CDN-Cache-Control', cacheControl)
  return response
}

/**
 * Create a cached response
 */
export function cachedResponse(
  data: unknown,
  options: {
    status?: number
    cache?: string
    headers?: Record<string, string>
  } = {}
): NextResponse {
  const response = NextResponse.json(data, { status: options.status || 200 })

  // Add cache headers
  const cacheControl = options.cache || CacheConfig.SHORT
  response.headers.set('Cache-Control', cacheControl)
  response.headers.set('CDN-Cache-Control', cacheControl)
  response.headers.set('Vercel-CDN-Cache-Control', cacheControl)

  // Add custom headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  return response
}
