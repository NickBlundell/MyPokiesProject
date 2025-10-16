import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { withCacheHeaders, CACHE_STRATEGIES } from '@/lib/api/cache-headers'

/**
 * GET /api/bonuses/available
 * Returns available bonus offers for the player
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

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active bonuses
    const { data: allBonuses, error } = await supabase
      .from('active_bonus_offers')
      .select('*')

    if (error) {
      console.error('Error fetching bonuses', { userId: user.id, error: error.message })
      return NextResponse.json({ error: 'Failed to fetch bonuses' }, { status: 500 })
    }

    // Filter by current day for daily bonuses
    const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
    const availableToday = allBonuses?.filter(bonus =>
      bonus.day_of_week === null || bonus.day_of_week === today
    )

    // Cache bonus offers for 1 hour since they don't change frequently
    return withCacheHeaders(
      { bonuses: availableToday },
      CACHE_STRATEGIES.BONUS_OFFERS
    )

  } catch (error) {
    console.error('Error in /api/bonuses/available', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
