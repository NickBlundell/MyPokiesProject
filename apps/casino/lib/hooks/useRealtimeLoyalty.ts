'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import type { PlayerTierInfo } from '@/types/loyalty'
import { logWarn, logError, logInfo } from '@/lib/utils/client-logger'

/**
 * Real-time hook for player's loyalty status
 * Note: Uses API endpoint pattern because loyalty requires complex tier calculations
 *
 * @returns Loyalty tier info that updates in real-time
 */
export function useRealtimeLoyalty() {
  const { userId } = useAuth()
  const [loyalty, setLoyalty] = useState<PlayerTierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch loyalty info from API endpoint
  const fetchLoyalty = useCallback(async () => {
    try {
      const response = await fetch('/api/loyalty/status')

      if (!response.ok) {
        logWarn('Failed to fetch loyalty info', { context: 'useRealtimeLoyalty', data: { status: response.status } })
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        logWarn('Response is not JSON', { context: 'useRealtimeLoyalty' })
        return
      }

      const data = await response.json()

      if (data.tier_info) {
        setLoyalty(data.tier_info)
      }
    } catch (err) {
      logWarn('Failed to fetch loyalty info', { context: 'useRealtimeLoyalty', data: err })
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    async function setup() {
      try {
        // Fetch initial loyalty info
        await fetchLoyalty()
        setLoading(false)

        // Subscribe to loyalty updates - refetch from API on any change
        channel = supabase
          .channel('loyalty-updates')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'player_loyalty',
            filter: `user_id=eq.${userId}`
          }, fetchLoyalty)
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Loyalty subscription status', { context: 'useRealtimeLoyalty', data: { status } })
          })
      } catch (err) {
        logError('Error setting up loyalty subscription', { context: 'useRealtimeLoyalty', data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, fetchLoyalty])

  return { loyalty, loading, error }
}
