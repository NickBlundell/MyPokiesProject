import { createServerClient as createSharedServerClient, createServiceRoleClient as createSharedServiceClient } from '@mypokies/supabase-client'
import { cookies } from 'next/headers'

/**
 * Standard Supabase client for authenticated user operations.
 * Respects Row Level Security (RLS) policies.
 *
 * This is a thin wrapper around the shared @mypokies/supabase-client package
 * configured specifically for the casino app.
 *
 * IMPORTANT: Don't put this client in a global variable when using Fluid compute.
 * Always create a new client within each function.
 *
 * Features (from @mypokies/supabase-client):
 * - Automatic cookie-based session management
 * - 10s timeout configuration
 * - CSRF protection with SameSite cookies
 * - HTTPS-only cookies in production
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createSharedServerClient({
    clientInfo: 'mypokies-casino-server',
    cookies: cookieStore,
    timeout: 10000,
    schema: 'public',
  })
}

/**
 * Service role client for server-side operations that need to bypass RLS.
 *
 * This is a thin wrapper around the shared @mypokies/supabase-client package
 * configured specifically for the casino app.
 *
 * ⚠️ WARNING: This client has full database access!
 * - Only use in API routes and server components
 * - NEVER expose to client-side code
 * - Use for: admin operations, system tasks, cross-user queries
 *
 * Use cases:
 * - System-level operations (jackpot draws, scheduled tasks)
 * - Cross-player aggregations
 * - Operations requiring service role permissions
 *
 * Features (from @mypokies/supabase-client):
 * - 10s timeout configuration
 * - Runtime check to prevent client-side usage
 */
export async function createServiceClient() {
  return createSharedServiceClient({
    clientInfo: 'mypokies-casino-service',
    timeout: 10000,
    schema: 'public',
  })
}
