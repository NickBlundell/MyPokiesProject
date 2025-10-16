import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import {
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import ActiveBonusesClient from './ActiveBonusesClient'

export interface ActiveBonus {
  id: string
  user_id: string
  bonus_offer_id: string
  bonus_amount: number
  wagering_completed: number
  wagering_requirement_total: number
  status: string
  activated_at: string
  expires_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  user?: {
    external_user_id?: string
    email?: string
  }
  bonus?: {
    bonus_code: string
    bonus_name: string
    bonus_type: string
  }
}

async function getActiveBonuses(
  searchParams: {
    status?: string
    search?: string
    page?: string
  }
) {
  const supabase = await createAdminClient()

  // Build query for player bonuses with user and bonus details
  let query = supabase
    .from('player_bonuses')
    .select(`
      *,
      user:users!user_id(
        external_user_id,
        email
      ),
      bonus:bonus_offers!bonus_offer_id(
        bonus_code,
        bonus_name,
        bonus_type
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply status filter
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  // Apply search filter
  if (searchParams.search) {
    // This would ideally search across joined tables
    query = query.or(`status.ilike.%${searchParams.search}%`)
  }

  // Pagination
  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data: activeBonuses, error, count } = await query

  if (error) {
    logger.error('Error fetching active bonuses', error, {
      function: 'getActiveBonuses',
      page,
      status: searchParams.status,
    })
    return { activeBonuses: [], count: 0, stats: null, page, limit }
  }

  // Calculate stats
  const { data: allActiveBonuses } = await supabase
    .from('player_bonuses')
    .select('status, bonus_amount, wagering_completed, wagering_requirement_total, expires_at')

  const stats = {
    activeCount: 0,
    pendingCount: 0,
    totalValue: 0,
    avgProgress: 0,
    expiringSoon: 0
  }

  if (allActiveBonuses) {
    stats.activeCount = allActiveBonuses.filter(b => b.status === 'active').length
    stats.pendingCount = allActiveBonuses.filter(b => b.status === 'pending').length

    // Calculate total value of active bonuses
    stats.totalValue = allActiveBonuses
      .filter(b => b.status === 'active' || b.status === 'pending')
      .reduce((sum, b) => sum + Number(b.bonus_amount || 0), 0)

    // Calculate average wagering progress
    const activeBonusesWithWagering = allActiveBonuses.filter(b =>
      b.status === 'active' && b.wagering_requirement_total > 0
    )
    if (activeBonusesWithWagering.length > 0) {
      const totalProgress = activeBonusesWithWagering.reduce((sum, b) => {
        const progress = (b.wagering_completed / b.wagering_requirement_total) * 100
        return sum + progress
      }, 0)
      stats.avgProgress = totalProgress / activeBonusesWithWagering.length
    }

    // Count bonuses expiring within 24 hours
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    stats.expiringSoon = allActiveBonuses.filter(b => {
      if (!b.expires_at) return false
      const expiryDate = new Date(b.expires_at)
      return expiryDate <= tomorrow && expiryDate > now && b.status === 'active'
    }).length
  }

  // Calculate wagering progress for each bonus
  const enhancedBonuses = activeBonuses?.map(bonus => ({
    ...bonus,
    wageringProgress: bonus.wagering_requirement_total > 0
      ? Math.round((bonus.wagering_completed / bonus.wagering_requirement_total) * 100)
      : 0
  })) || []

  return {
    activeBonuses: enhancedBonuses,
    count: count || 0,
    stats,
    page,
    limit
  }
}

export default async function ActiveBonusesPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const { activeBonuses, count, stats, page, limit } = await getActiveBonuses(params)
  const totalPages = Math.ceil(count / limit)

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Active Bonuses</h1>
          <p className="text-gray-600 mt-2">Monitor and manage player&apos;s active bonuses</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.activeCount : 0}
          </p>
          <p className="text-sm text-gray-600">Active Bonuses</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.pendingCount : 0}
          </p>
          <p className="text-sm text-gray-600">Pending</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats ? (stats.totalValue / 1000).toFixed(1) : '0'}K
          </p>
          <p className="text-sm text-gray-600">Total Value</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.avgProgress.toFixed(0) : 0}%
          </p>
          <p className="text-sm text-gray-600">Avg. Progress</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.expiringSoon : 0}
          </p>
          <p className="text-sm text-gray-600">Expiring Soon</p>
        </div>
      </div>

      {/* Client Component for Filters and Table */}
      <ActiveBonusesClient
        activeBonuses={activeBonuses}
        count={count}
        page={page}
        totalPages={totalPages}
        currentStatus={params.status || 'all'}
        currentSearch={params.search || ''}
        expiringSoonCount={stats?.expiringSoon || 0}
      />
    </div>
  )
}