/**
 * Loyalty/VIP System Types
 */

export interface LoyaltyTier {
  id: string
  tier_name: string
  tier_level: number
  points_required: number
  cashback_rate: number
  points_per_dollar_redemption: number
  withdrawal_priority: string
  birthday_bonus: number
  has_personal_manager: boolean
  jackpot_ticket_rate: number
  benefits: Record<string, any>
  created_at: string
}

export interface PlayerLoyalty {
  id: string
  user_id: string
  current_tier_id: string
  total_points_earned: number
  available_points: number
  lifetime_wagered: number
  tier_started_at: string
  last_activity_at: string
  created_at: string
  updated_at: string
  current_tier?: LoyaltyTier
}

export interface LoyaltyPointsTransaction {
  id: string
  user_id: string
  points: number
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'manual'
  source: string
  related_transaction_id?: string
  description: string
  created_at: string
}

export interface PlayerTierInfo {
  tier_name: string
  tier_level: number
  total_points: number
  available_points: number
  cashback_rate: number
  points_to_next_tier: number
  next_tier_name: string | null
  jackpot_ticket_rate: number
}

export interface PointsRedemptionRequest {
  points_to_redeem: number
}

export interface PointsRedemptionResponse {
  success: boolean
  points_redeemed: number
  credit_amount: number
  remaining_points: number
  message: string
}
