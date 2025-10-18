import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { RateLimitType } from '@mypokies/security'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Context passed to API route handlers
 */
export interface ApiContext {
  supabase: SupabaseClient
  user: User
  userId: string
}

/**
 * API route handler with context
 */
export type ApiHandler = (
  request: Request,
  context: ApiContext
) => Promise<Response> | Response

/**
 * Options for API route wrapper
 */
export interface ApiRouteOptions {
  /** Rate limit type (default: 'api') */
  rateLimit?: RateLimitType | false
  /** Require authentication (default: true) */
  requireAuth?: boolean
}

/**
 * Wraps an API route with:
 * - Rate limiting
 * - Authentication checking
 * - Error handling
 * - Consistent response formatting
 *
 * @example
 * ```ts
 * export const GET = apiRoute(async (request, { supabase, user, userId }) => {
 *   const { data } = await supabase
 *     .from('players')
 *     .select('*')
 *     .eq('user_id', userId)
 *     .single()
 *
 *   return NextResponse.json({ player: data })
 * })
 * ```
 */
export function apiRoute(
  handler: ApiHandler,
  options: ApiRouteOptions = {}
): (request: Request) => Promise<Response> {
  const {
    rateLimit = 'api',
    requireAuth = true,
  } = options

  return async (request: Request) => {
    try {
      // Apply rate limiting if enabled
      if (rateLimit !== false) {
        const rateLimitResult = await withRateLimit(
          request,
          async () => {
            // Auth and handler execution happens inside rate limit check
            return executeHandler(request, handler, requireAuth)
          },
          rateLimit
        )
        return rateLimitResult
      }

      // No rate limiting - execute directly
      return executeHandler(request, handler, requireAuth)
    } catch (error) {
      console.error('Unhandled error in API route', {
        url: request.url,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Execute the handler with authentication
 */
async function executeHandler(
  request: Request,
  handler: ApiHandler,
  requireAuth: boolean
): Promise<Response> {
  const supabase = await createClient()

  // Check authentication if required
  if (requireAuth) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Execute handler with context
    return handler(request, {
      supabase,
      user,
      userId: user.id,
    })
  }

  // No auth required - create minimal context
  const context: ApiContext = {
    supabase,
    user: null as any, // Will be null when auth not required
    userId: '',
  }

  return handler(request, context)
}

/**
 * Create a POST API route handler
 */
export function apiPost(
  handler: ApiHandler,
  options: ApiRouteOptions = {}
) {
  return apiRoute(handler, { ...options, rateLimit: options.rateLimit ?? 'strict' })
}

/**
 * Create a GET API route handler
 */
export function apiGet(handler: ApiHandler, options: ApiRouteOptions = {}) {
  return apiRoute(handler, options)
}
