import { createBrowserClient } from '@supabase/ssr'

/**
 * Client-side Supabase client for browser/React components.
 *
 * Use in:
 * - Client Components (with 'use client' directive)
 * - Browser-side authentication
 * - Real-time subscriptions
 * - Client-side queries
 *
 * Features:
 * - Automatic session management
 * - Token refresh
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
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.admin.auth.token',
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-client-info': 'mypokies-admin',
        },
      },
    }
  )
}