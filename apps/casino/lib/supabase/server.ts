import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Standard Supabase client for authenticated user operations.
 * Respects Row Level Security (RLS) policies.
 *
 * IMPORTANT: Don't put this client in a global variable when using Fluid compute.
 * Always create a new client within each function.
 *
 * PERFORMANCE FIX: Added 10s timeout and retry configuration
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // SECURITY FIX: Use Supabase's default cookie settings
              // Don't override httpOnly - Supabase sets it appropriately per cookie
              // (refresh tokens are httpOnly, access tokens are not for client-side refresh)
              const secureOptions = {
                ...options,
                // httpOnly is intentionally NOT overridden - let Supabase control this
                secure: process.env.NODE_ENV === 'production', // HTTPS only in production
                sameSite: 'lax' as const, // CSRF protection
              };
              cookieStore.set(name, value, secureOptions);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        headers: {
          'x-client-info': 'mypokies-casino-server',
        },
        fetch: (url, options = {}) => {
          // Add 10 second timeout to all server requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));
        },
      },
      db: {
        schema: 'public',
      },
    },
  );
}

/**
 * Service role client for server-side operations that need to bypass RLS.
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
 * PERFORMANCE FIX: Added 10s timeout configuration
 * SECURITY FIX: Runtime check to prevent client-side usage
 */
export async function createServiceClient() {
  // SECURITY: Runtime check to prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: createServiceClient() called on client-side! ' +
      'Service role key would be exposed. Use createClient() instead.'
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is not set. ' +
      'This is required for service role operations.'
    );
  }

  const { createClient } = await import('@supabase/supabase-js');

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'x-client-info': 'mypokies-casino-service',
        },
        fetch: (url, options = {}) => {
          // Add 10 second timeout to service role requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));
        },
      },
      db: {
        schema: 'public',
      },
    }
  );
}
