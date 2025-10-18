import { createBrowserClient, resetBrowserClient } from '@mypokies/supabase-client'

/**
 * Client-side Supabase client for browser/React components in the casino app.
 *
 * This is a thin wrapper around the shared @mypokies/supabase-client package
 * configured specifically for the casino app.
 *
 * Use in:
 * - Client Components (with 'use client' directive)
 * - Player authentication
 * - Real-time subscriptions (balance, jackpot, loyalty updates)
 * - Client-side queries
 *
 * Features (from @mypokies/supabase-client):
 * - Singleton pattern (one instance per page load) - PERFORMANCE FIX
 * - Automatic session management
 * - Token refresh with 10s timeout
 * - LocalStorage persistence
 * - Real-time optimizations (10 events/sec)
 * - Connection pooling via singleton
 *
 * Pattern:
 * ```typescript
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * const supabase = createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 * ```
 */

export function createClient() {
  return createBrowserClient({
    clientInfo: 'mypokies-casino',
    storageKey: 'supabase.auth.token',
    enableRealtime: true,
    timeout: 10000,
    eventsPerSecond: 10,
  })
}

// Export function to reset singleton (useful for testing or logout)
export { resetBrowserClient }
