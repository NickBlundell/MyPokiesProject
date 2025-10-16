import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import Link from 'next/link'
import PlayersTableWithModal from '@/components/players-table-with-modal'
import {
  Search,
  Filter,
  Download,
  UserPlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export interface Player {
  id: string
  external_user_id: string
  email?: string
  auth_user_id?: string
  created_at: string
  updated_at: string
  balance?: number
  bonus_balance?: number
  total_deposits?: number
  total_withdrawals?: number
  loyalty_tier?: string
  vip_status?: string
  kyc_status?: string
  last_login?: string
  status: 'active' | 'suspended' | 'banned' | 'self_excluded'
}

async function getPlayers(
  page: number = 1,
  limit: number = 20,
  search?: string,
  _filters?: Record<string, unknown> // Prefix with underscore as it's not yet used
) {
  const supabase = await createAdminClient()
  const offset = (page - 1) * limit

  // Base query for players
  let query = supabase
    .from('users')
    .select(`
      *,
      user_balances (
        currency,
        balance,
        bonus_balance
      ),
      player_loyalty (
        current_tier_id,
        total_points_earned,
        available_points,
        loyalty_tiers (
          tier_name
        )
      )
    `, { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  // Apply search filter
  if (search) {
    query = query.or(`email.ilike.%${search}%,external_user_id.ilike.%${search}%`)
  }

  const { data: players, error, count } = await query

  if (error) {
    logger.error('Error fetching players', error, {
      function: 'getPlayers',
      page,
      limit,
      search,
    })
    return { players: [], total: 0, page, limit }
  }

  // Transform the data to include calculated fields
  const transformedPlayers = await Promise.all((players || []).map(async (player: Record<string, unknown>) => {
    // Get aggregated transaction data
    const { data: transactionStats } = await supabase
      .from('transactions')
      .select('type, subtype, amount')
      .eq('user_id', player.id as string)

    const deposits = transactionStats?.filter(t => t.type === 'credit' && t.subtype === 'deposit')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0

    const withdrawals = transactionStats?.filter(t => t.type === 'debit' && t.subtype === 'withdrawal')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0

    // Get USD balance (primary currency)
    const usdBalance = (player.user_balances as Array<Record<string, unknown>>)?.find((b: Record<string, unknown>) => b.currency === 'USD')

    const playerLoyalty = (player.player_loyalty as Array<Record<string, unknown>>)?.[0]
    const loyaltyTiers = playerLoyalty?.loyalty_tiers as Array<Record<string, unknown>> | undefined

    return {
      id: player.id as string,
      external_user_id: player.external_user_id as string,
      email: player.email as string | undefined,
      auth_user_id: player.auth_user_id as string | undefined,
      created_at: player.created_at as string,
      updated_at: player.updated_at as string,
      balance: (usdBalance?.balance as number) || 0,
      bonus_balance: (usdBalance?.bonus_balance as number) || 0,
      total_deposits: deposits,
      total_withdrawals: withdrawals,
      loyalty_tier: (loyaltyTiers?.[0]?.tier_name as string) || 'Bronze',
      vip_status: ((playerLoyalty?.current_tier_id as number) || 0) >= 4 ? 'VIP' : 'Regular',
      kyc_status: player.kyc_status as string | undefined,
      last_login: player.last_sign_in_at as string | undefined,
      status: 'active' as const // Default status, you'd check actual status from your status tracking
    }
  }))

  return {
    players: transformedPlayers,
    total: count || 0,
    page,
    limit
  }
}

// Client component for interactive features
function PlayerSearch() {
  return (
    <div className="flex gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by email or player ID..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
        <Filter className="w-4 h-4" />
        <span>Filters</span>
      </button>
      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>
      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
        <UserPlus className="w-4 h-4" />
        <span>Add Player</span>
      </button>
    </div>
  )
}


export default async function PlayersPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const search = params.search
  const { players, total, limit } = await getPlayers(page, 20, search)
  const totalPages = Math.ceil(total / limit)

  // Calculate additional stats
  const supabase = await createAdminClient()

  let activeToday = 0
  let vipPlayers = 0
  let pendingKYC = 0

  try {
    // Get active players today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: activeTodayCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', today.toISOString())

    activeToday = activeTodayCount || 0

    // Get VIP players
    const { data: allPlayers } = await supabase
      .from('users')
      .select(`
        id,
        player_loyalty (
          total_points_earned
        )
      `)

    if (allPlayers) {
      vipPlayers = allPlayers.filter((p: Record<string, unknown>) => {
        const points = ((p.player_loyalty as Array<Record<string, unknown>>)?.[0]?.total_points_earned as number) || 0
        return points >= 2500 // Gold tier or higher
      }).length
    }

    // Get pending KYC
    const possibleKYCTables = ['kyc_verifications', 'kyc_submissions', 'user_verifications']

    for (const tableName of possibleKYCTables) {
      try {
        const { count: pendingCount } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (pendingCount !== null) {
          pendingKYC = pendingCount
          break
        }
      } catch {
        continue
      }
    }
  } catch (error) {
    logger.error('Error fetching player stats', error, {
      function: 'PlayersPage',
    })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Player Management</h1>
        <p className="text-gray-600 mt-2">Manage and monitor all registered players</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Players</p>
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Active Today</p>
          <p className="text-2xl font-bold text-green-600">{activeToday.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">VIP Players</p>
          <p className="text-2xl font-bold text-purple-600">{vipPlayers.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Pending KYC</p>
          <p className="text-2xl font-bold text-orange-600">{pendingKYC.toLocaleString()}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <PlayerSearch />
      </div>

      {/* Players Table with Modal */}
      <div>
        <PlayersTableWithModal players={players} />

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} players
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`?page=${Math.max(1, page - 1)}${search ? `&search=${search}` : ''}`}
              className={`px-3 py-1 border rounded ${
                page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>

            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Link
                    key={pageNum}
                    href={`?page=${pageNum}${search ? `&search=${search}` : ''}`}
                    className={`px-3 py-1 border rounded ${
                      page === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              })}
            </div>

            <Link
              href={`?page=${Math.min(totalPages, page + 1)}${search ? `&search=${search}` : ''}`}
              className={`px-3 py-1 border rounded ${
                page === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}