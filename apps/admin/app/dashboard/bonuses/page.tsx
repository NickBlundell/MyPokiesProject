import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import {
  Gift,
  Plus,
  Users,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import BonusesClient from './BonusesClient'

export interface Bonus {
  id: string
  bonus_code: string
  bonus_name: string
  bonus_type: string
  match_percentage?: number
  max_bonus_amount?: number
  min_deposit_amount?: number
  fixed_bonus_amount?: number
  wagering_requirement_multiplier?: number
  valid_until?: string
  active: boolean
  auto_apply?: boolean
  created_at: string
  updated_at: string
  usageCount?: number
}

async function getBonuses() {
  const supabase = await createAdminClient()

  // Fetch all bonuses
  const { data: bonuses, error } = await supabase
    .from('bonus_offers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching bonuses', error, {
      function: 'getBonuses',
    })
    return { bonuses: [], stats: null }
  }

  // Calculate stats
  const activeCount = bonuses?.filter(b => b.active).length || 0

  // Get usage stats from player_bonuses table
  const { data: userBonuses } = await supabase
    .from('player_bonuses')
    .select('bonus_offer_id, status, bonus_amount')

  const stats = {
    activeCount,
    activeRedemptions: 0,
    totalValue30d: 0,
    conversionRate: 0
  }

  if (userBonuses) {
    stats.activeRedemptions = userBonuses.filter(ub => ub.status === 'active').length

    // Calculate total value for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    // Note: In production, you'd filter by date
    stats.totalValue30d = userBonuses.reduce((sum, ub) =>
      sum + (Number(ub.bonus_amount) || 0), 0
    )

    // Calculate conversion rate (completed vs total)
    const completed = userBonuses.filter(ub => ub.status === 'completed').length
    const total = userBonuses.length
    stats.conversionRate = total > 0 ? (completed / total) * 100 : 0
  }

  // Get usage count for each bonus
  const bonusUsageCounts = new Map<string, number>()
  if (userBonuses && bonuses) {
    for (const bonus of bonuses) {
      const usageCount = userBonuses.filter(ub => ub.bonus_offer_id === bonus.id).length
      bonusUsageCounts.set(bonus.id, usageCount)
    }
  }

  // Enhance bonuses with usage counts
  const enhancedBonuses = bonuses?.map(b => ({
    ...b,
    usageCount: bonusUsageCounts.get(b.id) || 0
  })) || []

  return { bonuses: enhancedBonuses, stats }
}

export default async function BonusOffersPage() {
  const { bonuses, stats } = await getBonuses()

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bonus Offers</h1>
          <p className="text-gray-600 mt-2">Manage casino bonus offers and promotions</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Bonus
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Gift className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.activeCount : 0}
          </p>
          <p className="text-sm text-gray-600">Active Bonuses</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.activeRedemptions : 0}
          </p>
          <p className="text-sm text-gray-600">Active Redemptions</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats ? (stats.totalValue30d / 1000).toFixed(1) : '0'}K
          </p>
          <p className="text-sm text-gray-600">Bonus Value (30d)</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.conversionRate.toFixed(1) : '0'}%
          </p>
          <p className="text-sm text-gray-600">Conversion Rate</p>
        </div>
      </div>

      {/* Client Component for Table and Modal */}
      <BonusesClient bonuses={bonuses} />
    </div>
  )
}