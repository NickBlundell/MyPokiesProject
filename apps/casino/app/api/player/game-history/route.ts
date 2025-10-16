import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/player/game-history?limit=50&offset=0
 * Returns the authenticated player's game round history
 */
export async function GET(request: Request) {
  try {
    // Rate limiting - standard (10 requests per 10 seconds)
    const { success, limit: rateLimitLimit, remaining, reset } = await checkRateLimit(request)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitLimit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's casino account
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'No casino account linked' },
        { status: 404 }
      )
    }

    // Get game rounds with their actions
    const { data: rounds, error, count } = await supabase
      .from('game_rounds')
      .select(`
        id,
        game_round_id,
        game_desc,
        currency,
        total_bet,
        total_win,
        status,
        started_at,
        completed_at,
        round_actions(
          action_id,
          game_id,
          action_type,
          amount,
          timestamp
        )
      `, { count: 'exact' })
      .eq('user_id', userData.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching game history', { userId: userData.id, limit, offset, error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch game history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      rounds: rounds || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error in /api/player/game-history', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
