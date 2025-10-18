'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import type { Game } from '@/types/games'
import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { logDebug, logError, logInfo } from '@mypokies/monitoring/client'

interface FavoriteTableRow {
  id: string
  user_id: string
  game_id: string
  game?: Game | Game[]
  created_at: string
  [key: string]: unknown
}

interface FavoriteGame extends Game {
  favorite_id: string
  favorited_at: string
}

/**
 * Real-time hook for user's favorite games
 * Note: Handles INSERT and DELETE events (favorites can be added/removed but not updated)
 *
 * @returns Favorite games array that updates in real-time
 */
export function useRealtimeFavoriteGames() {
  const { userId } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial favorites
  const fetchFavorites = useCallback(async () => {
    if (!userId) return

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('player_favorite_games')
      .select(`
        id,
        created_at,
        game:games(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setFavorites(
      data?.map((fav: any) => {
        const game = Array.isArray(fav.game) ? fav.game[0] : fav.game
        return {
          ...(game as Game),
          favorite_id: fav.id,
          favorited_at: fav.created_at
        } as FavoriteGame
      }) || []
    )
  }, [userId])

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
        // Fetch initial favorites
        await fetchFavorites()
        setLoading(false)

        // Subscribe to INSERT and DELETE events
        channel = supabase
          .channel('favorite_games_changes')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'player_favorite_games',
            filter: `user_id=eq.${userId}`
          }, async (payload: RealtimePostgresChangesPayload<FavoriteTableRow>) => {
            logDebug('Favorite added', { context: 'useRealtimeFavoriteGames', data: payload })

            // Fetch the game details
            const newRow = payload.new as FavoriteTableRow
            const { data: game } = await supabase
              .from('games')
              .select('*')
              .eq('id', newRow.game_id)
              .single()

            if (game) {
              setFavorites(prev => [
                {
                  ...game,
                  favorite_id: newRow.id,
                  favorited_at: newRow.created_at
                } as FavoriteGame,
                ...prev
              ])
            }
          })
          .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'player_favorite_games',
            filter: `user_id=eq.${userId}`
          }, (payload: RealtimePostgresChangesPayload<FavoriteTableRow>) => {
            logDebug('Favorite removed', { context: 'useRealtimeFavoriteGames', data: payload })
            setFavorites(prev =>
              prev.filter(fav => fav.favorite_id !== (payload.old as { id: string }).id)
            )
          })
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Favorite games subscription status', { context: 'useRealtimeFavoriteGames', data: { status } })
          })
      } catch (err) {
        logError('Error setting up favorite games subscription', { context: 'useRealtimeFavoriteGames', data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, fetchFavorites])

  return { favorites, loading, error }
}
