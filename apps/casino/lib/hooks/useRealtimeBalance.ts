'use client'

import { useMemo } from 'react'
import type { Balance } from '@/types/player'
import { useRealtimeSubscription } from './useRealtimeSubscription'

interface BalanceTableRow {
  currency: string
  balance: number
  updated_at: string
  [key: string]: unknown
}

/**
 * Real-time hook for player balances
 * Automatically subscribes to balance changes and updates state
 *
 * @returns Array of balances that updates in real-time
 */
export function useRealtimeBalance() {
  const config = useMemo(() => ({
    table: 'user_balances',
    channelName: 'balance-updates',
    initialFetch: {
      select: 'currency, balance, updated_at',
      filter: (query: any) => query
    },
    realtimeFilter: (userId: string) => `user_id=eq.${userId}`,
    transformRow: (row: BalanceTableRow): Balance => ({
      currency: row.currency,
      balance: row.balance,
      updated_at: row.updated_at
    }),
    onInsert: (item: Balance, prev: Balance[]) => [...prev, item],
    onUpdate: (item: Balance, prev: Balance[]) =>
      prev.map((b) => b.currency === item.currency ? item : b),
    onDelete: (item: BalanceTableRow, prev: Balance[]) =>
      prev.filter((b) => b.currency !== item.currency),
    contextName: 'useRealtimeBalance'
  }), [])

  const { data: balances, loading, error } = useRealtimeSubscription<Balance, BalanceTableRow>(config)

  return { balances, loading, error }
}
