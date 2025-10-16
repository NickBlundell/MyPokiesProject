import type { BonusOffer, PlayerBonus } from '@mypokies/types'

export class BonusEngine {
  /**
   * Calculate wagering requirements based on bonus amount and multiplier
   */
  calculateWagering(amount: number, multiplier: number): number {
    return amount * multiplier
  }

  /**
   * Check if a player is eligible for a bonus
   */
  validateClaim(
    playerId: string,
    bonus: BonusOffer,
    depositAmount?: number
  ): { valid: boolean; reason?: string } {
    // Check if bonus is active
    if (!bonus.active) {
      return { valid: false, reason: 'Bonus is not active' }
    }

    // Check if bonus has expired
    if (bonus.valid_until && new Date(bonus.valid_until) < new Date()) {
      return { valid: false, reason: 'Bonus has expired' }
    }

    // Check minimum deposit requirement
    if (bonus.min_deposit_amount && depositAmount) {
      if (depositAmount < Number(bonus.min_deposit_amount)) {
        return {
          valid: false,
          reason: `Minimum deposit of ${bonus.min_deposit_amount} required`,
        }
      }
    }

    return { valid: true }
  }

  /**
   * Calculate bonus amount based on deposit and offer
   */
  calculateBonusAmount(depositAmount: number, offer: BonusOffer): number {
    if (offer.fixed_bonus_amount) {
      return Number(offer.fixed_bonus_amount)
    }

    if (offer.match_percentage) {
      const calculated = (depositAmount * Number(offer.match_percentage)) / 100

      // Apply max bonus limit if set
      if (offer.max_bonus_amount) {
        return Math.min(calculated, Number(offer.max_bonus_amount))
      }

      return calculated
    }

    return 0
  }

  /**
   * Calculate wagering progress percentage
   */
  calculateProgress(completed: number, required: number): number {
    if (required === 0) return 100
    return Math.min(100, (completed / required) * 100)
  }

  /**
   * Check if wagering is completed
   */
  isWageringComplete(bonus: PlayerBonus): boolean {
    return Number(bonus.wagering_completed) >= Number(bonus.wagering_requirement_total)
  }

  /**
   * Apply game contribution weights to wagering
   */
  applyGameWeight(wagerAmount: number, gameContribution: number): number {
    return (wagerAmount * gameContribution) / 100
  }
}