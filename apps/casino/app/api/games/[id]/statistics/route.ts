import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'

// GET /api/games/[id]/statistics - Get game statistics with recent big wins
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return apiGet(async (req, { supabase }) => {
    // Fetch game statistics
    const { data: statistics, error: statsError } = await supabase
      .from('game_statistics')
      .select('*')
      .eq('game_id', id)
      .single()

    if (statsError) {
      if (statsError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Game statistics not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch statistics', details: statsError.message },
        { status: 500 }
      )
    }

    // Fetch recent big wins for this game
    const { data: recentWins } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        created_at,
        user_id,
        game_rounds!inner(game_id)
      `)
      .eq('game_rounds.game_id', id)
      .eq('type', 'credit')
      .gte('amount', 100) // Only significant wins
      .order('amount', { ascending: false })
      .limit(10)

    return NextResponse.json({
      ...statistics,
      recent_big_wins: recentWins || []
    })
  }, { requireAuth: false })(request)
}
