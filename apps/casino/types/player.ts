/**
 * Player and Casino Account Types
 */

export interface CasinoProfile {
  casino_user_id: string
  external_user_id: string
  email: string | null
  total_balance: number
  currency: string
  total_bets: number
  total_wins: number
  total_transactions: number
}

export interface Balance {
  currency: string
  balance: number
  updated_at: string
}

export interface Transaction {
  id: string
  tid: string
  type: 'debit' | 'credit' | 'rollback' | 'promotion_win'
  subtype: string | null
  amount: number
  currency: string
  balance_before: number
  balance_after: number
  created_at: string
  game_desc: string | null
  game_round_id: string | null
}

export interface RoundAction {
  action_id: number
  game_id: number
  action_type: 'bet' | 'win' | 'rollback'
  amount: number
  timestamp: string
}

export interface GameRound {
  id: string
  game_round_id: string
  game_desc: string | null
  currency: string
  total_bet: number
  total_win: number
  status: 'active' | 'completed' | 'rolled_back'
  started_at: string
  completed_at: string | null
  round_actions: RoundAction[]
}

export interface ProfileResponse {
  linked: boolean
  profile?: CasinoProfile
  message?: string
}

export interface BalanceResponse {
  balances: Balance[]
}

export interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  limit: number
  offset: number
}

export interface GameHistoryResponse {
  rounds: GameRound[]
  total: number
  limit: number
  offset: number
}

export interface LinkAccountRequest {
  external_user_id: string
}

export interface LinkAccountResponse {
  success: boolean
  message: string
  external_user_id?: string
  error?: string
  linked_to?: string
}
