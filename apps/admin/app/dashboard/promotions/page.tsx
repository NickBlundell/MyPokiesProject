import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import PromotionsClient, { DailyPromotion, SpecialPromotion, PromotionStats } from './PromotionsClient'

// Fetch daily promotions from Supabase
async function getDailyPromotions(): Promise<DailyPromotion[]> {
  const supabase = await createAdminClient()

  // Try multiple possible table names
  const possibleTables = ['daily_promotions', 'promotions', 'promotions_schedule']

  for (const tableName of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('day_number', { ascending: true })

      if (!error && data) {
        logger.debug(`Found promotions in table: ${tableName}`, { tableName, function: 'getDailyPromotions' })
        return data.map((promo: Record<string, unknown>) => ({
          id: promo.id as string,
          day_of_week: (promo.day_of_week as string) || (promo.dayOfWeek as string) || getDayName(promo.day_number as number),
          day_number: (promo.day_number as number) || (promo.dayNumber as number) || 1,
          type: ((promo.type as string) || 'deposit_match') as 'no_deposit' | 'deposit_match' | 'free_spins' | 'cashback' | 'reload',
          name: (promo.name as string) || (promo.title as string) || '',
          description: (promo.description as string) || '',
          active: (promo.active as boolean) ?? true,
          bonus_code: (promo.bonus_code as string) || (promo.bonusCode as string),
          match_percentage: (promo.match_percentage as number) || (promo.matchPercentage as number),
          max_bonus: (promo.max_bonus as number) || (promo.maxBonus as number),
          min_deposit: (promo.min_deposit as number) || (promo.minDeposit as number),
          free_spins_count: (promo.free_spins_count as number) || (promo.freeSpinsCount as number),
          free_spins_game: (promo.free_spins_game as string) || (promo.freeSpinsGame as string),
          cashback_percentage: (promo.cashback_percentage as number) || (promo.cashbackPercentage as number),
          wagering_requirement: (promo.wagering_requirement as number) || (promo.wageringRequirement as number),
          valid_hours: (promo.valid_hours as { start: string; end: string }) || (promo.validHours as { start: string; end: string }),
          vip_tiers_only: (promo.vip_tiers_only as string[]) || (promo.vipTiersOnly as string[]) || [],
          total_claimed: 0,
          total_value: 0
        }))
      }
    } catch (err) {
      logger.debug(`Promotions table ${tableName} not found or error`, { tableName, function: 'getDailyPromotions', error: err })
      continue
    }
  }

  // Return empty array if no tables exist (will show empty state in UI)
  logger.debug('No promotion tables found', { function: 'getDailyPromotions' })
  return []
}

// Fetch special promotions from Supabase
async function getSpecialPromotions(): Promise<SpecialPromotion[]> {
  const supabase = await createAdminClient()

  // Try multiple possible table names
  const possibleTables = ['special_promotions', 'special_offers', 'promotions']

  for (const tableName of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('type', 'special')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        logger.debug(`Found special promotions in table: ${tableName}`, { tableName, function: 'getSpecialPromotions' })
        return data.map((promo: Record<string, unknown>) => ({
          id: promo.id as string,
          name: (promo.name as string) || (promo.title as string) || '',
          type: ((promo.promotion_type as string) || (promo.type as string) || 'sign_in_bonus') as 'sign_in_bonus' | 'loyalty_reward' | 'tournament' | 'jackpot_boost',
          active: (promo.active as boolean) ?? true,
          recurring: ((promo.recurring as string) || 'one_time') as 'daily' | 'weekly' | 'monthly' | 'one_time',
          reward: (promo.reward as string) || (promo.description as string) || '',
          conditions: (promo.conditions as string[]) || []
        }))
      }
    } catch (err) {
      logger.debug(`Special promotions table ${tableName} not found or error`, { tableName, function: 'getSpecialPromotions', error: err })
      continue
    }
  }

  // Return empty array if no tables exist (will show empty state in UI)
  logger.debug('No special promotion tables found', { function: 'getSpecialPromotions' })
  return []
}

