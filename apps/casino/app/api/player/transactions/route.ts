import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/player/transactions?limit=50&offset=0
 * Returns the authenticated player's transaction history
 */
export const GET = apiGet(async (request, { supabase, userId }) => {
  const { searchParams } = new URL(request.url)

  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get transactions from view
  const { data: transactions, error, count } = await supabase
    .from('my_recent_transactions')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching transactions', { userId, limit, offset, error: error.message })
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
})
