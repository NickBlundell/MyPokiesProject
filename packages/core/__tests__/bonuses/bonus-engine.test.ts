import { describe, it, expect, beforeEach } from 'vitest'
import { BonusEngine } from '../../src/bonuses/bonus-engine'
import type { BonusOffer, PlayerBonus } from '@mypokies/types'

describe('BonusEngine', () => {
  let bonusEngine: BonusEngine

  beforeEach(() => {
    bonusEngine = new BonusEngine()
  })

  describe('calculateWagering', () => {
    it('should calculate wagering requirements correctly', () => {
      const result = bonusEngine.calculateWagering(100, 30)
      expect(result).toBe(3000)
    })

    it('should handle zero multiplier', () => {
      const result = bonusEngine.calculateWagering(100, 0)
      expect(result).toBe(0)
    })

    it('should handle decimal multipliers', () => {
      const result = bonusEngine.calculateWagering(100, 2.5)
      expect(result).toBe(250)
    })
  })

  describe('validateClaim', () => {
    const mockBonus: BonusOffer = {
      id: '123',
      bonus_name: 'Test Bonus',
      bonus_type: 'deposit_match',
      active: true,
      wagering_requirement_multiplier: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should return valid for active bonus', () => {
      const result = bonusEngine.validateClaim('player-123', mockBonus)
      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should reject inactive bonus', () => {
      const inactiveBonus = { ...mockBonus, active: false }
      const result = bonusEngine.validateClaim('player-123', inactiveBonus)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Bonus is not active')
    })

    it('should reject expired bonus', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const expiredBonus = { ...mockBonus, valid_until: yesterday.toISOString() }
      const result = bonusEngine.validateClaim('player-123', expiredBonus)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Bonus has expired')
    })

    it('should validate minimum deposit requirement', () => {
      const bonusWithMinDeposit = { ...mockBonus, min_deposit_amount: '50' }
      const result = bonusEngine.validateClaim('player-123', bonusWithMinDeposit, 30)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Minimum deposit')
    })

    it('should accept valid deposit amount', () => {
      const bonusWithMinDeposit = { ...mockBonus, min_deposit_amount: '50' }
      const result = bonusEngine.validateClaim('player-123', bonusWithMinDeposit, 100)
      expect(result.valid).toBe(true)
    })
  })

  describe('calculateBonusAmount', () => {
    const mockOffer: BonusOffer = {
      id: '123',
      bonus_name: 'Test Bonus',
      bonus_type: 'deposit_match',
      active: true,
      wagering_requirement_multiplier: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should return fixed bonus amount when set', () => {
      const offerWithFixed = { ...mockOffer, fixed_bonus_amount: '100' }
      const result = bonusEngine.calculateBonusAmount(50, offerWithFixed)
      expect(result).toBe(100)
    })

    it('should calculate percentage-based bonus', () => {
      const offerWithPercentage = { ...mockOffer, match_percentage: '100' }
      const result = bonusEngine.calculateBonusAmount(50, offerWithPercentage)
      expect(result).toBe(50)
    })

    it('should apply max bonus limit', () => {
      const offerWithMax = {
        ...mockOffer,
        match_percentage: '100',
        max_bonus_amount: '50',
      }
      const result = bonusEngine.calculateBonusAmount(100, offerWithMax)
      expect(result).toBe(50)
    })

    it('should handle 50% match bonus', () => {
      const offerWith50Percent = { ...mockOffer, match_percentage: '50' }
      const result = bonusEngine.calculateBonusAmount(100, offerWith50Percent)
      expect(result).toBe(50)
    })

    it('should return 0 when no bonus amount specified', () => {
      const result = bonusEngine.calculateBonusAmount(100, mockOffer)
      expect(result).toBe(0)
    })
  })

  describe('calculateProgress', () => {
    it('should calculate progress percentage correctly', () => {
      const result = bonusEngine.calculateProgress(500, 1000)
      expect(result).toBe(50)
    })

    it('should return 100 when completed equals required', () => {
      const result = bonusEngine.calculateProgress(1000, 1000)
      expect(result).toBe(100)
    })

    it('should cap at 100 when over-wagered', () => {
      const result = bonusEngine.calculateProgress(1500, 1000)
      expect(result).toBe(100)
    })

    it('should return 100 for zero requirement', () => {
      const result = bonusEngine.calculateProgress(500, 0)
      expect(result).toBe(100)
    })
  })

  describe('isWageringComplete', () => {
    it('should return true when wagering is complete', () => {
      const mockPlayerBonus: PlayerBonus = {
        id: '123',
        user_id: 'user-123',
        bonus_offer_id: 'bonus-123',
        bonus_amount: '100',
        wagering_requirement_total: '3000',
        wagering_completed: '3000',
        status: 'active',
        claimed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const result = bonusEngine.isWageringComplete(mockPlayerBonus)
      expect(result).toBe(true)
    })

    it('should return false when wagering is incomplete', () => {
      const mockPlayerBonus: PlayerBonus = {
        id: '123',
        user_id: 'user-123',
        bonus_offer_id: 'bonus-123',
        bonus_amount: '100',
        wagering_requirement_total: '3000',
        wagering_completed: '1500',
        status: 'active',
        claimed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const result = bonusEngine.isWageringComplete(mockPlayerBonus)
      expect(result).toBe(false)
    })
  })

  describe('applyGameWeight', () => {
    it('should apply full contribution for slots', () => {
      const result = bonusEngine.applyGameWeight(100, 100)
      expect(result).toBe(100)
    })

    it('should apply partial contribution for table games', () => {
      const result = bonusEngine.applyGameWeight(100, 10)
      expect(result).toBe(10)
    })

    it('should handle zero contribution', () => {
      const result = bonusEngine.applyGameWeight(100, 0)
      expect(result).toBe(0)
    })

    it('should handle fractional contributions', () => {
      const result = bonusEngine.applyGameWeight(100, 25)
      expect(result).toBe(25)
    })
  })
})
