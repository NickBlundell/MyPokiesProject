import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Standard Supabase client for authenticated admin user operations.
 * Respects Row Level Security (RLS) policies.
 *
 * Use this for:
 * - Admin user authentication
 * - Admin-specific data that has RLS policies
 *
 * IMPORTANT: Don't put this client in a global variable when using Fluid compute.
 * Always create a new client within each function.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // This can happen if called from Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // This can happen if called from Server Component
          }
        },
      },
    }
  )
}

/**
 * Admin service role client that bypasses RLS for full database access.
 *
 * ⚠️ WARNING: This client has FULL database access!
 * - Bypasses all Row Level Security policies
 * - Only use in API routes and server components
 * - NEVER expose to client-side code
 *
 * Use this for:
 * - Viewing all player data (admin dashboard)
 * - CRM operations across all users
 * - System-wide analytics and reports
 * - Admin actions that need to modify any user's data
 *
 * Pattern:
 * ```typescript
 * const supabase = await createAdminClient()
 * const { data } = await supabase.from('users').select('*') // All users
 * ```
 */
export async function createAdminClient() {
  const { createClient } = await import('@supabase/supabase-js')

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Alias for createAdminClient() - use whichever name makes more sense in context.
 * Admin app: createAdminClient()
 * Casino app: createServiceClient()
 */
export const createServiceClient = createAdminClient