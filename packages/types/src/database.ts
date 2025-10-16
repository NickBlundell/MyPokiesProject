/**
 * Shared Database Types for MyPokies Platform
 * Used by both MyPokies (player app) and MyPokiesAdmin (admin panel)
 */

// ============================================================================
// Users & Authentication
// ============================================================================

export interface User {
  id: string
  external_user_id: string
  email: string | null
  auth_user_id: string | null
  phone_number?: string | null
  phone_verified?: boolean
  last_login_at?: string | null
  last_login_ip?: string | null
  account_status?: 'active' | 'suspended' | 'closed' | 'self_excluded'
  created_at: string
  updated_at: string
}

export interface UserBalance {
  id: string
  user_id: string
  currency: string
  balance: number
  bonus_balance?: number
  locked_bonus?: number
  version: number
  updated_at: string
}

// ============================================================================
// Transactions
// ============================================================================

export type TransactionType = 'debit' | 'credit' | 'rollback' | 'promotion_win'

export interface Transaction {
  id: string
  tid: string
  user_id: string
  currency: string
  type: TransactionType
  subtype: string | null
  amount: number
  balance_before: number
  balance_after: number
  game_round_id?: string | null
  action_id?: number | null
  game_id?: number | null
  rollback_tid?: string | null
  promotion_id?: string | null
  created_at: string
  processed_at: string
}

// ============================================================================
// Game Rounds
// ============================================================================

export type GameRoundStatus = 'active' | 'completed' | 'rolled_back'

export interface GameRound {
  id: string
  game_round_id: string
  user_id: string
  game_desc: string | null
  currency: string
  total_bet: number
  total_win: number
  status: GameRoundStatus
  started_at: string
  completed_at: string | null
}

export interface RoundAction {
  id: string
  round_id: string
  transaction_id: string | null
  action_id: number
  game_id: number
  action_type: 'bet' | 'win' | 'rollback'
  amount: number
  timestamp: string
}

// ============================================================================
// Loyalty/VIP System
// ============================================================================

export interface LoyaltyTier {
  id: string
  tier_name: string
  tier_level: number
  points_required: number
  cashback_rate: number
  points_per_dollar_redemption: number
  withdrawal_priority: 'standard' | 'fast' | 'priority' | 'instant'
  birthday_bonus: number
  has_personal_manager: boolean
  jackpot_ticket_rate: number
  benefits: Record<string, any>
  created_at: string
}

export interface PlayerLoyalty {
  id: string
  user_id: string
  current_tier_id: string | null
  total_points_earned: number
  available_points: number
  lifetime_wagered: number
  tier_started_at: string
  last_activity_at: string
  created_at: string
  updated_at: string
}

export interface LoyaltyPointsTransaction {
  id: string
  user_id: string
  points: number
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'manual'
  source: string | null
  related_transaction_id: string | null
  description: string | null
  created_at: string
}

// ============================================================================
// Progressive Jackpot
// ============================================================================

export type JackpotType = 'weekly' | 'daily' | 'monthly'
export type JackpotStatus = 'active' | 'drawing' | 'paused'

export interface JackpotPool {
  id: string
  jackpot_name: string
  jackpot_type: JackpotType
  current_amount: number
  seed_amount: number
  contribution_rate: number
  draw_frequency: string
  draw_day_of_week: number | null
  draw_time: string
  next_draw_at: string | null
  status: JackpotStatus
  draw_number: number
  created_at: string
  updated_at: string
}

export interface JackpotTicket {
  id: string
  jackpot_pool_id: string
  user_id: string
  ticket_number: number
  earned_from_transaction_id: string | null
  wager_amount: number | null
  draw_eligible: boolean
  earned_at: string
}

export interface JackpotWinner {
  id: string
  draw_id: string
  user_id: string
  tier: string
  tier_order: number
  winning_ticket_number: number
  tickets_held: number
  total_tickets_in_pool: number
  win_odds_percentage: number | null
  prize_amount: number
  prize_credited: boolean
  credited_transaction_id: string | null
  credited_at: string | null
  created_at: string
}

// ============================================================================
// Bonus System
// ============================================================================

export type BonusType = 'deposit_match' | 'no_deposit' | 'cashback' | 'free_spins' | 'reload'
export type BonusStatus = 'pending' | 'active' | 'completed' | 'forfeited' | 'expired' | 'cancelled'

