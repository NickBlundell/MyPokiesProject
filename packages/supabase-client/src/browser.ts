import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Configuration options for browser Supabase client
 */
export interface BrowserClientConfig {
  /**
   * Identifier for the client (e.g., 'mypokies-casino', 'mypokies-admin')
   */
  clientInfo: string

  /**
   * Storage key for auth tokens
   * @default 'supabase.auth.token'
   */
  storageKey?: string

  /**
   * Enable real-time features with optimized settings
   * @default false
   */
  enableRealtime?: boolean

  /**
   * Timeout for requests in milliseconds
   * @default 10000
   */
  timeout?: number

  /**
   * Events per second for real-time connections
   * @default 10
   */
  eventsPerSecond?: number
}

/**
 * Cache for browser clients (one per configuration)
 */
const browserClients = new Map<string, SupabaseClient>()

/**
 * Creates a browser-side Supabase client with singleton pattern
 *
 * Features:
 * - Singleton pattern (one instance per configuration)
 * - Automatic session management
 * - Token refresh with configurable timeout
 * - LocalStorage persistence
 * - Optional real-time optimizations
 * - Connection pooling via singleton
 *
 * @param config - Configuration options for the client
 * @returns Supabase client instance
 *
 * @example
 * ```typescript
 * // Casino app
 * const supabase = createBrowserClient({
 *   clientInfo: 'mypokies-casino',
 *   enableRealtime: true,
 *   storageKey: 'supabase.auth.token'
 * })
 *
 * // Admin app
 * const supabase = createBrowserClient({
 *   clientInfo: 'mypokies-admin',
 *   storageKey: 'supabase.admin.auth.token'
 * })
 * ```
 */
export function createClient(config: BrowserClientConfig): SupabaseClient {
  // Validate browser context
  if (typeof window === 'undefined') {
    throw new Error('createClient can only be called in browser context')
  }

  // Validate environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // Create cache key from config
  const cacheKey = `${config.clientInfo}-${config.storageKey || 'default'}`

  // Return cached client if exists
  if (browserClients.has(cacheKey)) {
    return browserClients.get(cacheKey)!
  }

  // Default configuration
  const timeout = config.timeout ?? 10000
  const storageKey = config.storageKey ?? 'supabase.auth.token'
  const eventsPerSecond = config.eventsPerSecond ?? 10

  // Create new client
  const client = createBrowserClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey,
      flowType: 'pkce',
    },
    ...(config.enableRealtime && {
      realtime: {
        timeout,
        params: {
          eventsPerSecond,
        },
      },
    }),
    global: {
      headers: {
        'x-client-info': config.clientInfo,
      },
      fetch: (url, options = {}) => {
        // Add timeout to all requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
      },
    },
  })

  // Cache and return
  browserClients.set(cacheKey, client)
  return client
}

/**
 * Resets browser client cache
 * Useful for testing or logout scenarios
 *
 * @param clientInfo - Optional client info to reset specific client, or reset all if not provided
 */
export function resetBrowserClient(clientInfo?: string): void {
  if (clientInfo) {
    // Reset specific clients matching the clientInfo
    const keysToDelete: string[] = []
    browserClients.forEach((_, key) => {
      if (key.startsWith(clientInfo)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach((key) => browserClients.delete(key))
  } else {
    // Reset all clients
    browserClients.clear()
  }
}
