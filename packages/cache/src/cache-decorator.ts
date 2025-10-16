/**
 * Cache decorators and utilities for automatic caching
 */

import { cacheManager } from './redis-cache'

/**
 * Cache options
 */
export interface CacheOptions {
  key?: string
  ttl?: number
  condition?: (...args: any[]) => boolean
  invalidateOn?: string[]
}

/**
 * Method decorator for caching
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // Check if caching should be applied
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args)
      }

      // Generate cache key
      const cacheKey = options.key || generateCacheKey(target.constructor.name, propertyKey, args)

      // Try to get from cache
      const cached = await cacheManager.get(cacheKey)
      if (cached !== null) {
        console.log(`[CACHE HIT] ${cacheKey}`)
        return cached
      }

      // Execute original method
      console.log(`[CACHE MISS] ${cacheKey}`)
      const result = await originalMethod.apply(this, args)

      // Store in cache
      await cacheManager.set(cacheKey, result, options.ttl)

      return result
    }

    return descriptor
  }
}

/**
 * Method decorator for cache invalidation
 */
export function CacheInvalidate(patterns: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // Execute original method
      const result = await originalMethod.apply(this, args)

      // Invalidate cache patterns
      for (const pattern of patterns) {
        const key = interpolateKey(pattern, args)
        console.log(`[CACHE INVALIDATE] ${key}`)
        await cacheManager.delete(key)
      }

      return result
    }

    return descriptor
  }
}

/**
 * Class decorator for caching configuration
 */
export function CacheConfig(config: {
  prefix?: string
  defaultTTL?: number
}) {
  return function (constructor: Function) {
    constructor.prototype.cacheConfig = config
  }
}

/**
 * Generate cache key from method signature
 */
function generateCacheKey(
  className: string,
  methodName: string,
  args: any[]
): string {
  const argsKey = JSON.stringify(args)
  return `${className}:${methodName}:${argsKey}`
}

/**
 * Interpolate key pattern with arguments
 */
function interpolateKey(pattern: string, args: any[]): string {
  return pattern.replace(/\$(\d+)/g, (_, index) => {
    return args[parseInt(index)] || ''
  })
}

/**
 * Cache-aside pattern helper
 */
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = await cacheManager.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch from source
  const data = await fetcher()

  // Store in cache
  await cacheManager.set(key, data, ttl)

  return data
}

/**
 * Batch cache helper
 */
export async function batchCache<T>(
  keys: string[],
  fetcher: (missingKeys: string[]) => Promise<Map<string, T>>,
  ttl?: number
): Promise<Map<string, T>> {
  const result = new Map<string, T>()
  const missingKeys: string[] = []

  // Check cache for each key
  for (const key of keys) {
    const cached = await cacheManager.get<T>(key)
    if (cached !== null) {
      result.set(key, cached)
    } else {
      missingKeys.push(key)
    }
  }

  // Fetch missing data
  if (missingKeys.length > 0) {
    const fetchedData = await fetcher(missingKeys)

    // Store in cache and add to result
    for (const [key, value] of fetchedData) {
      await cacheManager.set(key, value, ttl)
      result.set(key, value)
    }
  }

  return result
}

/**
 * Cached promise to prevent cache stampede
 */
const inFlightPromises = new Map<string, Promise<any>>()

export async function singleflight<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if request is already in flight
  if (inFlightPromises.has(key)) {
    console.log(`[SINGLEFLIGHT HIT] ${key}`)
    return inFlightPromises.get(key)!
  }

  // Create new promise
  const promise = fetcher().finally(() => {
    inFlightPromises.delete(key)
  })

  inFlightPromises.set(key, promise)
  return promise
}

/**
 * Cache warming utility
 */
export async function warmCache(
  items: Array<{
    key: string
    fetcher: () => Promise<any>
    ttl?: number
  }>
): Promise<void> {
  console.log(`[CACHE WARM] Starting cache warm for ${items.length} items`)

  await Promise.all(
    items.map(async ({ key, fetcher, ttl }) => {
      try {
        const data = await fetcher()
        await cacheManager.set(key, data, ttl)
        console.log(`[CACHE WARM] Warmed ${key}`)
      } catch (error) {
        console.error(`[CACHE WARM] Failed to warm ${key}:`, error)
      }
    })
  )

  console.log(`[CACHE WARM] Completed`)
}