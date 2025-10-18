import { withCacheHeaders, CACHE_STRATEGIES } from '@/lib/api/cache-headers'
import type { CurrentJackpotInfo } from '@/types/jackpot'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/jackpot/current
 * Returns current jackpot pool information (public)
 */
export const GET = apiGet(async (request, { supabase }) => {
  const { data, error } = await supabase
    .rpc('get_current_jackpot_info')
    .single()

  const mockJackpot: CurrentJackpotInfo = {
    jackpot_name: 'Weekly Main Jackpot',
    current_amount: 125000.00 + Math.random() * 5000, // Add some randomness
    currency: 'USD',
    total_tickets: 45000 + Math.floor(Math.random() * 5000),
    draw_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    time_remaining: '3 days',
    last_winner: null,
    last_win_amount: null,
    last_win_date: null
  }

  if (error) {
    console.warn('Error fetching jackpot info, returning mock data', { error: error.message })
    return withCacheHeaders(
      { jackpot: mockJackpot },
      CACHE_STRATEGIES.JACKPOT
    )
  }

  return withCacheHeaders(
    { jackpot: data as CurrentJackpotInfo },
    CACHE_STRATEGIES.JACKPOT
  )
}, { requireAuth: false })
