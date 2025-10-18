import { NextResponse } from 'next/server'
import { apiGet } from '@/lib/api/middleware'

/**
 * GET /api/player/data
 *
 * PERFORMANCE OPTIMIZATION: Consolidated endpoint that fetches ALL player data in a single request.
 * Replaces 4 separate API calls (balance, loyalty, bonuses, tickets) with 1 call.
 *
 * Reduces: 4 HTTP round trips + 4 auth checks + 4 user lookups → 1 of each
 * Expected improvement: ~2-3 seconds faster page load
 */
export const GET = apiGet(async (request, { supabase, userId }) => {
  // Fetch all data in parallel (but only 1 HTTP request from client)
  const [
    balanceResponse,
    loyaltyResponse,
    bonusResponse,
    ticketsResponse
  ] = await Promise.all([
    // Get balances
    supabase
      .from('user_balances')
      .select('currency, balance, updated_at')
      .eq('user_id', userId),

    // Get loyalty tier info
    supabase
      .rpc('get_player_tier_info', { p_user_id: userId })
      .single(),

    // Get active bonuses
    supabase
      .from('player_bonuses')
      .select('*, bonus_offer:bonus_offers(*)')
      .eq('user_id', userId)
      .eq('status', 'active'),

    // Get jackpot tickets
    supabase
      .rpc('get_my_jackpot_tickets', { p_user_id: userId })
      .single()
  ])

  // Handle errors gracefully - return partial data if some queries fail
  const response: {
    balances: any[]
    loyalty: any
    bonuses: any[]
    tickets: any[]
    ticketCount: number
    ticketOdds: number
  } = {
    balances: [],
    loyalty: null,
    bonuses: [],
    tickets: [],
    ticketCount: 0,
    ticketOdds: 0
  }

  if (!balanceResponse.error) {
    response.balances = balanceResponse.data || []
  }

  if (!loyaltyResponse.error && loyaltyResponse.data) {
    response.loyalty = loyaltyResponse.data
  }

  if (!bonusResponse.error) {
    response.bonuses = bonusResponse.data || []
  }

  if (!ticketsResponse.error && ticketsResponse.data) {
    const ticketData = ticketsResponse.data as any
    response.tickets = ticketData.tickets || []
    response.ticketCount = ticketData.total_tickets || 0
    response.ticketOdds = ticketData.odds_percentage || 0
  }

  return NextResponse.json(response)
})
