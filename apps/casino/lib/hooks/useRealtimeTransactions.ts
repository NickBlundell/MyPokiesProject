'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import type { Transaction } from '@/types/player'
import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { logDebug, logError, logInfo } from '@/lib/utils/client-logger'

interface TransactionTableRow {
  id?: string
  [key: string]: unknown
}

interface UseRealtimeTransactionsOptions {
  limit?: number
}

/**
 * Real-time hook for player transactions
 * Note: Uses my_recent_transactions view for optimized queries
 * Only subscribes to INSERT events (transactions are immutable)
 *
 * @param options Configuration options
 * @returns Transactions array that updates in real-time
 */
export function useRealtimeTransactions(options: UseRealtimeTransactionsOptions = {}) {
  const { limit = 50 } = options
  const { userId } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial transactions
  const fetchTransactions = useCallback(async () => {
    if (!userId) return

    const supabase = createClient()
    const { data: initialTransactions, error: fetchError } = await supabase
      .from('my_recent_transactions')
      .select('*')
      .limit(limit)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setTransactions(initialTransactions || [])
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
        // Fetch initial transactions
        await fetchTransactions()
        setLoading(false)

        // Set up real-time subscription for new transactions only (INSERT)
        channel = supabase
          .channel('transaction-updates')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`
          }, async (payload: RealtimePostgresChangesPayload<TransactionTableRow>) => {
            logDebug('New transaction received', { context: 'useRealtimeTransactions', data: payload })

            // Fetch the complete transaction with game details from view
            const newRow = payload.new as TransactionTableRow
            const { data: newTx } = await supabase
              .from('my_recent_transactions')
              .select('*')
              .eq('id', newRow.id)
              .single()

            if (newTx) {
              setTransactions((prev) => {
                // Add new transaction at the beginning
                const updated = [newTx, ...prev]
                // Keep only the most recent transactions up to limit
                return updated.slice(0, limit)
              })
            }
          })
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Transaction subscription status', { context: 'useRealtimeTransactions', data: { status } })
          })
      } catch (err) {
        logError('Error setting up realtime subscription', { context: 'useRealtimeTransactions', data: err })
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
  }, [userId, limit, fetchTransactions])

  return { transactions, loading, error }
}
