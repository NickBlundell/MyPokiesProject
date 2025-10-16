export interface Player {
  id: string
  external_user_id: string
  email?: string
  auth_user_id?: string
  created_at: string
  updated_at: string
  balance?: number
  bonus_balance?: number
  total_deposits?: number
  total_withdrawals?: number
  loyalty_tier?: string
  vip_status?: string
  kyc_status?: string
  last_login?: string
  status: 'active' | 'suspended' | 'banned' | 'self_excluded'
}

export interface PlayerModalProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
}

export interface TabProps {
  player: Player
}

export interface PnLData {
  totalWagered: number
  totalWon: number
  netResult: number
  houseEdge: number
  totalSessions: number
  avgSessionLength: string
  favoriteGames: string[]
  lastGames: Array<{ game: string; time: string; result: number }>
}

export interface Conversation {
  id: string
  type: 'inbound' | 'outbound'
  message: string
  time: string
  aiGenerated?: boolean
}

export interface Transaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'win' | 'bet'
  amount: number
  method?: string
  game?: string
  status: string
  time: string
}

export interface Bonus {
  name: string
  code: string
  status: string
  amount: number
  wagering: string
  expires: string
}