import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('jackpot-draw')

/**
 * Jackpot Draw Function
 * Scheduled to run every Wednesday at 8:00 PM
 * Performs weighted random selection for multi-tier prizes
 */

interface Ticket {
  id: string
  user_id: string
  ticket_number: number
}

interface Winner {
  draw_id: string
  user_id: string
  tier: string
  tier_order: number
  winning_ticket_number: number
  tickets_held: number
  total_tickets_in_pool: number
  win_odds_percentage: number
  prize_amount: number
}

serve(async (req: Request) => {
  const startTime = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    logger.info('Starting jackpot draw process')

    // Get active weekly pool
    const { data: pool, error: poolError } = await supabase
      .from('jackpot_pools')
      .select('*')
      .eq('jackpot_name', 'Weekly Main Jackpot')
      .eq('status', 'active')
      .single()

    if (poolError || !pool) {
      logger.error('No active pool found', poolError)
      return new Response(JSON.stringify({ error: 'No active pool' }), { status: 400 })
    }

    // Get all eligible tickets
    const { data: allTickets, error: ticketsError } = await supabase
      .from('jackpot_tickets')
      .select('id, user_id, ticket_number')
      .eq('jackpot_pool_id', pool.id)
      .eq('draw_eligible', true)

    if (ticketsError || !allTickets || allTickets.length === 0) {
      logger.error('No eligible tickets', ticketsError)
      return new Response(JSON.stringify({ error: 'No eligible tickets' }), { status: 400 })
    }

    const totalTickets = allTickets.length
    logger.info('Total tickets in pool', { total_tickets: totalTickets })

    // Get prize tier configuration
    const { data: prizeTiers, error: tiersError } = await supabase
      .from('jackpot_prize_tiers')
      .select('*')
      .eq('jackpot_pool_id', pool.id)
      .order('tier_order', { ascending: true })

    if (tiersError || !prizeTiers) {
      logger.error('Prize tiers error', tiersError)
      return new Response(JSON.stringify({ error: 'Prize tiers not found' }), { status: 500 })
    }

    // Create draw record
    const randomSeed = crypto.randomUUID()
    const { data: draw, error: drawError } = await supabase
      .from('jackpot_draws')
      .insert({
        jackpot_pool_id: pool.id,
        draw_number: pool.draw_number + 1,
        total_pool_amount: pool.current_amount,
        total_tickets: totalTickets,
        total_winners: 14, // 1 grand + 3 major + 10 minor
        random_seed: randomSeed,
        drawn_at: new Date().toISOString()
      })
      .select()
      .single()

    if (drawError || !draw) {
      logger.error('Draw creation error', drawError)
      return new Response(JSON.stringify({ error: 'Failed to create draw' }), { status: 500 })
    }

    logger.info('Created draw', { draw_number: draw.draw_number })

    // Weighted random selection function
    const selectWeightedTicket = (tickets: Ticket[]): Ticket => {
      const randomIndex = Math.floor(Math.random() * tickets.length)
      return tickets[randomIndex]
    }

    // Get user ticket counts for odds calculation
    const getUserTicketCount = (userId: string): number => {
      return allTickets.filter(t => t.user_id === userId).length
    }

    const winners: Winner[] = []
    const usedTickets = new Set<string>()

    // DRAW 1 GRAND WINNER (50% of pool)
    logger.debug('Drawing Grand Winner')
    const availableForGrand = allTickets.filter(t => !usedTickets.has(t.id))
    const grandWinner = selectWeightedTicket(availableForGrand)
    usedTickets.add(grandWinner.id)

    const grandPrize = Number((pool.current_amount * 0.5).toFixed(2))
    const grandTicketCount = getUserTicketCount(grandWinner.user_id)

    winners.push({
      draw_id: draw.id,
      user_id: grandWinner.user_id,
      tier: 'Grand',
      tier_order: 1,
      winning_ticket_number: grandWinner.ticket_number,
      tickets_held: grandTicketCount,
      total_tickets_in_pool: totalTickets,
      win_odds_percentage: Number(((grandTicketCount / totalTickets) * 100).toFixed(4)),
      prize_amount: grandPrize
    })

    logger.info('Grand Winner selected', {
      user_id: grandWinner.user_id,
      prize: grandPrize,
      ticket_number: grandWinner.ticket_number
    })

    // DRAW 3 MAJOR WINNERS (30% of pool = 10% each)
    logger.debug('Drawing Major Winners')
    const majorPrize = Number((pool.current_amount * 0.3 / 3).toFixed(2))

    for (let i = 0; i < 3; i++) {
      const availableForMajor = allTickets.filter(t => !usedTickets.has(t.id))
      const majorWinner = selectWeightedTicket(availableForMajor)
      usedTickets.add(majorWinner.id)

      const majorTicketCount = getUserTicketCount(majorWinner.user_id)

      winners.push({
        draw_id: draw.id,
        user_id: majorWinner.user_id,
        tier: 'Major',
        tier_order: i + 1,
        winning_ticket_number: majorWinner.ticket_number,
        tickets_held: majorTicketCount,
        total_tickets_in_pool: totalTickets,
        win_odds_percentage: Number(((majorTicketCount / totalTickets) * 100).toFixed(4)),
        prize_amount: majorPrize
      })

      logger.debug('Major Winner selected', { index: i + 1, user_id: majorWinner.user_id })
    }

    // DRAW 10 MINOR WINNERS (20% of pool = 2% each)
    logger.debug('Drawing Minor Winners')
    const minorPrize = Number((pool.current_amount * 0.2 / 10).toFixed(2))

    for (let i = 0; i < 10; i++) {
      const availableForMinor = allTickets.filter(t => !usedTickets.has(t.id))
      const minorWinner = selectWeightedTicket(availableForMinor)
      usedTickets.add(minorWinner.id)

      const minorTicketCount = getUserTicketCount(minorWinner.user_id)

      winners.push({
        draw_id: draw.id,
        user_id: minorWinner.user_id,
        tier: 'Minor',
        tier_order: i + 1,
        winning_ticket_number: minorWinner.ticket_number,
        tickets_held: minorTicketCount,
        total_tickets_in_pool: totalTickets,
        win_odds_percentage: Number(((minorTicketCount / totalTickets) * 100).toFixed(4)),
        prize_amount: minorPrize
      })

      logger.debug('Minor Winner selected', { index: i + 1, user_id: minorWinner.user_id })
    }

    // Insert all winners
    const { error: winnersError } = await supabase
      .from('jackpot_winners')
      .insert(winners)

    if (winnersError) {
      logger.error('Winners insert error', winnersError)
      return new Response(JSON.stringify({ error: 'Failed to insert winners' }), { status: 500 })
    }

    logger.info('Inserted winners', { count: winners.length })

    // Credit prizes to winners' accounts
    for (const winner of winners) {
      // Get user's casino ID
      const { data: userData } = await supabase
        .from('users')
        .select('id, external_user_id')
        .eq('id', winner.user_id)
        .single()

      if (!userData) continue

      // Create credit transaction for prize
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          tid: `jackpot_${draw.id}_${winner.tier.toLowerCase()}_${winner.tier_order}`,
          user_id: userData.id,
          currency: 'USD',
          type: 'credit',
          subtype: `jackpot_${winner.tier.toLowerCase()}`,
          amount: winner.prize_amount,
          balance_before: 0, // Will be updated by balance trigger
          balance_after: 0, // Will be updated by balance trigger
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (txError) {
        logger.error('Failed to credit prize for user', txError, { user_id: userData.id })
        continue
      }

      // Update winner record with transaction ID
      await supabase
        .from('jackpot_winners')
        .update({
          prize_credited: true,
          credited_transaction_id: transaction.id,
          credited_at: new Date().toISOString()
        })
        .eq('id', winner.id)

      logger.debug('Credited prize', {
        amount: winner.prize_amount,
        user: userData.external_user_id
      })
    }

    // Mark all current tickets as not eligible for next draw
    await supabase
      .from('jackpot_tickets')
      .update({ draw_eligible: false })
      .eq('jackpot_pool_id', pool.id)

    // Reset pool to seed amount and increment draw number
    const nextDrawDate = new Date()
    nextDrawDate.setDate(nextDrawDate.getDate() + 7) // Next Wednesday
    nextDrawDate.setHours(20, 0, 0, 0)

    await supabase
      .from('jackpot_pools')
      .update({
        current_amount: pool.seed_amount,
        draw_number: pool.draw_number + 1,
        next_draw_at: nextDrawDate.toISOString(),
        status: 'active'
      })
      .eq('id', pool.id)

    // Clear ticket counts
    await supabase
      .from('player_ticket_counts')
      .delete()
      .eq('jackpot_pool_id', pool.id)

    const processingTime = Date.now() - startTime

    logger.info('Draw completed', {
      processing_time_ms: processingTime,
      next_draw: nextDrawDate.toISOString(),
      winners_count: winners.length
    })

    return new Response(
      JSON.stringify({
        success: true,
        draw_number: draw.draw_number,
        total_pool: pool.current_amount,
        total_tickets: totalTickets,
        winners_count: winners.length,
        grand_prize: grandPrize,
        major_prize: majorPrize,
        minor_prize: minorPrize,
        processing_time_ms: processingTime,
        next_draw: nextDrawDate.toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    logger.error('Unhandled error in jackpot draw', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500 }
    )
  }
})
