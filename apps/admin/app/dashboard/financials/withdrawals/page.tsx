import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import {
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import WithdrawalsClient from './WithdrawalsClient'

export interface WithdrawalTransaction {
  id: string
  user_id: string
  type: string
  subtype: string | null
  amount: number
  currency: string
  status: string | null
  reference_id: string | null
  payment_method: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  user?: {
    external_user_id?: string
    email?: string
    kyc_status?: string
  }
  user_balances?: {
    balance?: number
  }[]
}

async function getWithdrawals(
  searchParams: {
    status?: string
    search?: string
    page?: string
  }
) {
  const supabase = await createAdminClient()

  // Build query for withdrawals
  let query = supabase
    .from('transactions')
    .select(`
      *,
      user:users!user_id(
        external_user_id,
        email,
        kyc_status
      ),
      user_balances!user_id(
        balance,
        currency
      )
    `, { count: 'exact' })
    .eq('type', 'debit')
    .eq('subtype', 'withdrawal')
    .order('created_at', { ascending: false })

  // Apply status filter
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  // Apply search filter
  if (searchParams.search) {
    query = query.or(`reference_id.ilike.%${searchParams.search}%`)
  }

  // Pagination
  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data: withdrawals, error, count } = await query

  if (error) {
    logger.error('Error fetching withdrawals', error, {
      function: 'getWithdrawals',
      page,
      status: searchParams.status,
    })
    return { withdrawals: [], count: 0, stats: null, page, limit }
  }

  // Calculate stats
  const { data: statsData } = await supabase
    .from('transactions')
    .select('status, amount, created_at')
    .eq('type', 'debit')
    .eq('subtype', 'withdrawal')

  const stats = {
    pendingCount: 0,
    processingCount: 0,
    totalPending: 0,
    completedCount30d: 0,
    avgProcessingTime: 0
  }

  if (statsData) {
    stats.pendingCount = statsData.filter(t => t.status === 'pending').length
    stats.processingCount = statsData.filter(t => t.status === 'processing').length
    stats.totalPending = statsData
      .filter(t => t.status === 'pending' || t.status === 'processing')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Count completed withdrawals in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    stats.completedCount30d = statsData.filter(t =>
      t.status === 'completed' &&
      new Date(t.created_at as string) >= thirtyDaysAgo
    ).length
  }

  // Get total withdrawn amounts per user
  const userWithdrawals = new Map<string, number>()
  if (withdrawals) {
    for (const w of withdrawals) {
      const userId = w.user_id
      const { data: userTotal } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'debit')
        .eq('subtype', 'withdrawal')
        .eq('status', 'completed')

      if (userTotal) {
        const total = userTotal.reduce((sum, t) => sum + Number(t.amount), 0)
        userWithdrawals.set(userId, total)
      }
    }
  }

  // Enhance withdrawals with total withdrawn
  const enhancedWithdrawals = withdrawals?.map(w => ({
    ...w,
    totalWithdrawn: userWithdrawals.get(w.user_id) || 0
  })) || []

  return {
    withdrawals: enhancedWithdrawals,
    count: count || 0,
    stats,
    page,
    limit
  }
}

export default async function WithdrawalsPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const { withdrawals, count, stats, page, limit } = await getWithdrawals(params)
  const totalPages = Math.ceil(count / limit)

  // Check for high-value withdrawals
  const highValueWithdrawals = withdrawals.filter(
    w => Number(w.amount) >= 5000 && w.status === 'pending'
  )

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-gray-600 mt-2">Process and manage player withdrawal requests</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.pendingCount : 0}
          </p>
          <p className="text-sm text-gray-600">Pending Review</p>
          {stats && stats.pendingCount > 0 && (
            <p className="text-xs text-orange-600 mt-1">Requires action</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <ArrowUpRight className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.processingCount : 0}
          </p>
          <p className="text-sm text-gray-600">Processing</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats ? (stats.totalPending / 1000).toFixed(1) : '0'}K
          </p>
          <p className="text-sm text-gray-600">Total Pending</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.completedCount30d : 0}
          </p>
          <p className="text-sm text-gray-600">Completed (30d)</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">—</p>
          <p className="text-sm text-gray-600">Avg. Processing</p>
        </div>
      </div>

      {/* Priority Alert */}
      {highValueWithdrawals.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-900">
                {highValueWithdrawals.length} High-Value Withdrawals Pending
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Withdrawals over $5,000 require manual review. Review them promptly to maintain player satisfaction.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Client Component for Filters and Table */}
      <WithdrawalsClient
        withdrawals={withdrawals}
        count={count}
        page={page}
        totalPages={totalPages}
        currentStatus={params.status || 'all'}
        currentSearch={params.search || ''}
      />
    </div>
  )
}