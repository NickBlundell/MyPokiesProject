import { NextResponse } from 'next/server'
import type { PlayerTierInfo } from '@/types/loyalty'
import { withCacheHeaders } from '@/lib/api/cache-headers'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/loyalty/status
 * Returns the authenticated player's loyalty tier and points
 */
export const GET = apiGet(async (request, { supabase, userId }) => {
  // Get tier info using helper function
  const { data: tierInfo, error } = await supabase
    .rpc('get_player_tier_info', { p_user_id: userId })
    .single()

  if (error) {
    console.error('Error fetching tier info', { userId, error: error.message })
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
})
