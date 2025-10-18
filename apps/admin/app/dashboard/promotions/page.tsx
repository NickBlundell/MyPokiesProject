import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import PromotionsClient from './PromotionsClient'

export interface TriggerConditions {
  min_deposit?: number
  max_deposit?: number
  game_types?: string[]
  min_wagering?: number
  user_status?: string
  days_since_registration?: number
  [key: string]: unknown
}

export interface Promotion {
  id: string
  name: string
  description: string | null
  bonus_type: string
  bonus_amount: number | null
  match_percentage: number | null
  min_deposit: number | null
  max_bonus: number | null
  free_spins_count: number | null
  free_spins_game: string | null
  cashback_percentage: number | null
  wagering_multiplier: number
  max_cashout: number | null
  assignment_behavior: string
  claim_frequency: string
  max_claims_per_user: number | null
  trigger_type: string
  trigger_conditions: TriggerConditions
  valid_from: string
  valid_until: string | null
  active: boolean
  terms: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Targeting
  is_public: boolean
  vip_tiers: string[] | null
  segment_ids: string[] | null
  specific_user_ids: string[] | null
  // Computed fields
  times_triggered?: number
  targeting?: string[]
}

export interface PromotionStats {
  totalPromotions: number
  activePromotions: number
  totalClaims: number
  claimsToday: number
}

export interface TriggeredPromotionData {
  promotion_id: string
  triggered_at: string
  claimed_at: string | null
  status: string
}

async function getPromotionTemplates() {
  const supabase = await createAdminClient()

  try {
    // Fetch all promotion templates
    const { data: promotions, error: promotionsError } = await supabase
      .from('promotion_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (promotionsError) {
      logger.error('Error fetching promotions', promotionsError, {
        function: 'getPromotions',
      })
      return { promotions: [], stats: getDefaultStats() }
    }

    // Fetch triggered promotions data for stats
    const { data: triggered } = await supabase
      .from('triggered_promotions')
      .select('promotion_id, triggered_at, claimed_at, status')

    // Calculate stats
    const stats = calculateStats(promotions || [], triggered || [])

    // Enhance promotions with triggered counts and targeting display
    const enhancedPromotions = (promotions || []).map(promo => {
      const promoTriggered = triggered?.filter(t => t.promotion_id === promo.id) || []

      // Build targeting display from columns
      const targetingDisplay: string[] = []

      if (promo.is_public) {
        targetingDisplay.push('Public')
      }

      if (promo.vip_tiers && promo.vip_tiers.length > 0) {
        targetingDisplay.push(...promo.vip_tiers.map((tier: string) => `VIP: ${tier}`))
      }

      if (promo.segment_ids && promo.segment_ids.length > 0) {
        targetingDisplay.push(`${promo.segment_ids.length} Segment${promo.segment_ids.length > 1 ? 's' : ''}`)
      }

      if (promo.specific_user_ids && promo.specific_user_ids.length > 0) {
        targetingDisplay.push(`${promo.specific_user_ids.length} User${promo.specific_user_ids.length > 1 ? 's' : ''}`)
      }

      if (targetingDisplay.length === 0) {
        targetingDisplay.push('Not set')
      }

      return {
        ...promo,
        times_triggered: promoTriggered.length,
        targeting: targetingDisplay
      }
    })

    return { promotions: enhancedPromotions, stats }
  } catch (error) {
    logger.error('Unexpected error in getPromotions', error, {
      function: 'getPromotions',
    })
    return { promotions: [], stats: getDefaultStats() }
  }
}

function calculateStats(promotions: Promotion[], triggered: TriggeredPromotionData[]): PromotionStats {
  const activePromotions = promotions.filter(p => p.active).length

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const claimsToday = triggered.filter(t => t.claimed_at && new Date(t.claimed_at) >= today).length

  return {
    totalPromotions: promotions.length,
    activePromotions,
    totalClaims: triggered.filter(t => t.status === 'claimed').length,
    claimsToday
  }
}

function getDefaultStats(): PromotionStats {
  return {
    totalPromotions: 0,
    activePromotions: 0,
    totalClaims: 0,
    claimsToday: 0
  }
}

export default async function PromotionTemplatesPage() {
  const { promotions, stats } = await getPromotionTemplates()

  return <PromotionsClient promotions={promotions} stats={stats} />
}
