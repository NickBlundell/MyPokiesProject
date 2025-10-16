import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

// GET /api/games/[id] - Get single game details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { id } = await params

  // Check if user is authenticated for favorites
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch game with statistics
  const { data: game, error } = await supabase
    .from('games')
    .select('*, statistics:game_statistics(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch game', details: error.message },
      { status: 500 }
    )
  }

  // Check if game is in user's favorites
  let is_favorite = false
  if (user) {
    const { data: favorite } = await supabase
      .from('player_favorite_games')
      .select('id')
      .eq('user_id', user.id)
      .eq('game_id', id)
      .single()

    is_favorite = !!favorite
  }

  return NextResponse.json({
    ...game,
    statistics: game.statistics?.[0] || null,
    is_favorite
  })
}
