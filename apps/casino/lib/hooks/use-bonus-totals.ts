import { useMemo } from 'react'
import { usePlayerBonuses } from '@/lib/contexts/player-context'

/**
 * PERFORMANCE FIX: Shared hook for bonus calculations
 *
 * Previously duplicated in stake-header.tsx and stake-sidebar.tsx
 * Now centralized to:
 * - Eliminate code duplication
 * - Ensure consistency
 * - Single source of truth for bonus calculations
 * - Memoized calculations prevent recalculation on every render
 */

export interface BonusTotals {
  totalBonusBalance: number
  totalWageringRequired: number
  totalWageringCompleted: number
}

export function useBonusTotals(): BonusTotals {
  const { bonuses } = usePlayerBonuses()

  // Memoize bonus calculations to prevent recalculation on every render
  const totals = useMemo(() => {
    const totalBonusBalance = bonuses.reduce(
      (total, bonus) => total + (bonus.bonus_amount || 0),
      0
    )

    const totalWageringRequired = bonuses.reduce(
      (total, bonus) =>
        bonus.status === 'active' ? total + (bonus.wagering_requirement_total || 0) : total,
      0
    )

    const totalWageringCompleted = bonuses.reduce(
      (total, bonus) =>
        bonus.status === 'active' ? total + (bonus.wagering_completed || 0) : total,
      0
    )

    return {
      totalBonusBalance,
      totalWageringRequired,
      totalWageringCompleted,
    }
  }, [bonuses])

  return totals
}
