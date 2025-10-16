import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCasinoUser } from '@/lib/api/get-casino-user'

/**
 * GET /api/bonuses/active
 * Returns the player's active bonuses
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

    // Get active bonuses
    const { data: activeBonuses, error } = await supabase
      .from('player_bonuses')
      .select('*, bonus_offer:bonus_offers(*)')
      .eq('user_id', result.userId)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching active bonuses', { userId: result.userId, error: error.message })
      return NextResponse.json({ error: 'Failed to fetch bonuses' }, { status: 500 })
    }

    return NextResponse.json({ active_bonuses: activeBonuses })

  } catch (error) {
    console.error('Error in /api/bonuses/active', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
