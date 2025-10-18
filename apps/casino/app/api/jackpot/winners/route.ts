import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/jackpot/winners?limit=50
 * Returns recent jackpot winners (public)
 */
export const GET = apiGet(async (request, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')

  const { data: winners, error } = await supabase
    .from('jackpot_winners')
    .select(`
      *,
      user:users(external_user_id),
      draw:jackpot_draws(draw_number, drawn_at, total_pool_amount)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching winners', { error: error.message, limit })
    return NextResponse.json({ error: 'Failed to fetch winners' }, { status: 500 })
  }

  const response = NextResponse.json({ winners })

  // Cache winners list for 5 minutes (public data)
  response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600')

  return response
}, { requireAuth: false })
