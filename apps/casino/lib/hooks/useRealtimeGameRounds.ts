'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import type { GameRound } from '@/types/player'
import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { logDebug, logError, logInfo } from '@mypokies/monitoring/client'

interface GameRoundTableRow {
  id?: string
  [key: string]: unknown
}

interface UseRealtimeGameRoundsOptions {
  limit?: number
}

// Reusable select string for game rounds with actions
const GAME_ROUND_SELECT = `
  id,
  game_round_id,
  game_desc,
  currency,
  total_bet,
  total_win,
  status,
  started_at,
  completed_at,
  round_actions(
    action_id,
    game_id,
    action_type,
    amount,
    timestamp
  )
`

/**
 * Real-time hook for game rounds
 * Note: Handles both INSERT and UPDATE events to track round progress
 *
 * @param options Configuration options
 * @returns Game rounds array that updates in real-time
 */
export function useRealtimeGameRounds(options: UseRealtimeGameRoundsOptions = {}) {
  const { limit = 50 } = options
  const { userId } = useAuth()
  const [rounds, setRounds] = useState<GameRound[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial game rounds
  const fetchRounds = useCallback(async () => {
    if (!userId) return

    const supabase = createClient()
    const { data: initialRounds, error: fetchError } = await supabase
      .from('game_rounds')
      .select(GAME_ROUND_SELECT)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setRounds(initialRounds || [])
  }, [userId, limit])

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
        // Fetch initial game rounds
        await fetchRounds()
        setLoading(false)

        // Set up real-time subscription for INSERT and UPDATE
        channel = supabase
          .channel('game-round-updates')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'game_rounds',
            filter: `user_id=eq.${userId}`
          }, async (payload: RealtimePostgresChangesPayload<GameRoundTableRow>) => {
            logDebug('Game round update received', { context: 'useRealtimeGameRounds', data: payload })

            if (payload.eventType === 'INSERT') {
              // Fetch complete round with actions
              const { data: newRound } = await supabase
                .from('game_rounds')
                .select(GAME_ROUND_SELECT)
                .eq('id', payload.new.id)
                .single()

              if (newRound) {
                setRounds((prev) => {
                  const updated = [newRound, ...prev]
                  return updated.slice(0, limit)
                })
              }
            } else if (payload.eventType === 'UPDATE') {
              // Fetch updated round with actions
              const { data: updatedRound } = await supabase
                .from('game_rounds')
                .select(GAME_ROUND_SELECT)
                .eq('id', payload.new.id)
                .single()

              if (updatedRound) {
                setRounds((prev) =>
                  prev.map((r) => (r.id === updatedRound.id ? updatedRound : r))
                )
              }
            }
          })
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Game round subscription status', { context: 'useRealtimeGameRounds', data: { status } })
          })
      } catch (err) {
        logError('Error setting up realtime subscription', { context: 'useRealtimeGameRounds', data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setup()

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, limit, fetchRounds])

  return { rounds, loading, error }
}
