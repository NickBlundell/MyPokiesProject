'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GameWithStats } from '@/types/games'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { logError } from '@/lib/utils/client-logger'

interface GameTableRow {
  id?: string
  statistics?: any
  [key: string]: unknown
}

// AppContext now only handles games data
// Jackpot data is provided by JackpotAnimationContext to avoid duplicate subscriptions
interface AppContextType {
  games: GameWithStats[]
  gamesLoading: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<GameWithStats[]>([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // Prevent double fetches from React Strict Mode
  const fetchedRef = useRef(false)
  const mountedRef = useRef(true)

  // PERFORMANCE: Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ games, gamesLoading }), [games, gamesLoading])

  // Removed animation logic - now handled in JackpotAnimationContext
  // This prevents global re-renders every 2 seconds

  // Set client flag first to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Restore state from localStorage on mount - only after client is ready
  useEffect(() => {
    if (!isClient) return

    try {
      const saved = localStorage.getItem('mypokies_app_state')
      if (saved) {
        const appState = JSON.parse(saved)
        // Only restore if data is less than 10 minutes old
        const age = Date.now() - (appState.timestamp || 0)
        if (age < 10 * 60 * 1000) {
          if (appState.games && appState.games.length > 0) {
            setGames(appState.games)
            // Set loading to false since we have cached games
            setGamesLoading(false)
          }
        }
      }
    } catch (error) {
      // Ignore localStorage errors
      logError('Error restoring app state from localStorage', {
        context: 'AppProvider',
        data: error
      })
    }
  }, [isClient])

  // Persist state to localStorage - only after client is ready
  useEffect(() => {
    if (!isClient) return

    try {
      const appState = {
        games,
        timestamp: Date.now()
      }
      localStorage.setItem('mypokies_app_state', JSON.stringify(appState))
    } catch (error) {
      // Ignore localStorage errors
      logError('Error saving app state to localStorage', {
        context: 'AppProvider',
        data: error
      })
    }
  }, [games, isClient])

  useEffect(() => {
    // Prevent double-fetch from React Strict Mode - only skip if we already have data
    if (fetchedRef.current && games.length > 0) {
      // If we already have games, ensure loading is false
      setGamesLoading(false)
      return
    }
    fetchedRef.current = true

    const supabase = createClient()

    // Fetch games once - PERFORMANCE: No statistics join (lazy load when needed)
    const fetchGames = async () => {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (error) throw error

        // Add null statistics for type compatibility
        const processedGames = (data?.map((game: GameTableRow) => ({
          ...game,
          statistics: null
        })) || []) as unknown as GameWithStats[]

        if (mountedRef.current) {
          setGames(processedGames)
        }
      } catch (err) {
        logError('Failed to fetch games', { context: 'AppProvider', data: err })
      } finally {
        if (mountedRef.current) {
          setGamesLoading(false)
        }
      }
    }

    fetchGames()

    // Subscribe to games changes (persists across navigations)
    const gamesChannel = supabase
      .channel('global_games_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: 'is_active=eq.true'
        },
        (payload: RealtimePostgresChangesPayload<GameTableRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === 'INSERT') {
            setGames(prev => [...prev, payload.new as unknown as GameWithStats])
          } else if (payload.eventType === 'UPDATE') {
            setGames(prev =>
              prev.map(game =>
                game.id === payload.new.id ? { ...game, ...payload.new } : game
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setGames(prev => prev.filter(game => game.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      fetchedRef.current = false // Reset on unmount to allow re-fetch on remount
      supabase.removeChannel(gamesChannel)
    }
  }, [games.length]) // Re-run if games become empty

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
