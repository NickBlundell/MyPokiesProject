'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import type { MyJackpotTickets } from '@/types/jackpot'
import { logWarn, logError, logInfo } from '@mypokies/monitoring/client'

/**
 * Real-time hook for player's jackpot tickets
 * Note: Uses API endpoint pattern for ticket calculations
 *
 * @returns Ticket info that updates in real-time
 */
export function useRealtimeMyTickets() {
  const { userId } = useAuth()
  const [tickets, setTickets] = useState<MyJackpotTickets | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch ticket info from API endpoint
  const fetchTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/jackpot/my-tickets')

      if (!response.ok) {
        logWarn('Failed to fetch ticket info', { context: 'useRealtimeMyTickets', data: { status: response.status } })
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        logWarn('Response is not JSON', { context: 'useRealtimeMyTickets' })
        return
      }

      const data = await response.json()

      if (data.tickets) {
        setTickets(data.tickets)
      }
    } catch (err) {
      logWarn('Failed to fetch ticket info', { context: 'useRealtimeMyTickets', data: err })
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
        // Fetch initial ticket info
        await fetchTickets()
        setLoading(false)

        // Subscribe to ticket count updates - refetch from API on any change
        channel = supabase
          .channel('my-ticket-updates')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'player_ticket_counts',
            filter: `user_id=eq.${userId}`
          }, fetchTickets)
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Ticket subscription status', { context: 'useRealtimeMyTickets', data: { status } })
          })
      } catch (err) {
        logError('Error setting up ticket subscription', { context: 'useRealtimeMyTickets', data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, fetchTickets])

  return { tickets, loading, error }
}