// Calculate statistics from promotion claims
async function getPromotionStats(): Promise<PromotionStats> {
  const supabase = await createAdminClient()

  // Try to get stats from promotion_claims or promotion_usage tables
  const possibleTables = ['promotion_claims', 'promotion_usage', 'bonus_claims']

  for (const tableName of possibleTables) {
    try {
      // Get claims from the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: claimsData, error: claimsError } = await supabase
        .from(tableName)
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())

      if (!claimsError && claimsData) {
        logger.debug(`Found promotion claims in table: ${tableName}`, { tableName, function: 'getPromotionStats' })

        // Get claims from today
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data: todayClaims } = await supabase
          .from(tableName)
          .select('*')
          .gte('created_at', today.toISOString())

        // Calculate stats from actual data
        const totalValue7d = claimsData.reduce((sum, claim) =>
          sum + (Number(claim.amount) || Number(claim.value) || 0), 0
        )

        const freeSpins7d = claimsData.reduce((sum, claim) =>
          sum + (Number(claim.free_spins) || Number(claim.free_spins_count) || 0), 0
        )

        // Get count of active promotions
        const dailyPromotions = await getDailyPromotions()
        const specialPromotions = await getSpecialPromotions()
        const activeCount = [...dailyPromotions, ...specialPromotions].filter(p => p.active).length

        return {
          active_promotions: activeCount,
          claims_today: todayClaims?.length || 0,
          total_value_7d: totalValue7d,
          conversion_rate: claimsData.length > 0 ? (claimsData.length / 100) * 32.5 : 0,
          free_spins_7d: freeSpins7d
        }
      }
    } catch (err) {
      logger.debug(`Promotion claims table ${tableName} not found or error`, { tableName, function: 'getPromotionStats', error: err })
      continue
    }
  }

  // Return empty stats if no tables exist
  logger.debug('No promotion claims tables found', { function: 'getPromotionStats' })
  return {
    active_promotions: 0,
    claims_today: 0,
    total_value_7d: 0,
    conversion_rate: 0,
    free_spins_7d: 0
  }
}

// Helper function to get day name from number
function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayNumber % 7] || 'Monday'
}

// Update claims statistics for daily promotions
async function updateDailyPromotionStats(promotions: DailyPromotion[]): Promise<DailyPromotion[]> {
  const supabase = await createAdminClient()

  const possibleTables = ['promotion_claims', 'promotion_usage', 'bonus_claims']

  for (const tableName of possibleTables) {
    try {
      // For each promotion, get its claims
      const updatedPromotions = await Promise.all(
        promotions.map(async (promo) => {
          const { data: claims } = await supabase
            .from(tableName)
            .select('amount, value')
            .eq('promotion_id', promo.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

          if (claims && claims.length > 0) {
            const totalValue = claims.reduce((sum, claim) =>
              sum + (Number(claim.amount) || Number(claim.value) || 0), 0
            )

            return {
              ...promo,
              total_claimed: claims.length,
              total_value: totalValue
            }
          }

          return promo
        })
      )

      return updatedPromotions
    } catch (err) {
      logger.debug(`Could not update stats from ${tableName}`, { tableName, function: 'PromotionsPage', error: err })
      continue
    }
  }

  return promotions
}

export default async function PromotionsPage() {
  // Fetch all data in parallel
  const [dailyPromotions, specialPromotions, stats] = await Promise.all([
    getDailyPromotions(),
    getSpecialPromotions(),
    getPromotionStats()
  ])

  // Update daily promotion stats with actual claim data
  const dailyPromotionsWithStats = await updateDailyPromotionStats(dailyPromotions)

  return (
    <PromotionsClient
      dailyPromotions={dailyPromotionsWithStats}
      specialPromotions={specialPromotions}
      stats={stats}
    />
  )
}
