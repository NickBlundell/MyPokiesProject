'use client'

import { logError } from '@mypokies/monitoring/client'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

interface CacheOptions {
  ttl?: number        // Time to live in milliseconds
  storage?: 'memory' | 'session' | 'local' // Storage type
  key?: string        // Custom storage key
}

/**
 * In-memory cache for fast access
 * Uses unknown for generic storage - specific types validated at get/set time
 */
const memoryCache = new Map<string, CacheEntry<unknown>>()

/**
 * Generic cache store with multiple storage backends
 */
export class CacheStore {
  /**
   * Get cached data
   */
  static get<T>(key: string, options: CacheOptions = {}): T | null {
    const storage = options.storage || 'memory'

    try {
      let entry: CacheEntry<T> | null = null

      switch (storage) {
        case 'memory':
          entry = (memoryCache.get(key) as CacheEntry<T>) || null
          break

        case 'session':
          if (typeof window !== 'undefined' && window.sessionStorage) {
            const stored = sessionStorage.getItem(key)
            if (stored) {
              entry = JSON.parse(stored)
            }
          }
          break

        case 'local':
          if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(key)
            if (stored) {
              entry = JSON.parse(stored)
            }
          }
          break
      }

      if (!entry) return null

      // Check if expired
      if (Date.now() > entry.expiry) {
        this.delete(key, options)
        return null
      }

      return entry.data
    } catch (error) {
      logError(`Cache get error for ${key}`, { context: 'CacheStore', data: error })
      return null
    }
  }

  /**
   * Set cached data
   */
  static set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const storage = options.storage || 'memory'
    const ttl = options.ttl || 60000 // Default 1 minute

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    }

    try {
      switch (storage) {
        case 'memory':
          memoryCache.set(key, entry)
          break

        case 'session':
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem(key, JSON.stringify(entry))
          }
          break

        case 'local':
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(key, JSON.stringify(entry))
          }
          break
      }
    } catch (error) {
      logError(`Cache set error for ${key}`, { context: 'CacheStore', data: error })
    }
  }

  /**
   * Delete cached data
   */
  static delete(key: string, options: CacheOptions = {}): void {
    const storage = options.storage || 'memory'

    try {
      switch (storage) {
        case 'memory':
          memoryCache.delete(key)
          break

        case 'session':
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.removeItem(key)
          }
          break

        case 'local':
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(key)
          }
          break
      }
    } catch (error) {
      logError(`Cache delete error for ${key}`, { context: 'CacheStore', data: error })
    }
  }

  /**
   * Clear all cached data
   */
  static clear(storage?: 'memory' | 'session' | 'local' | 'all'): void {
    try {
      if (!storage || storage === 'all' || storage === 'memory') {
        memoryCache.clear()
      }

      if (typeof window !== 'undefined') {
        if (!storage || storage === 'all' || storage === 'session') {
          sessionStorage.clear()
        }

        if (!storage || storage === 'all' || storage === 'local') {
          // Only clear our cache keys, not all localStorage
          const keysToRemove: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('mypokies_cache_')) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key))
        }
      }
    } catch (error) {
      logError('Cache clear error', { context: 'CacheStore', data: error })
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    memorySize: number
    sessionSize: number
    localSize: number
  } {
    let sessionSize = 0
    let localSize = 0

    if (typeof window !== 'undefined') {
      // Estimate storage sizes
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key) {
            const value = sessionStorage.getItem(key)
            if (value) {
              sessionSize += key.length + value.length
            }
          }
        }

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('mypokies_cache_')) {
            const value = localStorage.getItem(key)
            if (value) {
              localSize += key.length + value.length
            }
          }
        }
      } catch (error) {
        logError('Error calculating cache stats', { context: 'CacheStore', data: error })
      }
    }

    return {
      memorySize: memoryCache.size,
      sessionSize,
      localSize
    }
  }
}

/**
 * React hook for using cache
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const cached = CacheStore.get<T>(key, options)

  if (cached) {
    return { data: cached, isFromCache: true }
  }

  // Fetch and cache
  fetcher().then(data => {
    CacheStore.set(key, data, options)
  })

  return { data: null, isFromCache: false }
}