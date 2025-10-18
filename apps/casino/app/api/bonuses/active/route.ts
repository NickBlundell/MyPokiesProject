import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/bonuses/active
 * Returns the player's active bonuses
 */
export const GET = apiGet(async (request, { supabase, userId }) => {
  // Get active bonuses
  const { data: activeBonuses, error } = await supabase
    .from('player_bonuses')
    .select('*, bonus_offer:bonus_offers(*)')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching active bonuses', { userId, error: error.message })
    return NextResponse.json({ error: 'Failed to fetch bonuses' }, { status: 500 })
  }

  return NextResponse.json({ active_bonuses: activeBonuses })
})
