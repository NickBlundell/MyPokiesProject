import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/player/game-history?limit=50&offset=0
 * Returns the authenticated player's game round history
 */
export const GET = apiGet(async (request, { supabase, userId }) => {
  const { searchParams } = new URL(request.url)

  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get user's casino account
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
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
})
