import { NextResponse } from 'next/server'
import { apiRoute } from '@/lib/api/middleware'

// DELETE /api/games/favorites/[id] - Remove game from favorites
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: game_id } = await params

  return apiRoute(async (req, { supabase, userId }) => {
    // Delete favorite
    const { error } = await supabase
      .from('player_favorite_games')
      .delete()
      .eq('user_id', userId)
      .eq('game_id', game_id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to remove favorite', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  }, { rateLimit: 'strict' })(request)
}
