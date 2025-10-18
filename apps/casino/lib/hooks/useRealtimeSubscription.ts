'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { logDebug, logError, logInfo } from '@mypokies/monitoring/client'

interface UseRealtimeSubscriptionConfig<T, TRow extends { [key: string]: any } = any> {
  /** Table name to subscribe to */
  table: string
  /** Channel name (must be unique) */
  channelName: string
  /** Initial data fetch query configuration */
  initialFetch: {
    select: string
    filter?: (query: any) => any
  }
  /** Real-time filter (e.g., 'user_id=eq.{userId}') */
  realtimeFilter: (userId: string) => string
  /** Transform row data to desired type */
  transformRow: (row: TRow) => T
  /** Handle INSERT event */
  onInsert: (item: T, prev: T[]) => T[]
  /** Handle UPDATE event */
  onUpdate: (item: T, prev: T[]) => T[]
  /** Handle DELETE event */
  onDelete: (item: TRow, prev: T[]) => T[]
  /** Context name for logging */
  contextName: string
}

interface UseRealtimeSubscriptionResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic realtime subscription hook
 * Consolidates the duplicate auth/subscription logic from all useRealtime* hooks
 *
 * @param config - Configuration object
 * @returns Data array, loading state, error, and refetch function
 */
export function useRealtimeSubscription<T, TRow extends { [key: string]: any } = any>(
  config: UseRealtimeSubscriptionConfig<T, TRow>
): UseRealtimeSubscriptionResult<T> {
  const { userId } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      let query = supabase
        .from(config.table)
        .select(config.initialFetch.select)

      // Apply filter if provided
      if (config.initialFetch.filter) {
        query = config.initialFetch.filter(query)
      }

      const { data: initialData, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const transformedData = ((initialData as unknown as TRow[]) || []).map(config.transformRow)
      setData(transformedData)
      setError(null)
      setLoading(false)
    } catch (err) {
      logError('Error fetching initial data', { context: config.contextName, data: err })
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }, [userId, config])

  useEffect(() => {
    if (!userId) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    // Store userId in const to ensure type safety
    const currentUserId = userId
    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    async function setupRealtimeSubscription() {
      try {
        // Fetch initial data
        await fetchData()

        // Set up real-time subscription
        const filter = config.realtimeFilter(currentUserId)

        channel = supabase
          .channel(config.channelName)
          .on(
            'postgres_changes' as any,
            {
              event: '*',
              schema: 'public',
              table: config.table,
              filter
            },
            (payload: RealtimePostgresChangesPayload<TRow>) => {
              logDebug('Realtime update received', { context: config.contextName, data: payload })

              if (payload.eventType === 'INSERT') {
                const newItem = config.transformRow(payload.new as TRow)
                setData((prev) => config.onInsert(newItem, prev))
              } else if (payload.eventType === 'UPDATE') {
                const updatedItem = config.transformRow(payload.new as TRow)
                setData((prev) => config.onUpdate(updatedItem, prev))
              } else if (payload.eventType === 'DELETE') {
                setData((prev) => config.onDelete(payload.old as TRow, prev))
              }
            }
          )
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
            logInfo('Subscription status', { context: config.contextName, data: { status } })
          })

      } catch (err) {
        logError('Error setting up realtime subscription', { context: config.contextName, data: err })
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setupRealtimeSubscription()

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, config, fetchData])

  return { data, loading, error, refetch: fetchData }
}
