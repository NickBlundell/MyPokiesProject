import { Redis } from '@upstash/redis'
import type {
  Game,
  BonusOffer,
  JackpotPool,
  LoyaltyTier,
  User,
  UserBalance
} from '@mypokies/types'

/**
 * Cache configuration
 */
const CACHE_TTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 3600,         // 1 hour
  VERY_LONG: 86400,   // 24 hours
}

/**
 * Cache key prefixes
 */
const CACHE_PREFIX = {
  USER: 'user:',
  BALANCE: 'balance:',
  GAME: 'game:',
  GAMES_LIST: 'games:list:',
  BONUS: 'bonus:',
  BONUSES_LIST: 'bonuses:list:',
  JACKPOT: 'jackpot:',
  LOYALTY: 'loyalty:',
  TIER: 'tier:',
  TIERS_LIST: 'tiers:list',
  SESSION: 'session:',
  LEADERBOARD: 'leaderboard:',
}

export class CacheManager {
  private redis: Redis

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }

  // ============================================================================
  // User Cache
  // ============================================================================

  /**
   * Cache user data
   */
  async setUser(userId: string, user: User, ttl = CACHE_TTL.MEDIUM): Promise<void> {
    const key = `${CACHE_PREFIX.USER}${userId}`
    await this.redis.setex(key, ttl, JSON.stringify(user))
  }

  /**
   * Get cached user
   */
  async getUser(userId: string): Promise<User | null> {
    const key = `${CACHE_PREFIX.USER}${userId}`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    const key = `${CACHE_PREFIX.USER}${userId}`
    await this.redis.del(key)
  }

  // ============================================================================
  // Balance Cache
  // ============================================================================

  /**
   * Cache user balance
   */
  async setBalance(userId: string, balance: UserBalance, ttl = CACHE_TTL.SHORT): Promise<void> {
    const key = `${CACHE_PREFIX.BALANCE}${userId}`
    await this.redis.setex(key, ttl, JSON.stringify(balance))
  }

  /**
   * Get cached balance
   */
  async getBalance(userId: string): Promise<UserBalance | null> {
    const key = `${CACHE_PREFIX.BALANCE}${userId}`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Invalidate balance cache
   */
  async invalidateBalance(userId: string): Promise<void> {
    const key = `${CACHE_PREFIX.BALANCE}${userId}`
    await this.redis.del(key)
  }

  // ============================================================================
  // Games Cache
  // ============================================================================

  /**
   * Cache games list
   */
  async setGames(games: Game[], category?: string, ttl = CACHE_TTL.LONG): Promise<void> {
    const key = category
      ? `${CACHE_PREFIX.GAMES_LIST}${category}`
      : `${CACHE_PREFIX.GAMES_LIST}all`
    await this.redis.setex(key, ttl, JSON.stringify(games))
  }

  /**
   * Get cached games
   */
  async getGames(category?: string): Promise<Game[] | null> {
    const key = category
      ? `${CACHE_PREFIX.GAMES_LIST}${category}`
      : `${CACHE_PREFIX.GAMES_LIST}all`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Cache individual game
   */
  async setGame(gameId: string, game: Game, ttl = CACHE_TTL.LONG): Promise<void> {
    const key = `${CACHE_PREFIX.GAME}${gameId}`
    await this.redis.setex(key, ttl, JSON.stringify(game))
  }

  /**
   * Get cached game
   */
  async getGame(gameId: string): Promise<Game | null> {
    const key = `${CACHE_PREFIX.GAME}${gameId}`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  // ============================================================================
  // Bonuses Cache
  // ============================================================================

  /**
   * Cache bonus offers list
   */
  async setBonuses(bonuses: BonusOffer[], ttl = CACHE_TTL.MEDIUM): Promise<void> {
    const key = `${CACHE_PREFIX.BONUSES_LIST}active`
    await this.redis.setex(key, ttl, JSON.stringify(bonuses))
  }

  /**
   * Get cached bonuses
   */
  async getBonuses(): Promise<BonusOffer[] | null> {
    const key = `${CACHE_PREFIX.BONUSES_LIST}active`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Cache individual bonus
   */
  async setBonus(bonusId: string, bonus: BonusOffer, ttl = CACHE_TTL.MEDIUM): Promise<void> {
    const key = `${CACHE_PREFIX.BONUS}${bonusId}`
    await this.redis.setex(key, ttl, JSON.stringify(bonus))
  }

  /**
   * Get cached bonus
   */
  async getBonus(bonusId: string): Promise<BonusOffer | null> {
    const key = `${CACHE_PREFIX.BONUS}${bonusId}`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  // ============================================================================
  // Jackpot Cache
  // ============================================================================

  /**
   * Cache jackpot pool
   */
  async setJackpotPool(pool: JackpotPool, ttl = CACHE_TTL.SHORT): Promise<void> {
    const key = `${CACHE_PREFIX.JACKPOT}current`
    await this.redis.setex(key, ttl, JSON.stringify(pool))
  }

  /**
   * Get cached jackpot pool
   */
  async getJackpotPool(): Promise<JackpotPool | null> {
    const key = `${CACHE_PREFIX.JACKPOT}current`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  // ============================================================================
  // Loyalty Cache
  // ============================================================================

  /**
   * Cache loyalty tiers
   */
  async setLoyaltyTiers(tiers: LoyaltyTier[], ttl = CACHE_TTL.VERY_LONG): Promise<void> {
    const key = CACHE_PREFIX.TIERS_LIST
    await this.redis.setex(key, ttl, JSON.stringify(tiers))
  }

  /**
   * Get cached loyalty tiers
   */
  async getLoyaltyTiers(): Promise<LoyaltyTier[] | null> {
    const key = CACHE_PREFIX.TIERS_LIST
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  // ============================================================================
  // Session Cache
  // ============================================================================

  /**
   * Cache session data
   */
  async setSession(sessionId: string, data: any, ttl = CACHE_TTL.LONG): Promise<void> {
    const key = `${CACHE_PREFIX.SESSION}${sessionId}`
    await this.redis.setex(key, ttl, JSON.stringify(data))
  }

  /**
   * Get cached session
   */
  async getSession(sessionId: string): Promise<any | null> {
    const key = `${CACHE_PREFIX.SESSION}${sessionId}`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string, ttl = CACHE_TTL.LONG): Promise<void> {
    const key = `${CACHE_PREFIX.SESSION}${sessionId}`
    await this.redis.expire(key, ttl)
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${CACHE_PREFIX.SESSION}${sessionId}`
    await this.redis.del(key)
  }

  // ============================================================================
  // Leaderboard Cache
  // ============================================================================

  /**
   * Update leaderboard score
   */
  async updateLeaderboard(
    type: 'daily' | 'weekly' | 'monthly' | 'all-time',
    userId: string,
    score: number
  ): Promise<void> {
    const key = `${CACHE_PREFIX.LEADERBOARD}${type}`
    await this.redis.zadd(key, { score, member: userId })
  }

  /**
   * Get leaderboard top players
   */
  async getLeaderboard(
    type: 'daily' | 'weekly' | 'monthly' | 'all-time',
    limit = 10
  ): Promise<Array<{ userId: string; score: number }>> {
    const key = `${CACHE_PREFIX.LEADERBOARD}${type}`
    const data = await this.redis.zrange(key, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    const result: Array<{ userId: string; score: number }> = []
    for (let i = 0; i < data.length; i += 2) {
      result.push({
        userId: data[i] as string,
        score: Number(data[i + 1]),
      })
    }

    return result
  }

  /**
   * Get player rank in leaderboard
   */
  async getPlayerRank(
    type: 'daily' | 'weekly' | 'monthly' | 'all-time',
    userId: string
  ): Promise<number | null> {
    const key = `${CACHE_PREFIX.LEADERBOARD}${type}`
    const rank = await this.redis.zrevrank(key, userId)
    return rank !== null ? rank + 1 : null
  }

  // ============================================================================
  // Generic Cache Operations
  // ============================================================================

  /**
   * Set cache with TTL
   */
  async set(key: string, value: any, ttl = CACHE_TTL.MEDIUM): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value))
  }

  /**
   * Get from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    // Note: Upstash doesn't support SCAN, so we need to be careful with patterns
    // This is a simplified version - in production, you might want to track keys
    console.warn('Pattern-based cache clearing not fully supported with Upstash')
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key)
    return result === 1
  }

  /**
   * Set key expiration
   */
  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl)
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key)
  }

  /**
   * Increment counter
   */
  async increment(key: string, by = 1): Promise<number> {
    return await this.redis.incrby(key, by)
  }

  /**
   * Decrement counter
   */
  async decrement(key: string, by = 1): Promise<number> {
    return await this.redis.decrby(key, by)
  }
}

// Export singleton instance
export const cacheManager = new CacheManager()

// Export cache TTL constants
export { CACHE_TTL }