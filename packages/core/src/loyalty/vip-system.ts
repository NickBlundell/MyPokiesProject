import type { LoyaltyTier, PlayerLoyalty } from '@mypokies/types'

export class VIPSystem {
  private readonly POINTS_PER_DOLLAR = 0.1 // 1 point per $10 wagered

  /**
   * Calculate points earned from wagering
   */
  calculatePoints(wageredAmount: number, tier?: LoyaltyTier): number {
    const basePoints = Math.floor(wageredAmount * this.POINTS_PER_DOLLAR)

    // Apply tier multiplier if available
    if (tier && tier.cashback_rate) {
      const multiplier = 1 + (Number(tier.cashback_rate) / 100)
      return Math.floor(basePoints * multiplier)
    }

    return basePoints
  }

  /**
   * Check if player should be upgraded to next tier
   */
  checkTierUpgrade(
    player: PlayerLoyalty,
    tiers: LoyaltyTier[]
  ): LoyaltyTier | null {
    // Sort tiers by level
    const sortedTiers = tiers.sort((a, b) => a.tier_level - b.tier_level)

    // Find current tier index
    const currentIndex = sortedTiers.findIndex(t => t.id === player.current_tier_id)

    // Check if there's a next tier
    if (currentIndex === -1 || currentIndex === sortedTiers.length - 1) {
      return null
    }

    // Check next tier
    const nextTier = sortedTiers[currentIndex + 1]

    // Check if player has enough points
    if (player.total_points_earned >= nextTier.points_required) {
      return nextTier
    }

    return null
  }

  /**
   * Calculate jackpot tickets earned based on tier
   */
  getTicketRate(tier: LoyaltyTier): number {
    return Number(tier.jackpot_ticket_rate) || 1
  }

  /**
   * Calculate tickets earned from wagering
   */
  calculateTickets(wageredAmount: number, tier: LoyaltyTier): number {
    const rate = this.getTicketRate(tier)
    // 1 ticket per $100 wagered, multiplied by tier rate
    return Math.floor((wageredAmount / 100) * rate)
  }

  /**
   * Get tier benefits
   */
  getTierBenefits(tier: LoyaltyTier): {
    cashbackRate: number
    withdrawalPriority: string
    birthdayBonus: number
    hasPersonalManager: boolean
    jackpotTicketRate: number
  } {
    return {
      cashbackRate: Number(tier.cashback_rate),
      withdrawalPriority: tier.withdrawal_priority,
      birthdayBonus: Number(tier.birthday_bonus),
      hasPersonalManager: tier.has_personal_manager,
      jackpotTicketRate: Number(tier.jackpot_ticket_rate),
    }
  }

  /**
   * Calculate points needed for next tier
   */
  getPointsToNextTier(
    player: PlayerLoyalty,
    tiers: LoyaltyTier[]
  ): number | null {
    const nextTier = this.checkTierUpgrade(player, tiers)

    if (!nextTier) {
      return null // Already at max tier
    }

    return nextTier.points_required - player.total_points_earned
  }

  /**
   * Calculate redemption value of points
   */
  calculateRedemptionValue(points: number, tier: LoyaltyTier): number {
    const rate = tier.points_per_dollar_redemption || 100
    return points / rate
  }
}