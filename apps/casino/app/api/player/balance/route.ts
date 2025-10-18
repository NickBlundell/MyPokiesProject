import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/player/balance
 * Returns the authenticated player's balances for all currencies
 */
export const GET = apiGet(async (request, { supabase, userId }) => {
  // Get balances
  const { data: balances, error } = await supabase
    .from('user_balances')
    .select('currency, balance, updated_at')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching balances', { userId, error: error.message })
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    )
  }

  return NextResponse.json({ balances: balances || [] })
})
