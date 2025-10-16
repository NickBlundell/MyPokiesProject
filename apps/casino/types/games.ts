// Game Types for Casino Platform

export type GameVolatility = 'low' | 'medium' | 'high' | 'very_high'

export type GameCategory =
  | 'slots'
  | 'table'
  | 'live'
  | 'video_poker'
  | 'jackpot'
  | 'casual'
  | 'crash'
  | 'other'

export interface Game {
  id: string
  game_id: string
  system_id: string
  game_type: string
  game_name: string
  provider: string | null
  category: string | null
  subcategory: string | null
  thumbnail_url: string | null
  banner_url: string | null
  description: string | null
  rtp: number | null // Return to player percentage
  min_bet: number | null
  max_bet: number | null
  volatility: GameVolatility | null
  has_jackpot: boolean
  has_freespins: boolean
  is_new: boolean
  is_featured: boolean
  is_active: boolean
  display_order: number
  tags: string[] | null
  supported_currencies: string[] | null
  lines: number | null // Number of paylines (for slots)
  reels: number | null // Number of reels (for slots)
  max_multiplier: number | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface GameStatistics {
  id: string
  game_id: string
  total_rounds: number
  total_players: number
  total_wagered: number
  total_won: number
  biggest_win: number
  biggest_win_user_id: string | null
  biggest_win_at: string | null
  last_played_at: string | null
  updated_at: string
}

export interface PlayerFavoriteGame {
  id: string
  user_id: string
  game_id: string
  created_at: string
}

// API Response types
export interface GameWithStats extends Game {
  statistics?: GameStatistics
  is_favorite?: boolean
}

export interface GameListResponse {
  games: GameWithStats[]
  total: number
  page: number
  limit: number
}

export interface GameFilters {
  category?: string
  provider?: string
  search?: string
  is_new?: boolean
  is_featured?: boolean
  has_jackpot?: boolean
  tags?: string[]
  min_bet?: number
  max_bet?: number
}

export interface GameSortOptions {
  field: 'game_name' | 'provider' | 'rtp' | 'display_order' | 'created_at' | 'total_wagered' | 'total_rounds'
  direction: 'asc' | 'desc'
}

// Game launch types
export interface GameLaunchRequest {
  game_id: string
  currency: string
  return_url?: string
}

export interface GameLaunchResponse {
  success: boolean
  launch_url?: string
  session_id?: string
  error?: string
}

// Fundist game descriptor parsing
export interface ParsedGameDescriptor {
  system_id: string
  game_type: string
}

export function parseGameDescriptor(game_desc: string): ParsedGameDescriptor | null {
  const parts = game_desc.split(':')
  if (parts.length === 2) {
    return {
      system_id: parts[0],
      game_type: parts[1]
    }
  }
  return null
}

// Game category helpers
export const GAME_CATEGORIES: Record<string, { name: string; icon: string }> = {
  slots: { name: 'Slots', icon: '🎰' },
  table: { name: 'Table Games', icon: '🃏' },
  live: { name: 'Live Casino', icon: '🎥' },
  video_poker: { name: 'Video Poker', icon: '🎴' },
  jackpot: { name: 'Jackpots', icon: '💰' },
  casual: { name: 'Casual', icon: '🎮' },
  crash: { name: 'Crash Games', icon: '🚀' },
  other: { name: 'Other', icon: '🎲' }
}

// Provider list (can be extended)
export const POPULAR_PROVIDERS = [
  'NetEnt',
  'Microgaming',
  'Play\'n GO',
  'Pragmatic Play',
  'Evolution Gaming',
  'Red Tiger',
  'Yggdrasil',
  'Quickspin',
  'Big Time Gaming',
  'Push Gaming'
]

// RTP rating helper
export function getRTPRating(rtp: number | null): 'low' | 'average' | 'good' | 'excellent' | 'unknown' {
  if (rtp === null) return 'unknown'
  if (rtp >= 97) return 'excellent'
  if (rtp >= 96) return 'good'
  if (rtp >= 94) return 'average'
  return 'low'
}

// Volatility description helper
export function getVolatilityDescription(volatility: GameVolatility | null): string {
  switch (volatility) {
    case 'low':
      return 'Frequent small wins'
    case 'medium':
      return 'Balanced risk and reward'
    case 'high':
      return 'Less frequent, bigger wins'
    case 'very_high':
      return 'Rare, very large wins'
    default:
      return 'Unknown volatility'
  }
}
