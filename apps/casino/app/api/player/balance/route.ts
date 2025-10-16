import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCasinoUser } from '@/lib/api/get-casino-user'

/**
 * GET /api/player/balance
 * Returns the authenticated player's balances for all currencies
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

    // Get balances
    const { data: balances, error } = await supabase
      .from('user_balances')
      .select('currency, balance, updated_at')
      .eq('user_id', result.userId)

    if (error) {
      console.error('Error fetching balances', { userId: result.userId, error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch balances' },
        { status: 500 }
      )
    }

    return NextResponse.json({ balances: balances || [] })

  } catch (error) {
    console.error('Error in /api/player/balance', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
