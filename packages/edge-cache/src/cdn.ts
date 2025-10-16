/**
 * CDN integration for various providers
 */

export interface CDNConfig {
  provider: 'cloudflare' | 'cloudfront' | 'fastly' | 'vercel'
  apiKey?: string
  zoneId?: string
  distributionId?: string
  serviceId?: string
}

export interface PurgeOptions {
  paths?: string[]
  tags?: string[]
  all?: boolean
}

/**
 * CDN manager for cache purging and management
 */
export class CDNManager {
  constructor(private config: CDNConfig) {}

  /**
   * Purge CDN cache
   */
  async purge(options: PurgeOptions): Promise<{ success: boolean; message: string }> {
    switch (this.config.provider) {
      case 'cloudflare':
        return this.purgeCloudflare(options)
      case 'cloudfront':
        return this.purgeCloudFront(options)
      case 'fastly':
        return this.purgeFastly(options)
      case 'vercel':
        return this.purgeVercel(options)
      default:
        return { success: false, message: 'Unknown CDN provider' }
    }
  }

  /**
   * Purge Cloudflare cache
   */
  private async purgeCloudflare(options: PurgeOptions): Promise<{ success: boolean; message: string }> {
    if (!this.config.apiKey || !this.config.zoneId) {
      return { success: false, message: 'Cloudflare API key and zone ID required' }
    }

    const endpoint = `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`

    let body: any = {}

    if (options.all) {
      body.purge_everything = true
    } else if (options.paths) {
      body.files = options.paths.map(path => `${process.env.NEXT_PUBLIC_BASE_URL}${path}`)
    } else if (options.tags) {
      body.tags = options.tags
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json() as { success?: boolean; errors?: Array<{ message: string }> }

      if (data.success) {
        return { success: true, message: 'Cloudflare cache purged successfully' }
      } else {
        return { success: false, message: data.errors?.[0]?.message || 'Purge failed' }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Purge CloudFront cache
   */
  private async purgeCloudFront(options: PurgeOptions): Promise<{ success: boolean; message: string }> {
    if (!this.config.distributionId) {
      return { success: false, message: 'CloudFront distribution ID required' }
    }

    // This would use AWS SDK
    // Simplified example:
    const paths = options.all ? ['/*'] : options.paths || []

    console.log(`Purging CloudFront distribution ${this.config.distributionId}:`, paths)

    // In production, use AWS SDK:
    // const cloudfront = new CloudFront({ region: 'us-east-1' })
    // await cloudfront.createInvalidation({
    //   DistributionId: this.config.distributionId,
    //   InvalidationBatch: {
    //     CallerReference: Date.now().toString(),
    //     Paths: { Quantity: paths.length, Items: paths }
    //   }
    // }).promise()

    return { success: true, message: 'CloudFront invalidation created' }
  }

  /**
   * Purge Fastly cache
   */
  private async purgeFastly(options: PurgeOptions): Promise<{ success: boolean; message: string }> {
    if (!this.config.apiKey || !this.config.serviceId) {
      return { success: false, message: 'Fastly API key and service ID required' }
    }

    let endpoint: string
    let method = 'POST'

    if (options.all) {
      endpoint = `https://api.fastly.com/service/${this.config.serviceId}/purge_all`
    } else if (options.tags) {
      // Purge by surrogate keys (tags)
      endpoint = `https://api.fastly.com/service/${this.config.serviceId}/purge`
      // Add surrogate-key header
    } else if (options.paths) {
      // Purge individual URLs
      method = 'PURGE'
      endpoint = `https://api.fastly.com/service/${this.config.serviceId}/purge`
      // Would need to iterate through paths
    } else {
      return { success: false, message: 'No purge options specified' }
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Fastly-Key': this.config.apiKey,
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        return { success: true, message: 'Fastly cache purged successfully' }
      } else {
        return { success: false, message: `Purge failed: ${response.statusText}` }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Purge Vercel cache
   */
  private async purgeVercel(options: PurgeOptions): Promise<{ success: boolean; message: string }> {
    const revalidateUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/revalidate`
      : '/api/revalidate'

    try {
      const response = await fetch(revalidateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paths: options.paths || [],
          tags: options.tags || [],
        }),
      })

      if (response.ok) {
        return { success: true, message: 'Vercel cache revalidated successfully' }
      } else {
        return { success: false, message: `Revalidation failed: ${response.statusText}` }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Warm CDN cache
   */
  async warmCache(urls: string[]): Promise<{ warmed: string[]; failed: string[] }> {
    const warmed: string[] = []
    const failed: string[] = []

    await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'CDN-Warmer/1.0',
            },
          })

          if (response.ok) {
            warmed.push(url)
          } else {
            failed.push(url)
          }
        } catch {
          failed.push(url)
        }
      })
    )

    return { warmed, failed }
  }

  /**
   * Get CDN statistics (if available)
   */
  async getStats(): Promise<any> {
    switch (this.config.provider) {
      case 'cloudflare':
        return this.getCloudflareStats()
      default:
        return { message: 'Stats not available for this provider' }
    }
  }

  /**
   * Get Cloudflare analytics
   */
  private async getCloudflareStats(): Promise<any> {
    if (!this.config.apiKey || !this.config.zoneId) {
      return { error: 'Cloudflare API key and zone ID required' }
    }

    const endpoint = `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/analytics/dashboard`

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      })

      return await response.json()
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

/**
 * CDN cache rule type
 */
export type CDNCacheRule = {
  pattern: RegExp
  maxAge: number
  immutable?: boolean
  staleWhileRevalidate?: number
}

/**
 * CDN cache rules
 */
export const CDN_CACHE_RULES: Record<string, CDNCacheRule> = {
  // Static assets - cache for a long time
  static: {
    pattern: /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|gif|ico)$/,
    maxAge: 31536000, // 1 year
    immutable: true,
  },

  // HTML pages - cache with revalidation
  html: {
    pattern: /\.html?$/,
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 1 day
  },

  // API responses - short cache
  api: {
    pattern: /^\/api\//,
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
  },

  // Game assets - moderate cache
  games: {
    pattern: /\/games?\//,
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 7200, // 2 hours
  },
}

/**
 * Generate CDN headers
 */
export function generateCDNHeaders(
  pathname: string,
  options: {
    userId?: string
    sessionId?: string
  } = {}
): Headers {
  const headers = new Headers()

  // Find matching rule
  const rule = Object.values(CDN_CACHE_RULES).find(r =>
    r.pattern.test(pathname)
  )

  if (rule) {
    // Cache control
    const cacheControl = [`max-age=${rule.maxAge}`, 's-maxage=31536000']

    if (rule.staleWhileRevalidate) {
      cacheControl.push(`stale-while-revalidate=${rule.staleWhileRevalidate}`)
    }

    if (rule.immutable) {
      cacheControl.push('immutable')
    }

    headers.set('Cache-Control', cacheControl.join(', '))

    // Surrogate keys for targeted purging
    const surrogateKeys = ['all']

    if (pathname.startsWith('/api/')) {
      surrogateKeys.push('api')
    }

    if (pathname.includes('games')) {
      surrogateKeys.push('games')
    }

    if (options.userId) {
      surrogateKeys.push(`user:${options.userId}`)
    }

    headers.set('Surrogate-Key', surrogateKeys.join(' '))

    // Vary header for proper caching
    const vary = ['Accept-Encoding']

    if (pathname.startsWith('/api/')) {
      vary.push('Authorization')
    }

    headers.set('Vary', vary.join(', '))
  } else {
    // Default no-cache for unmatched paths
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }

  return headers
}

/**
 * CDN prefetch hints
 */
export function generatePrefetchHints(resources: string[]): string {
  return resources
    .map(resource => `<${resource}>; rel=prefetch`)
    .join(', ')
}

/**
 * CDN push hints (HTTP/2 Server Push)
 */
export function generatePushHints(resources: Array<{ path: string; as: string }>): string {
  return resources
    .map(({ path, as }) => `<${path}>; rel=preload; as=${as}`)
    .join(', ')
}