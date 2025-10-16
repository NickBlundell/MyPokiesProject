import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/jackpot/winners?limit=50
 * Returns recent jackpot winners (public)
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()

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

  } catch (error) {
    console.error('Error in /api/jackpot/winners', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
