/**
 * Bonus System Types
 */

export interface BonusOffer {
  id: string
  bonus_code: string
  bonus_name: string
  bonus_type: 'deposit_match' | 'no_deposit' | 'cashback' | 'free_spins' | 'reload'
  match_percentage?: number
  max_bonus_amount?: number
  min_deposit_amount?: number
  fixed_bonus_amount?: number
  wagering_requirement_multiplier: number
  wagering_applies_to: 'bonus_only' | 'deposit_and_bonus'
  max_cashout?: number
  max_bet_with_bonus?: number
  valid_from: string
  valid_until?: string
  day_of_week?: number
  terms_conditions: string
  active: boolean
  auto_apply: boolean
  one_time_per_user: boolean
  created_at: string
  updated_at: string
}

export interface GameWageringWeight {
  id: string
  game_type: string
  contribution_percentage: number
  created_at: string
}

export interface PlayerBonus {
  id: string
  user_id: string
  bonus_offer_id: string
  bonus_code_used?: string
  bonus_amount: number
  deposit_amount?: number
  wagering_requirement_total: number
  wagering_completed: number
  wagering_requirement_remaining: number // Generated column
  wagering_percentage: number
  max_cashout?: number
  status: 'pending' | 'active' | 'completed' | 'forfeited' | 'expired' | 'cancelled'
  issued_at: string
  activated_at?: string
  completed_at?: string
  expires_at?: string
  forfeited_reason?: string
  created_at: string
  updated_at: string
  // Joined fields
  bonus_offer?: BonusOffer
}

export interface BonusWageringContribution {
  id: string
  player_bonus_id: string
  transaction_id: string
  game_type: string
  wager_amount: number
  contribution_percentage: number
  contribution_amount: number
  created_at: string
}

export interface ClaimBonusRequest {
  bonus_code?: string
  deposit_amount?: number
}

export interface ClaimBonusResponse {
  success: boolean
  player_bonus_id: string
  bonus_amount: number
  wagering_requirement: number
  expires_at: string
  message: string
}

export interface ActiveBonus {
  id: string
  bonus_name: string
  bonus_amount: number
  wagering_completed: number
  wagering_requirement_total: number
  wagering_requirement_remaining: number // Generated column
  wagering_percentage: number
  expires_at: string
  status: string
}
