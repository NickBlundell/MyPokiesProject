import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'

// GET /api/games/[id] - Get single game details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return apiGet(async (req, { supabase }) => {
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
  }, { requireAuth: false })(request)
}
