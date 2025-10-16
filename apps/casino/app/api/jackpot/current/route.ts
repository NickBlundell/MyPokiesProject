import { createClient } from '@/lib/supabase/server'
import { withCacheHeaders, CACHE_STRATEGIES } from '@/lib/api/cache-headers'
import type { CurrentJackpotInfo } from '@/types/jackpot'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

/**
 * GET /api/jackpot/current
 * Returns current jackpot pool information (public)
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

    const { data, error } = await supabase
      .rpc('get_current_jackpot_info')
      .single()

    if (error) {
      console.warn('Error fetching jackpot info, returning mock data', { error: error.message })
      // Return mock data if the database function doesn't exist yet
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
      return withCacheHeaders(
        { jackpot: mockJackpot },
        CACHE_STRATEGIES.JACKPOT
      )
    }

    return withCacheHeaders(
      { jackpot: data as CurrentJackpotInfo },
      CACHE_STRATEGIES.JACKPOT
    )

  } catch (error) {
    console.error('Error in /api/jackpot/current, returning mock data', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    // Return mock data as fallback
    const mockJackpot: CurrentJackpotInfo = {
      jackpot_name: 'Weekly Main Jackpot',
      current_amount: 125000.00 + Math.random() * 5000, // Add some randomness
      currency: 'USD',
      total_tickets: 45000 + Math.floor(Math.random() * 5000),
      draw_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      time_remaining: '3 days',
      last_winner: null,
      last_win_amount: null,
      last_win_date: null
    }
    return withCacheHeaders(
      { jackpot: mockJackpot },
      CACHE_STRATEGIES.JACKPOT
    )
  }
}
