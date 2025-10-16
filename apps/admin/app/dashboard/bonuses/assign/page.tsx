import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import AssignBonusClient from './AssignBonusClient'

interface BonusOffer {
  id: string
  name: string
  type: 'deposit_match' | 'fixed' | 'free_spins' | 'cashback' | 'custom'
  value: number
  max_amount: number
  wagering: number
  code: string
  active: boolean
}

interface RecentAssignment {
  id: string
  player_email: string
  player_username: string
  bonus_name: string
  amount: number
  created_at: string
  assigned_by: string
}

async function getBonusData(): Promise<{
  bonusOffers: BonusOffer[]
  recentAssignments: RecentAssignment[]
}> {
  const supabase = await createAdminClient()

  let bonusOffers: BonusOffer[] = []
  let recentAssignments: RecentAssignment[] = []

  // Try to fetch bonus offers/templates
  const possibleBonusTables = ['bonus_offers', 'bonus_templates', 'bonuses', 'bonus_types']

  for (const tableName of possibleBonusTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        logger.debug(`Found bonus offers in table: ${tableName}`, { tableName, count: data.length })

        bonusOffers = data.map((bonus: Record<string, unknown>) => ({
          id: bonus.id as string,
          name: (bonus.name as string) || (bonus.title as string) || (bonus.bonus_name as string) || 'Bonus',
          type: ((bonus.type as string) || (bonus.bonus_type as string) || 'fixed') as 'deposit_match' | 'fixed' | 'free_spins' | 'cashback' | 'custom',
          value: Number(bonus.value || bonus.match_percentage || bonus.amount || 0),
          max_amount: Number(bonus.max_amount || bonus.maximum_bonus || bonus.max_bonus || 0),
          wagering: Number(bonus.wagering || bonus.wagering_requirement || bonus.rollover || 30),
          code: (bonus.code as string) || (bonus.bonus_code as string) || (bonus.promo_code as string) || '',
          active: (bonus.active as boolean) ?? true
        }))

        break
      }
    } catch (err) {
      logger.debug(`Bonus table ${tableName} not found or error`, { tableName, function: 'getBonusData', error: err })
      continue
    }
  }

  // Add a "Custom Bonus" option if bonuses were found
  if (bonusOffers.length > 0) {
    bonusOffers.push({
      id: 'custom',
      name: 'Custom Bonus',
      type: 'custom',
      value: 0,
      max_amount: 0,
      wagering: 30,
      code: 'CUSTOM',
      active: true
    })
  }

  // Try to fetch recent bonus assignments
  const possibleAssignmentTables = ['player_bonuses', 'bonus_assignments', 'bonus_claims']

  for (const tableName of possibleAssignmentTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          users!inner (
            id,
            email,
            external_user_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data && data.length > 0) {
        logger.debug(`Found recent assignments in table: ${tableName}`, { tableName, count: data.length })

        recentAssignments = data.map((assignment: Record<string, unknown>) => {
          const user = (assignment.users as Record<string, unknown>) || {}

          return {
            id: assignment.id as string,
            player_email: (user.email as string) || 'N/A',
            player_username: (user.external_user_id as string) || `Player ${(assignment.user_id as string)?.slice(0, 8)}`,
            bonus_name: (assignment.bonus_name as string) || (assignment.name as string) || 'Bonus',
            amount: Number(assignment.amount || assignment.bonus_amount || 0),
            created_at: assignment.created_at as string,
            assigned_by: (assignment.assigned_by as string) || (assignment.created_by as string) || 'Admin User'
          }
        })

        break
      }
    } catch (err) {
      logger.debug(`Assignment table ${tableName} not found or error`, { tableName, function: 'getBonusData', error: err })
      continue
    }
  }

  return {
    bonusOffers,
    recentAssignments
  }
}

export default async function AssignBonusPage() {
  const { bonusOffers, recentAssignments } = await getBonusData()

  return (
    <AssignBonusClient
      bonusOffers={bonusOffers}
      recentAssignments={recentAssignments}
    />
  )
}
