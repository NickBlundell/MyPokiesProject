'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GameStatistics } from '@/types/games'
import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { logDebug, logError, logInfo } from '@mypokies/monitoring/client'

interface GameStatsTableRow {
  [key: string]: unknown
}

/**
 * Real-time hook for individual game statistics
 * Note: Public data, no authentication required
 * Only listens to UPDATE events (statistics are updated, not inserted/deleted)
 *
 * @param gameId - The game ID to monitor
 * @returns Game statistics that update in real-time
 */
export function useRealtimeGameStats(gameId: string | null) {
  const [statistics, setStatistics] = useState<GameStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch game statistics
  const fetchStats = useCallback(async () => {
    if (!gameId) return

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('game_statistics')
      .select('*')
      .eq('game_id', gameId)
      .single()

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setStatistics(data)
  }, [gameId])

  useEffect(() => {
    if (!gameId) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    async function setup() {
      try {
        // Fetch initial statistics
        await fetchStats()
        setLoading(false)

        // Subscribe to UPDATE events (statistics are updated, not inserted/deleted)
        channel = supabase
          .channel(`game_stats_${gameId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_statistics',
            filter: `game_id=eq.${gameId}`
          }, (payload: RealtimePostgresChangesPayload<GameStatsTableRow>) => {
            logDebug('Game statistics updated', { context: 'useRealtimeGameStats', data: payload })
            setStatistics(payload.new as GameStatistics)
          })
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Game stats subscription status', { context: 'useRealtimeGameStats', data: { status } })
          })
      } catch (err) {
        logError('Error setting up game stats subscription', { context: 'useRealtimeGameStats', data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [gameId, fetchStats])

  return { statistics, loading, error }
}
