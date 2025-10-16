import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

// GET /api/games/[id]/statistics - Get game statistics with recent big wins
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
}
