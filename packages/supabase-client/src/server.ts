import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Configuration options for server Supabase client
 */
export interface ServerClientConfig {
  /**
   * Identifier for the client (e.g., 'mypokies-casino-server', 'mypokies-admin-server')
   */
  clientInfo: string

  /**
   * Next.js cookies() store
   * Must be awaited before passing: const cookieStore = await cookies()
   */
  cookies: {
    getAll(): { name: string; value: string }[]
    get(name: string): { value: string } | undefined
    set(cookie: { name: string; value: string; [key: string]: any }): void
  }

  /**
   * Timeout for requests in milliseconds
   * @default 10000
   */
  timeout?: number

  /**
   * Database schema
   * @default 'public'
   */
  schema?: string
}

/**
 * Creates a server-side Supabase client for authenticated user operations
 * Respects Row Level Security (RLS) policies
 *
 * Features:
 * - Automatic cookie-based session management
 * - Request timeout configuration
 * - CSRF protection with SameSite cookies
 * - HTTPS-only cookies in production
 *
 * IMPORTANT: Don't store this client in a global variable when using Fluid compute.
 * Always create a new client within each function.
 *
 * @param config - Configuration options for the server client
 * @returns Supabase client instance
 *
 * @example
 * ```typescript
 * import { cookies } from 'next/headers'
 * import { createServerClient } from '@mypokies/supabase-client/server'
 *
 * const cookieStore = await cookies()
 * const supabase = createServerClient({
 *   clientInfo: 'mypokies-casino-server',
 *   cookies: cookieStore
 * })
 * ```
 */
export function createServerClient(config: ServerClientConfig): SupabaseClient {
  // Validate environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // Default configuration
  const timeout = config.timeout ?? 10000
  const schema = config.schema ?? 'public'

  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return config.cookies.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // SECURITY: Use secure cookie settings
            const secureOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production', // HTTPS only in production
              sameSite: 'lax' as const, // CSRF protection
            }
            config.cookies.set({ name, value, ...secureOptions })
          })
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
    global: {
      headers: {
        'x-client-info': config.clientInfo,
      },
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        // Add timeout to all server requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        return fetch(input, {
          ...init,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
      },
    },
    db: {
      schema,
    },
  }) as SupabaseClient
}

/**
 * Service role client configuration
 */
export interface ServiceClientConfig {
  /**
   * Identifier for the client (e.g., 'mypokies-casino-service', 'mypokies-admin-service')
   */
  clientInfo: string

  /**
   * Timeout for requests in milliseconds
   * @default 10000
   */
  timeout?: number

  /**
   * Database schema
   * @default 'public'
   */
  schema?: string
}

/**
 * Creates a service role client for server-side operations that bypass RLS
 *
 * ⚠️ WARNING: This client has FULL database access!
 * - Bypasses all Row Level Security policies
 * - Only use in API routes and server components
 * - NEVER expose to client-side code
 *
 * Use cases:
 * - System-level operations (jackpot draws, scheduled tasks)
 * - Cross-player aggregations
 * - Admin operations requiring full access
 * - Operations requiring service role permissions
 *
 * @param config - Configuration options for the service client
 * @returns Supabase client instance with service role access
 *
 * @example
 * ```typescript
 * // In an API route or server component
 * const supabase = await createServiceRoleClient({
 *   clientInfo: 'mypokies-casino-service'
 * })
 *
 * // Full database access
 * const { data } = await supabase.from('users').select('*')
 * ```
 */
export async function createServiceRoleClient(
  config: ServiceClientConfig
): Promise<SupabaseClient> {
  // SECURITY: Runtime check to prevent client-side usage
  // Check for browser global instead of window
  if (typeof globalThis.window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: createServiceRoleClient() called on client-side! ' +
        'Service role key would be exposed. Use createServerClient() instead.'
    )
  }

  // Validate environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL'
    )
  }

  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is not set. ' +
        'This is required for service role operations.'
    )
  }

  // Dynamic import to ensure server-only
  const { createClient } = await import('@supabase/supabase-js')

  // Default configuration
  const timeout = config.timeout ?? 10000

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': config.clientInfo,
      },
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        // Add timeout to service role requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        return fetch(input, {
          ...init,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
      },
    },
    db: {
      schema: config.schema ?? 'public',
    },
  }) as SupabaseClient
}
