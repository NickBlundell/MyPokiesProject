'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import type { CurrentJackpotInfo } from '@/types/jackpot'
import { CacheStore } from './cache-store'
import { logError, logInfo } from '@mypokies/monitoring/client'

const CACHE_KEY = 'mypokies_cache_jackpot'
const CACHE_TTL = 30000 // 30 seconds

/**
 * Enhanced real-time hook for jackpot with caching
 */
export function useRealtimeJackpotCached() {
  const [jackpot, setJackpot] = useState<CurrentJackpotInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Fetch jackpot data with caching
  const fetchJackpot = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = CacheStore.get<CurrentJackpotInfo>(CACHE_KEY, {
          storage: 'session',
          ttl: CACHE_TTL
        })

        if (cached) {
          setJackpot(cached)
          setIsFromCache(true)
          setLoading(false)
          return cached
        }
      }

      // Fetch from API
      const response = await fetch('/api/jackpot/current')

      if (!response.ok) {
        throw new Error(`Failed to fetch jackpot: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error('Invalid response format')
      }

      const data = await response.json()

      if (data.jackpot) {
        // Cache the data
        CacheStore.set(CACHE_KEY, data.jackpot, {
          storage: 'session',
          ttl: CACHE_TTL
        })

        setJackpot(data.jackpot)
        setIsFromCache(false)
        setLastUpdate(new Date())
      }

      setLoading(false)
      return data.jackpot
    } catch (err) {
      logError('Error fetching jackpot', { context: 'useRealtimeJackpotCached', data: err })
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)

      // Try to use stale cache data if available
      const staleCache = CacheStore.get<CurrentJackpotInfo>(CACHE_KEY, {
        storage: 'session',
        ttl: Infinity // Accept any cached data
      })

      if (staleCache) {
        setJackpot(staleCache)
        setIsFromCache(true)
      }

      return null
    }
  }, [])

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchJackpot(true)
  }, [fetchJackpot])

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    let refreshInterval: NodeJS.Timeout | null = null

    async function setup() {
      try {
        // Initial fetch
        await fetchJackpot()

        // Subscribe to jackpot pool updates
        channel = supabase
          .channel('jackpot-pool-updates-cached')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'jackpot_pools',
            filter: `jackpot_name=eq.Weekly Main Jackpot`
          }, async () => {
            // Invalidate cache and refetch
            CacheStore.delete(CACHE_KEY, { storage: 'session' })
            await fetchJackpot(true)
          })
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Cached jackpot subscription status', { context: 'useRealtimeJackpotCached', data: { status } })
          })

        // Set up periodic cache refresh (every minute)
        refreshInterval = setInterval(() => {
          fetchJackpot()
        }, 60000)
      } catch (err) {
        logError('Error setting up cached jackpot subscription', { context: 'useRealtimeJackpotCached', data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setup()

    return () => {
      if (refreshInterval) clearInterval(refreshInterval)
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchJackpot])

  // Prefetch for next page navigation
  const prefetch = useCallback(async () => {
    const cached = CacheStore.get<CurrentJackpotInfo>(CACHE_KEY, {
      storage: 'session',
      ttl: CACHE_TTL
    })

    if (!cached) {
      // Prefetch in background
      fetch('/api/jackpot/current')
        .then(response => response.json())
        .then(data => {
          if (data.jackpot) {
            CacheStore.set(CACHE_KEY, data.jackpot, {
              storage: 'session',
              ttl: CACHE_TTL
            })
          }
        })
        .catch(err => logError('Prefetch error', { context: 'useRealtimeJackpotCached', data: err }))
    }
  }, [])

  return {
    jackpot,
    loading,
    error,
    isFromCache,
    lastUpdate,
    refresh,
    prefetch
  }
}