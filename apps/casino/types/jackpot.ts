/**
 * Progressive Jackpot System Types
 */

export interface JackpotPool {
  id: string
  jackpot_name: string
  jackpot_type: 'weekly' | 'daily' | 'monthly'
  current_amount: number
  seed_amount: number
  contribution_rate: number
  draw_frequency: string
  draw_day_of_week: number
  draw_time: string
  next_draw_at: string
  status: 'active' | 'drawing' | 'paused'
  draw_number: number
  created_at: string
  updated_at: string
}

export interface JackpotPrizeTier {
  id: string
  jackpot_pool_id: string
  tier_name: string
  tier_order: number
  winner_count: number
  pool_percentage: number
  created_at: string
}

export interface JackpotTicket {
  id: string
  jackpot_pool_id: string
  user_id: string
  ticket_number: number
  earned_from_transaction_id?: string
  wager_amount: number
  draw_eligible: boolean
  earned_at: string
}

export interface PlayerTicketCount {
  id: string
  jackpot_pool_id: string
  user_id: string
  total_tickets: number
  last_ticket_at: string
  updated_at: string
}

export interface JackpotDraw {
  id: string
  jackpot_pool_id: string
  draw_number: number
  total_pool_amount: number
  total_tickets: number
  total_winners: number
  random_seed: string
  drawn_at: string
  created_at: string
}

export interface JackpotWinner {
  id: string
  draw_id: string
  user_id: string
  tier: 'Grand' | 'Major' | 'Minor'
  tier_order: number
  winning_ticket_number: number
  tickets_held: number
  total_tickets_in_pool: number
  win_odds_percentage: number
  prize_amount: number
  prize_credited: boolean
  credited_transaction_id?: string
  credited_at?: string
  created_at: string
  // Joined fields
  user?: {
    external_user_id: string
  }
}

export interface CurrentJackpotInfo {
  jackpot_id?: string
  jackpot_name: string
  current_amount: number
  currency?: string
  total_tickets: number
  next_draw_at?: string
  draw_date?: string
  time_remaining?: string
  hours_until_draw?: number
  last_winner?: string | null
  last_win_amount?: number | null
  last_win_date?: string | null
}

export interface MyJackpotTickets {
  jackpot_name: string
  my_tickets: number
  total_tickets: number
  my_odds_percentage: number
  current_amount: number
  next_draw_at: string
}

export interface JackpotDrawResult {
  success: boolean
  draw_number: number
  total_pool: number
  total_tickets: number
  winners_count: number
  grand_prize: number
  major_prize: number
  minor_prize: number
  processing_time_ms: number
  next_draw: string
}
