import { createBrowserClient, resetBrowserClient } from '@mypokies/supabase-client'

/**
 * Client-side Supabase client for browser/React components in the admin app.
 *
 * This is a thin wrapper around the shared @mypokies/supabase-client package
 * configured specifically for the admin app.
 *
 * Use in:
 * - Client Components (with 'use client' directive)
 * - Admin user authentication
 * - Real-time subscriptions
 * - Client-side queries
 *
 * Features (from @mypokies/supabase-client):
 * - Singleton pattern for performance
 * - Automatic session management
 * - Token refresh with 10s timeout
 * - LocalStorage persistence
 *
 * Pattern:
 * ```typescript
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * const supabase = createClient()
 * const { data } = await supabase.from('table').select()
 * ```
 */
export function createClient() {
  return createBrowserClient({
    clientInfo: 'mypokies-admin',
    storageKey: 'supabase.admin.auth.token',
    enableRealtime: false, // Admin doesn't need real-time by default
    timeout: 10000,
  })
}

// Export function to reset singleton (useful for testing or logout)
export { resetBrowserClient }
