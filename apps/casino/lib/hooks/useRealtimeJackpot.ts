'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import type { CurrentJackpotInfo } from '@/types/jackpot'
import { logWarn, logError, logInfo } from '@mypokies/monitoring/client'

/**
 * Real-time hook for jackpot pool updates
 * Note: Public data, no authentication required
 * Uses API endpoint pattern for complete jackpot calculations
 *
 * @returns Current jackpot info that updates in real-time
 */
export function useRealtimeJackpot() {
  const [jackpot, setJackpot] = useState<CurrentJackpotInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch jackpot info from API endpoint
  const fetchJackpot = useCallback(async () => {
    try {
      const response = await fetch('/api/jackpot/current')

      if (!response.ok) {
        logWarn('Failed to fetch jackpot info', { context: 'useRealtimeJackpot', data: { status: response.status } })
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        logWarn('Response is not JSON', { context: 'useRealtimeJackpot' })
        return
      }

      const data = await response.json()

      if (data.jackpot) {
        setJackpot(data.jackpot)
      }
    } catch (err) {
      logWarn('Failed to fetch jackpot info', { context: 'useRealtimeJackpot', data: err })
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    async function setup() {
      try {
        // Fetch initial jackpot info
        await fetchJackpot()
        setLoading(false)

        // Subscribe to jackpot pool updates - refetch from API on any change
        channel = supabase
          .channel('jackpot-pool-updates')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'jackpot_pools',
            filter: `jackpot_name=eq.Weekly Main Jackpot`
          }, fetchJackpot)
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Jackpot subscription status', { context: 'useRealtimeJackpot', data: { status } })
          })
      } catch (err) {
        logError('Error setting up jackpot subscription', { context: 'useRealtimeJackpot', data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchJackpot])

  return { jackpot, loading, error }
}
