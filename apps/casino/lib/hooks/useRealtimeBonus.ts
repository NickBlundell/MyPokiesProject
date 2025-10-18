'use client'

import { useMemo, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import type { PlayerBonus } from '@/types/bonus'
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { logError, logInfo } from '@mypokies/monitoring/client'

type BonusData = Omit<PlayerBonus, 'bonus_amount' | 'wagering_requirement_total' | 'wagering_completed'> & {
  bonus_amount: number | string
  wagering_requirement_total: number | string
  wagering_completed: number | string
}

/**
 * Real-time hook for player bonuses
 * Note: Uses custom refetch pattern because bonuses need joined bonus_offer data
 *
 * @returns Active bonuses and wagering stats that update in real-time
 */
export function useRealtimeBonus() {
  const { userId } = useAuth()
  const [activeBonuses, setActiveBonuses] = useState<PlayerBonus[]>([])
  const [totalBonusBalance, setTotalBonusBalance] = useState(0)
  const [totalWageringRequired, setTotalWageringRequired] = useState(0)
  const [totalWageringCompleted, setTotalWageringCompleted] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBonuses = useMemo(() => async () => {
    if (!userId) return

    const supabase = createClient()
    const { data: bonusData, error: fetchError } = await supabase
      .from('player_bonuses')
      .select(`*, bonus_offer:bonus_offers(*)`)
      .eq('user_id', userId)
      .in('status', ['active', 'pending'])

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    const bonuses = (bonusData || []) as BonusData[]
    const playerBonuses: PlayerBonus[] = bonuses.map(b => ({
      ...b,
      bonus_amount: Number(b.bonus_amount) || 0,
      wagering_requirement_total: Number(b.wagering_requirement_total) || 0,
      wagering_completed: Number(b.wagering_completed) || 0,
    }))

    setActiveBonuses(playerBonuses)
    setTotalBonusBalance(bonuses.reduce((sum, b) => sum + (Number(b.bonus_amount) || 0), 0))
    setTotalWageringRequired(bonuses.reduce((sum, b) => sum + (Number(b.wagering_requirement_total) || 0), 0))
    setTotalWageringCompleted(bonuses.reduce((sum, b) => sum + (Number(b.wagering_completed) || 0), 0))
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
        await fetchBonuses()
        setLoading(false)

        // Subscribe to bonus changes - refetch on any change to get joined data
        channel = supabase
          .channel('bonus-updates')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'player_bonuses',
            filter: `user_id=eq.${userId}`
          }, fetchBonuses)
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Bonus subscription status', { context: 'useRealtimeBonus', data: { status } })
          })
      } catch (err) {
        logError('Error setting up bonus subscription', { context: 'useRealtimeBonus', data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, fetchBonuses])

  return { activeBonuses, totalBonusBalance, totalWageringRequired, totalWageringCompleted, loading, error }
}
