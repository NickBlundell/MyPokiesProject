import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client for browser/React components in the casino app.
 *
 * Use in:
 * - Client Components (with 'use client' directive)
 * - Player authentication
 * - Real-time subscriptions (balance, jackpot, loyalty updates)
 * - Client-side queries
 *
 * Features:
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

let browserClient: SupabaseClient | undefined;

export function createClient() {
  // PERFORMANCE FIX: Use singleton pattern to avoid creating multiple instances
  // This prevents connection exhaustion and WebSocket duplication
  if (typeof window === 'undefined') {
    throw new Error('createClient can only be called in browser context');
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'supabase.auth.token',
        flowType: 'pkce',
      },
      realtime: {
        timeout: 10000, // 10 second timeout for realtime connections
        params: {
          eventsPerSecond: 10, // Optimized for real-time balance/jackpot updates
        },
      },
      global: {
        headers: {
          'x-client-info': 'mypokies-casino',
        },
        fetch: (url, options = {}) => {
          // Add 10 second timeout to all requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));
        },
      },
    }
  );

  return browserClient;
}

// Export function to reset singleton (useful for testing or logout)
export function resetBrowserClient() {
  browserClient = undefined;
}
