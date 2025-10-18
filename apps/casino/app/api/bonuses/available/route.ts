import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'
import { withCacheHeaders, CACHE_STRATEGIES } from '@/lib/api/cache-headers'

/**
 * GET /api/bonuses/available
 * Returns available bonus offers for the player
 */
export const GET = apiGet(async (request, { supabase, userId }) => {
  // Get all active bonuses
  const { data: allBonuses, error } = await supabase
    .from('active_bonus_offers')
    .select('*')

  if (error) {
    console.error('Error fetching bonuses', { userId, error: error.message })
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
})
