/**
 * Real-time hooks for casino data
 * Export all hooks from a single entry point
 */

// Player balance and transactions
export { useRealtimeBalance } from './useRealtimeBalance'
export { useRealtimeBonus } from './useRealtimeBonus'
export { useRealtimeTransactions } from './useRealtimeTransactions'
export { useRealtimeGameRounds } from './useRealtimeGameRounds'

// Jackpot system
export { useRealtimeJackpot } from './useRealtimeJackpot'
export { useRealtimeMyTickets } from './useRealtimeMyTickets'

// Loyalty system
export { useRealtimeLoyalty } from './useRealtimeLoyalty'

// Games catalog
// Note: Games data is provided by AppContext - use useAppContext() instead of individual hooks
export { useRealtimeGameStats } from './useRealtimeGameStats'
export { useRealtimeFavoriteGames } from './useRealtimeFavoriteGames'

// Cached versions with offline support
export { useRealtimeJackpotCached } from './useRealtimeJackpotCached'

// Cache utilities
export { CacheStore, useCache } from './cache-store'
