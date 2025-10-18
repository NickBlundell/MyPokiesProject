'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Balance } from '@/types/player'
import type { PlayerTierInfo } from '@/types/loyalty'
import type { PlayerBonus } from '@/types/bonus'
import type { JackpotTicket } from '@/types/jackpot'
import { logError, logInfo } from '@mypokies/monitoring/client'
import { useAuth } from './auth-context'

interface BalanceTableRow {
  [key: string]: unknown
}

interface LoyaltyTableRow {
  [key: string]: unknown
}

interface BonusTableRow {
  [key: string]: unknown
}

interface PlayerContextType {
  balances: Balance[]
  loyalty: PlayerTierInfo | null
  bonuses: PlayerBonus[]
  tickets: JackpotTicket[]
  ticketCount: number
  ticketOdds: number
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
}

const PlayerContext = createContext<PlayerContextType>({
  balances: [],
  loyalty: null,
  bonuses: [],
  tickets: [],
  ticketCount: 0,
  ticketOdds: 0,
  isLoading: false,
  error: null,
  refreshData: async () => {}
})

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  // ARCHITECTURAL FIX: Use AuthProvider's user state instead of managing our own
  // This prevents race conditions and duplicate auth lookups
  // CRITICAL FIX: Also get isInitialized to prevent fetching before auth is ready
  const { user, userId, isInitialized } = useAuth()

  const [balances, setBalances] = useState<Balance[]>([])
  const [loyalty, setLoyalty] = useState<PlayerTierInfo | null>(null)
  const [bonuses, setBonuses] = useState<PlayerBonus[]>([])
  const [tickets, setTickets] = useState<JackpotTicket[]>([])
  const [ticketCount, setTicketCount] = useState(0)
  const [ticketOdds, setTicketOdds] = useState(0)
  // Start with loading false to prevent SSR issues
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // SSR FIX: Lazy-create Supabase client only when needed (client-side)
  // Don't use useMemo here as it executes during SSR
  const getSupabase = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return createClient();
  }, [])

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const playerState = {
        balances,
        loyalty,
        bonuses,
        tickets,
        ticketCount,
        ticketOdds,
        timestamp: Date.now()
      }
      localStorage.setItem('mypokies_player_state', JSON.stringify(playerState))
    } catch (error) {
      // Ignore localStorage errors
      logError('Error saving player state to localStorage', {
        context: 'PlayerProvider',
        data: error
      })
    }
  }, [balances, loyalty, bonuses, tickets, ticketCount, ticketOdds])

  // Restore state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('mypokies_player_state')
      if (saved) {
        const playerState = JSON.parse(saved)
        // Only restore if data is less than 5 minutes old
        const age = Date.now() - (playerState.timestamp || 0)
        if (age < 5 * 60 * 1000) {
          setBalances(playerState.balances || [])
          setLoyalty(playerState.loyalty || null)
          setBonuses(playerState.bonuses || [])
          setTickets(playerState.tickets || [])
          setTicketCount(playerState.ticketCount || 0)
          setTicketOdds(playerState.ticketOdds || 0)
        }
      }
    } catch (error) {
      // Ignore localStorage errors
      logError('Error restoring player state from localStorage', {
        context: 'PlayerProvider',
        data: error
      })
    }
  }, [])

  // Handle visibility changes to maintain real-time connection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        // When tab becomes visible again, just verify connection is active
        // Don't refetch data - real-time subscriptions should handle updates
        logInfo('[PlayerProvider] Tab visible, maintaining existing data', {
          context: 'PlayerProvider'
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userId])

  // Fetch initial data - PERFORMANCE: Single consolidated API call
  const fetchInitialData = useCallback(async () => {
    // Skip fetch on server side or if no user
    if (typeof window === 'undefined' || !userId) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      logInfo('[PlayerProvider] Fetching player data', {
        context: 'PlayerProvider',
        data: { userId }
      })

      // PERFORMANCE FIX: Single API call instead of 4 separate calls
      // Reduces 4 HTTP round trips + 4 auth checks → 1 of each (~2-3s faster)
      const response = await fetch('/api/player/data', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      // Handle 401 gracefully - user is not authenticated
      if (response.status === 401) {
        logInfo('[PlayerProvider] User not authenticated, skipping player data fetch', {
          context: 'PlayerProvider'
        })
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Update all state from consolidated response
      setBalances(data.balances || [])
      setLoyalty(data.loyalty || null)
      setBonuses(data.bonuses || [])
      setTickets(data.tickets || [])
      setTicketCount(data.ticketCount || 0)
      setTicketOdds(data.ticketOdds || 0)

    } catch (err) {
      logError('Error fetching player data', {
        context: 'PlayerProvider',
        data: err
      })
      setError('Failed to load player data')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Set up consolidated real-time subscription
  useEffect(() => {
    if (!userId) return

    const supabase = getSupabase()
    if (!supabase) return

    // Create a single channel for all player-related subscriptions
    const channel = supabase
      .channel('player-updates')
      .on('system', {}, (payload: any) => {
        // Handle system events like connection status
        if (payload.extension === 'postgres_changes') {
          if (payload.message === 'Subscribed to PostgreSQL') {
            logInfo('[PlayerProvider] Realtime subscriptions active', {
              context: 'PlayerProvider'
            })
          } else if (payload.message?.includes('error') || payload.message?.includes('Error')) {
            logError('Realtime subscription error', {
              context: 'PlayerProvider',
              data: payload
            })
            setError('Connection issue - some updates may be delayed')
          }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<BalanceTableRow>) => {
          // Update balances based on payload event type
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setBalances(prev => {
              const newBalance = payload.new as { currency: string; balance: number; updated_at: string }
              const existing = prev.filter(b => b.currency !== newBalance.currency)
              return [...existing, {
                currency: newBalance.currency,
                balance: newBalance.balance,
                updated_at: newBalance.updated_at
              }]
            })
          } else if (payload.eventType === 'DELETE') {
            const oldBalance = payload.old as { currency: string }
            setBalances(prev => prev.filter(b => b.currency !== oldBalance.currency))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_loyalty',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<LoyaltyTableRow>) => {
          // Update loyalty directly from payload
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newLoyalty = payload.new as any
            setLoyalty({
              tier_name: newLoyalty.current_tier || 'Bronze',
              tier_level: newLoyalty.tier_level || 1,
              total_points: newLoyalty.total_points_earned || 0,
              available_points: newLoyalty.available_points || 0,
              cashback_rate: newLoyalty.cashback_rate || 0.01,
              points_to_next_tier: newLoyalty.points_to_next_tier || 0,
              next_tier_name: newLoyalty.next_tier || 'Silver',
              jackpot_ticket_rate: newLoyalty.jackpot_ticket_rate || 1
            })
          } else if (payload.eventType === 'DELETE') {
            setLoyalty(null)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_bonuses',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<BonusTableRow>) => {
          if (payload.eventType === 'INSERT') {
            setBonuses(prev => [...prev, payload.new as unknown as PlayerBonus])
          } else if (payload.eventType === 'UPDATE') {
            setBonuses(prev => {
              return prev.map(b =>
                b.id === (payload.new as unknown as PlayerBonus).id
                  ? payload.new as unknown as PlayerBonus
                  : b
              )
            })
          } else if (payload.eventType === 'DELETE') {
            setBonuses(prev => prev.filter(b => b.id !== (payload.old as unknown as PlayerBonus).id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jackpot_tickets',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Update tickets directly from payload
          if (payload.eventType === 'INSERT') {
            const newTicket = payload.new as JackpotTicket
            setTickets(prev => [...prev, newTicket])
            setTicketCount(prev => {
              const newCount = prev + 1
              // Recalculate odds locally (this is an approximation)
              // For more accurate odds, we'd need total pool tickets count
              // But this provides immediate feedback without API call
              // Assuming average pool has ~1000 tickets (can be adjusted based on actual data)
              const estimatedPoolSize = 1000
              setTicketOdds((newCount / estimatedPoolSize) * 100)
              return newCount
            })
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, getSupabase])

  // Fetch data when user changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // CRITICAL FIX: Wait for auth to initialize before fetching player data
    // This prevents race conditions where we fetch with null userId
    if (!isInitialized) {
      return
    }

    if (userId) {
      // User is authenticated - fetch their data
      fetchInitialData()
    } else {
      // No user - clear all state
      setBalances([])
      setLoyalty(null)
      setBonuses([])
      setTickets([])
      setTicketCount(0)
      setTicketOdds(0)
      setError(null)

      // SECURITY FIX: Clear localStorage on logout to prevent data exposure
      try {
        localStorage.removeItem('mypokies_player_state')
      } catch (error) {
        // Ignore localStorage errors
        logError('Error clearing player state from localStorage', {
          context: 'PlayerProvider',
          data: error
        })
      }
    }
  }, [userId, isInitialized, fetchInitialData])

  const value = useMemo(() => ({
    balances,
    loyalty,
    bonuses,
    tickets,
    ticketCount,
    ticketOdds,
    isLoading,
    error,
    refreshData: fetchInitialData
  }), [
    balances,
    loyalty,
    bonuses,
    tickets,
    ticketCount,
    ticketOdds,
    isLoading,
    error,
    fetchInitialData
  ])

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}

// Export specific hooks for backwards compatibility
export function usePlayerBalance() {
  const { balances, isLoading, error } = usePlayer()
  return { balances, loading: isLoading, error }
}

export function usePlayerLoyalty() {
  const { loyalty, isLoading, error } = usePlayer()
  return { loyalty, loading: isLoading, error }
}

export function usePlayerBonuses() {
  const { bonuses, isLoading, error } = usePlayer()
  return { bonuses, loading: isLoading, error }
}

export function usePlayerTickets() {
  const { tickets, ticketCount, ticketOdds, isLoading, error } = usePlayer()
  return { tickets, ticketCount, ticketOdds, loading: isLoading, error }
}