import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { MyJackpotTickets } from '@/types/jackpot'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCasinoUser } from '@/lib/api/get-casino-user'

/**
 * GET /api/jackpot/my-tickets
 * Returns the authenticated player's ticket count and odds
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

    // Get ticket info
    const { data, error } = await supabase
      .rpc('get_my_jackpot_tickets', { p_user_id: result.userId })
      .single()

    if (error) {
      console.error('Error fetching tickets', { userId: result.userId, error: error.message })
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    return NextResponse.json({ tickets: data as MyJackpotTickets })

  } catch (error) {
    console.error('Error in /api/jackpot/my-tickets', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
