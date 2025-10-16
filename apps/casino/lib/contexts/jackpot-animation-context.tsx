'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { JackpotPool } from '@/types/jackpot'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { logError } from '@/lib/utils/client-logger'

interface JackpotTableRow {
  [key: string]: unknown
}

interface JackpotAnimationContextType {
  animatedAmount: number
  currentJackpot: JackpotPool | null
  isLoading: boolean
}

const JackpotAnimationContext = createContext<JackpotAnimationContextType | undefined>(undefined)

export function JackpotAnimationProvider({ children }: { children: ReactNode }) {
  const [currentJackpot, setCurrentJackpot] = useState<JackpotPool | null>(null)
  const [animatedAmount, setAnimatedAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial jackpot data
    const fetchJackpot = async () => {
      try {
        const { data, error } = await supabase
          .from('jackpot_pools')
          .select('*')
          .eq('status', 'active')
          .single()

        if (error) {
          logError('Error fetching jackpot', {
            context: 'JackpotAnimationProvider',
            data: error
          })
          return
        }

        if (data) {
          setCurrentJackpot(data)
          setAnimatedAmount(data.current_amount)
        }
      } catch (err) {
        logError('Failed to fetch jackpot', {
          context: 'JackpotAnimationProvider',
          data: err
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchJackpot()

    // Subscribe to real-time jackpot updates
    const channel = supabase
      .channel('jackpot-animation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jackpot_pools',
          filter: 'status=eq.active'
        },
        (payload: RealtimePostgresChangesPayload<JackpotTableRow>) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as unknown as JackpotPool
            setCurrentJackpot(newData)

            // Cancel any existing animation to prevent interval stacking
            if (animationIntervalRef.current) {
              clearInterval(animationIntervalRef.current)
              animationIntervalRef.current = null
            }

            // Smoothly animate to new amount
            const targetAmount = newData.current_amount
            setAnimatedAmount(prevAmount => {
              // Capture the starting amount outside the interval
              const startAmount = prevAmount
              const difference = targetAmount - startAmount
              const duration = 1000 // 1 second animation
              const steps = 30
              const stepDuration = duration / steps
              const stepIncrement = difference / steps

              let currentStep = 0
              const animationInterval = setInterval(() => {
                currentStep++
                if (currentStep >= steps) {
                  setAnimatedAmount(targetAmount)
                  clearInterval(animationInterval)
                  animationIntervalRef.current = null
                } else {
                  setAnimatedAmount(prev => prev + stepIncrement)
                }
              }, stepDuration)

              // Store interval reference for cleanup
              animationIntervalRef.current = animationInterval

              return prevAmount
            })
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
      // Clean up any running animation interval
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
      }
    }
  }, []) // Only run once on mount

  const value = useMemo(() => ({
    animatedAmount,
    currentJackpot,
    isLoading
  }), [animatedAmount, currentJackpot, isLoading])

  return (
    <JackpotAnimationContext.Provider value={value}>
      {children}
    </JackpotAnimationContext.Provider>
  )
}

export function useJackpotAnimation() {
  const context = useContext(JackpotAnimationContext)
  if (context === undefined) {
    throw new Error('useJackpotAnimation must be used within JackpotAnimationProvider')
  }
  return context
}