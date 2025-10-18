import { NextResponse } from 'next/server'
import type { MyJackpotTickets } from '@/types/jackpot'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/jackpot/my-tickets
 * Returns the authenticated player's ticket count and odds
 */
export const GET = apiGet(async (request, { supabase, userId }) => {
  // Get ticket info
  const { data, error } = await supabase
    .rpc('get_my_jackpot_tickets', { p_user_id: userId })
    .single()

  if (error) {
    console.error('Error fetching tickets', { userId, error: error.message })
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }

  return NextResponse.json({ tickets: data as MyJackpotTickets })
})
