import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/player/transactions?limit=50&offset=0
 * Returns the authenticated player's transaction history
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

    // Get transactions from view
    const { data: transactions, error, count } = await supabase
      .from('my_recent_transactions')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching transactions', { userId: user.id, limit, offset, error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      transactions: transactions || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error in /api/player/transactions', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
