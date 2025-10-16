/**
 * Edge caching and CDN optimization
 */

// Export edge cache
export {
  EdgeCache,
  edgeCache,
  parseCacheControl,
  setCacheHeaders,
  type EdgeCacheOptions,
  type CacheControl,
} from './edge-cache'

// Export middleware
export {
  createEdgeCacheMiddleware,
  cacheApiResponse,
  invalidateCache,
  withSWR,
  cacheStaticAssets,
  cacheApiRoutes,
  type EdgeMiddlewareOptions,
} from './middleware'

// Export CDN utilities
export {
  CDNManager,
  CDN_CACHE_RULES,
  generateCDNHeaders,
  generatePrefetchHints,
  generatePushHints,
  type CDNConfig,
  type PurgeOptions,
} from './cdn'