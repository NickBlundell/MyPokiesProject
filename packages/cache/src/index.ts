// Export cache manager
export { cacheManager, CACHE_TTL } from './redis-cache'

// Export decorators and utilities
export {
  Cacheable,
  CacheInvalidate,
  CacheConfig,
  cacheAside,
  batchCache,
  singleflight,
  warmCache,
  type CacheOptions
} from './cache-decorator'