import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { PlayerTierInfo } from '@/types/loyalty'
import { checkRateLimit } from '@/lib/rate-limit'
import { withCacheHeaders } from '@/lib/api/cache-headers'
import { getCasinoUser } from '@/lib/api/get-casino-user'

/**
 * GET /api/loyalty/status
 * Returns the authenticated player's loyalty tier and points
 */
export async function GET(request: Request) {
  try {
    // Rate limiting - standard (10 requests per 10 seconds)
    const { success, limit, remaining, reset } = await checkRateLimit(request)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    // PERFORMANCE FIX: Use shared helper to get casino user (eliminates redundant lookups)
    const result = await getCasinoUser()
    if ('error' in result) {
      return result.error
    }

    const supabase = await createClient()

    // Get tier info using helper function
    const { data: tierInfo, error } = await supabase
      .rpc('get_player_tier_info', { p_user_id: result.userId })
      .single()

    if (error) {
      console.error('Error fetching tier info', { userId: result.userId, error: error.message })
      return NextResponse.json({ error: 'Failed to fetch loyalty status' }, { status: 500 })
    }

    // Cache loyalty status for 5 minutes - it doesn't change frequently
    return withCacheHeaders(
      { tier_info: tierInfo as PlayerTierInfo },
      {
        strategy: 'private-cache',
        maxAge: 300, // 5 minutes
        staleWhileRevalidate: 600, // 10 minutes
        tags: ['loyalty-status']
      }
    )

  } catch (error) {
    console.error('Error in /api/loyalty/status', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
