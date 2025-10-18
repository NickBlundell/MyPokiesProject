import { createServerClient as createSharedServerClient, createServiceRoleClient as createSharedServiceClient } from '@mypokies/supabase-client'
import { cookies } from 'next/headers'

/**
 * Standard Supabase client for authenticated admin user operations.
 * Respects Row Level Security (RLS) policies.
 *
 * This is a thin wrapper around the shared @mypokies/supabase-client package
 * configured specifically for the admin app.
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

  return createSharedServerClient({
    clientInfo: 'mypokies-admin-server',
    cookies: cookieStore,
    timeout: 10000,
    schema: 'public',
  })
}

/**
 * Admin service role client that bypasses RLS for full database access.
 *
 * This is a thin wrapper around the shared @mypokies/supabase-client package
 * configured specifically for the admin app.
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
  return createSharedServiceClient({
    clientInfo: 'mypokies-admin-service',
    timeout: 10000,
    schema: 'public',
  })
}

/**
 * Alias for createAdminClient() - use whichever name makes more sense in context.
 * Admin app: createAdminClient()
 * Casino app: createServiceClient()
 */
export const createServiceClient = createAdminClient