export interface BonusOffer {
  id: string
  bonus_code: string | null
  bonus_name: string
  bonus_type: BonusType
  match_percentage: number | null
  max_bonus_amount: number | null
  min_deposit_amount: number | null
  fixed_bonus_amount: number | null
  wagering_requirement_multiplier: number
  wagering_applies_to: 'bonus_only' | 'deposit_and_bonus'
  max_cashout: number | null
  max_bet_with_bonus: number | null
  valid_from: string
  valid_until: string | null
  day_of_week: number | null
  terms_conditions: string | null
  active: boolean
  auto_apply: boolean
  one_time_per_user: boolean
  created_at: string
  updated_at: string
}

export interface PlayerBonus {
  id: string
  user_id: string
  bonus_offer_id: string | null
  bonus_code_used: string | null
  bonus_amount: number
  deposit_amount: number | null
  wagering_requirement_total: number
  wagering_completed: number
  wagering_requirement_remaining: number // Generated column
  wagering_percentage: number
  max_cashout: number | null
  status: BonusStatus
  issued_at: string
  activated_at: string | null
  completed_at: string | null
  expires_at: string | null
  forfeited_reason: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Games
// ============================================================================

export interface Game {
  id: number
  game_name: string
  game_provider: string
  game_type: string
  thumbnail_url: string | null
  is_active: boolean
  popularity_score: number
  release_date: string | null
  rtp: number | null
  volatility: string | null
  max_win: number | null
  features: string[] | null
  created_at: string
  updated_at: string
}

export interface GameStatistics {
  id: string
  game_id: number
  total_players: number
  total_rounds: number
  total_wagered: number
  total_won: number
  biggest_win: number | null
  biggest_win_user_id: string | null
  avg_bet_size: number | null
  last_played_at: string | null
  updated_at: string
}

// ============================================================================
// Admin System
// ============================================================================

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'marketing' | 'finance'

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: AdminRole
  permissions: string[]
  is_active: boolean
  two_factor_enabled: boolean
  last_login: string | null
  last_ip: string | null
  created_at: string
  updated_at: string
}

export interface AdminAuditLog {
  id: string
  admin_user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface PlayerNote {
  id: string
  player_id: string
  admin_user_id: string | null
  note: string
  category: 'general' | 'support' | 'compliance' | 'vip' | 'marketing'
  is_internal: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Marketing & CRM
// ============================================================================

export interface MarketingLead {
  id: string
  list_id: string
  phone_number: string
  phone_country_code: string
  email: string | null
  first_name: string | null
  last_name: string | null
  status: 'new' | 'contacted' | 'registered' | 'converted' | 'invalid' | 'opted_out'
  last_contacted_at: string | null
  contact_count: number
  registered_at: string | null
  converted_at: string | null
  player_id: string | null
  conversion_value: number
  opted_out: boolean
  tags: string[] | null
  custom_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface SMSMessage {
  id: string
  phone_number: string
  message_content: string
  direction: 'inbound' | 'outbound'
  campaign_id: string | null
  lead_id: string | null
  template_id: string | null
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  sent_at: string | null
  delivered_at: string | null
  failed_at: string | null
  failure_reason: string | null
  provider: string | null
  provider_message_id: string | null
  provider_cost: number
  replied: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Support System
// ============================================================================

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface SupportTicket {
  id: string
  player_id: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string | null
  assigned_to: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  first_response_at: string | null
  satisfaction_rating: number | null
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_type: 'player' | 'admin'
  sender_id: string
  message: string
  attachments: Record<string, any> | null
  is_internal: boolean
  created_at: string
}

// ============================================================================
// Unified Views
// ============================================================================

export interface UnifiedUserProfile {
  player_id: string
  external_user_id: string
  email: string | null
  auth_user_id: string | null
  registered_at: string
  current_tier_id: string | null
  tier_name: string | null
  tier_level: number | null
  total_points_earned: number | null
  available_points: number | null
  lifetime_wagered: number | null
  current_balance: number | null
  bonus_balance: number | null
  locked_bonus: number | null
  currency: string | null
  active_days_last_30: number | null
  last_transaction_at: string | null
  total_deposits: number | null
  active_bonuses_count: number | null
  player_segment: 'NEW' | 'ACTIVE' | 'REGULAR' | 'HIGH_VALUE' | 'VIP'
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

// ============================================================================
// Common Enums
// ============================================================================

export const TRANSACTION_TYPES = ['debit', 'credit', 'rollback', 'promotion_win'] as const
export const BONUS_TYPES = ['deposit_match', 'no_deposit', 'cashback', 'free_spins', 'reload'] as const
export const BONUS_STATUSES = ['pending', 'active', 'completed', 'forfeited', 'expired', 'cancelled'] as const
export const ADMIN_ROLES = ['super_admin', 'admin', 'support', 'marketing', 'finance'] as const
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
