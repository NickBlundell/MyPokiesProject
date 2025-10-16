import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

// DELETE /api/games/favorites/[id] - Remove game from favorites
export async function DELETE(
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
  const { id: game_id } = await params

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Delete favorite
  const { error } = await supabase
    .from('player_favorite_games')
    .delete()
    .eq('user_id', user.id)
    .eq('game_id', game_id)

  if (error) {
    return NextResponse.json(
      { error: 'Failed to remove favorite', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
