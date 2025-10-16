'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

/**
 * Auth Context - Central source of truth for authentication state
 *
 * PERFORMANCE FIX: Eliminates duplicate auth lookups across the app
 * - Single auth check on mount
 * - Single user.id → casino user.id lookup
 * - Cached values used by all components
 * - Listens to auth state changes
 * - Memoized context value to prevent unnecessary re-renders
 */

interface AuthContextValue {
  // Supabase auth user
  user: User | null
  // Casino database user ID
  userId: string | null
  // Loading states
  isLoading: boolean
  isInitialized: boolean
  // Error state
  error: string | null
  // Refresh function
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userId: null,
  isLoading: true,
  isInitialized: false,
  error: null,
  refresh: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        // "Auth session missing!" is normal for anonymous users - not an error
        if (authError.message !== 'Auth session missing!') {
          console.error('[AuthContext] Auth error:', authError.message)
          setError(authError.message)
        }
        setUser(null)
        setUserId(null)
        return
      }

      if (!authUser) {
        // Not logged in - this is fine for anonymous users
        setUser(null)
        setUserId(null)
        return
      }

      setUser(authUser)

      // Get casino user ID from database
      const { data: casinoUser, error: dbError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (dbError) {
        console.error('[AuthContext] Database error:', dbError.message)
        setError(dbError.message)
        setUserId(null)
        return
      }

      if (!casinoUser) {
        console.warn('[AuthContext] No casino user found for auth user:', authUser.id)
        setUserId(null)
        return
      }

      setUserId(casinoUser.id)
      console.log('[AuthContext] Auth loaded:', { authUserId: authUser.id, casinoUserId: casinoUser.id })

    } catch (err) {
      console.error('[AuthContext] Unexpected error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setUser(null)
      setUserId(null)
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [])

  // Load auth on mount
  useEffect(() => {
    loadAuth()
  }, [loadAuth])

  // Listen to auth state changes
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[AuthContext] Auth state changed:', event)

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Reload auth data
          await loadAuth()
        } else if (event === 'SIGNED_OUT') {
          // Clear auth data
          setUser(null)
          setUserId(null)
          setError(null)
        } else if (event === 'USER_UPDATED') {
          // Update user object
          if (session?.user) {
            setUser(session.user)
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [loadAuth])

  // PERFORMANCE FIX: Memoize context value to prevent unnecessary re-renders
  // Only recreate when actual values change
  const value: AuthContextValue = useMemo(() => ({
    user,
    userId,
    isLoading,
    isInitialized,
    error,
    refresh: loadAuth,
  }), [user, userId, isLoading, isInitialized, error, loadAuth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Convenience hooks for common use cases
export function useUser() {
  const { user } = useAuth()
  return user
}

export function useUserId() {
  const { userId } = useAuth()
  return userId
}

export function useIsAuthenticated() {
  const { user, isInitialized } = useAuth()
  return { isAuthenticated: !!user, isInitialized }
}
