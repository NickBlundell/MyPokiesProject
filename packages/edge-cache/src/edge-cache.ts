/**
 * Edge caching implementation for Vercel Edge and Cloudflare Workers
 */

export interface EdgeCacheOptions {
  defaultTTL?: number
  staleWhileRevalidate?: number
  tags?: string[]
  revalidate?: number
}

export interface CacheControl {
  maxAge: number
  sMaxAge?: number
  staleWhileRevalidate?: number
  staleIfError?: number
  public?: boolean
  private?: boolean
  noCache?: boolean
  noStore?: boolean
  mustRevalidate?: boolean
  proxyRevalidate?: boolean
  immutable?: boolean
}

/**
 * Edge cache manager for Vercel and Cloudflare
 */
export class EdgeCache {
  private runtime: 'vercel' | 'cloudflare' | 'node'

  constructor() {
    this.runtime = this.detectRuntime()
  }

  /**
   * Detect the runtime environment
   */
  private detectRuntime(): 'vercel' | 'cloudflare' | 'node' {
    if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
      // Check for Cloudflare Workers
      if ('CF' in (globalThis as any)) {
        return 'cloudflare'
      }
      // Check for Vercel Edge
      if (process.env.VERCEL_ENV) {
        return 'vercel'
      }
    }
    return 'node'
  }

  /**
   * Get from edge cache
   */
  async get(key: string): Promise<Response | null> {
    if (this.runtime === 'node') {
      return null // No edge cache in Node.js
    }

    try {
      const cache = await caches.open('edge-cache-v1')
      const request = new Request(`https://cache.local/${key}`)
      const response = await cache.match(request)
      return response || null
    } catch (error) {
      console.error('Edge cache get error:', error)
      return null
    }
  }

  /**
   * Set in edge cache
   */
  async set(
    key: string,
    response: Response,
    options: EdgeCacheOptions = {}
  ): Promise<void> {
    if (this.runtime === 'node') {
      return // No edge cache in Node.js
    }

    try {
      const cache = await caches.open('edge-cache-v1')
      const request = new Request(`https://cache.local/${key}`)

      // Clone response to modify headers
      const clonedResponse = new Response(response.body, response)

      // Set cache control headers
      const cacheControl = this.buildCacheControl(options)
      clonedResponse.headers.set('Cache-Control', cacheControl)

      // Set custom headers for tags and revalidation
      if (options.tags) {
        clonedResponse.headers.set('X-Cache-Tags', options.tags.join(','))
      }

      if (options.revalidate) {
        clonedResponse.headers.set('X-Revalidate', options.revalidate.toString())
      }

      await cache.put(request, clonedResponse)
    } catch (error) {
      console.error('Edge cache set error:', error)
    }
  }

  /**
   * Delete from edge cache
   */
  async delete(key: string): Promise<boolean> {
    if (this.runtime === 'node') {
      return false
    }

    try {
      const cache = await caches.open('edge-cache-v1')
      const request = new Request(`https://cache.local/${key}`)
      return await cache.delete(request)
    } catch (error) {
      console.error('Edge cache delete error:', error)
      return false
    }
  }

  /**
   * Purge cache by tags (Cloudflare)
   */
  async purgeByTags(tags: string[]): Promise<void> {
    if (this.runtime !== 'cloudflare') {
      return
    }

    // This would integrate with Cloudflare's purge API
    // Implementation depends on Cloudflare API setup
    console.log('Purging cache by tags:', tags)
  }

  /**
   * Build cache control header
   */
  private buildCacheControl(options: EdgeCacheOptions): string {
    const parts: string[] = []
    const ttl = options.defaultTTL || 300 // 5 minutes default

    parts.push(`max-age=${ttl}`)
    parts.push(`s-maxage=${ttl}`)

    if (options.staleWhileRevalidate) {
      parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
    }

    parts.push('public')

    return parts.join(', ')
  }

  /**
   * Cache wrapper for edge functions
   */
  async cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: EdgeCacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get(key)
    if (cached) {
      try {
        const data = await cached.json()
        return data as T
      } catch {
        // Invalid cache, continue to fetch
      }
    }

    // Fetch fresh data
    const data = await fetcher()

    // Store in cache
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    await this.set(key, response, options)

    return data
  }
}

/**
 * Parse cache control header
 */
export function parseCacheControl(header: string): CacheControl {
  const directives = header.split(',').map(d => d.trim().toLowerCase())
  const result: CacheControl = { maxAge: 0 }

  for (const directive of directives) {
    if (directive.startsWith('max-age=')) {
      result.maxAge = parseInt(directive.split('=')[1], 10)
    } else if (directive.startsWith('s-maxage=')) {
      result.sMaxAge = parseInt(directive.split('=')[1], 10)
    } else if (directive.startsWith('stale-while-revalidate=')) {
      result.staleWhileRevalidate = parseInt(directive.split('=')[1], 10)
    } else if (directive.startsWith('stale-if-error=')) {
      result.staleIfError = parseInt(directive.split('=')[1], 10)
    } else if (directive === 'public') {
      result.public = true
    } else if (directive === 'private') {
      result.private = true
    } else if (directive === 'no-cache') {
      result.noCache = true
    } else if (directive === 'no-store') {
      result.noStore = true
    } else if (directive === 'must-revalidate') {
      result.mustRevalidate = true
    } else if (directive === 'proxy-revalidate') {
      result.proxyRevalidate = true
    } else if (directive === 'immutable') {
      result.immutable = true
    }
  }

  return result
}

/**
 * Set cache control headers
 */
export function setCacheHeaders(
  headers: Headers,
  control: Partial<CacheControl>
): void {
  const parts: string[] = []

  if (control.maxAge !== undefined) {
    parts.push(`max-age=${control.maxAge}`)
  }
  if (control.sMaxAge !== undefined) {
    parts.push(`s-maxage=${control.sMaxAge}`)
  }
  if (control.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${control.staleWhileRevalidate}`)
  }
  if (control.staleIfError !== undefined) {
    parts.push(`stale-if-error=${control.staleIfError}`)
  }
  if (control.public) {
    parts.push('public')
  }
  if (control.private) {
    parts.push('private')
  }
  if (control.noCache) {
    parts.push('no-cache')
  }
  if (control.noStore) {
    parts.push('no-store')
  }
  if (control.mustRevalidate) {
    parts.push('must-revalidate')
  }
  if (control.proxyRevalidate) {
    parts.push('proxy-revalidate')
  }
  if (control.immutable) {
    parts.push('immutable')
  }

  if (parts.length > 0) {
    headers.set('Cache-Control', parts.join(', '))
  }
}

/**
 * Export singleton instance
 */
export const edgeCache = new EdgeCache()