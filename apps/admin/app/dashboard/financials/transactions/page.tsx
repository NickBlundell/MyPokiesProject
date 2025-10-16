import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Download,
  AlertCircle,
  Clock
} from 'lucide-react'
import TransactionsClient from './TransactionsClient'

export interface Transaction {
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
  }
  user_balances?: {
    balance?: number
  }
}

async function getTransactions(
  searchParams: {
    type?: string
    range?: string
    search?: string
    page?: string
  }
) {
  const supabase = await createAdminClient()

  // Calculate date range
  const now = new Date()
  const startDate = new Date()

  switch(searchParams.range || '7d') {
    case '24h':
      startDate.setDate(now.getDate() - 1)
      break
    case '7d':
      startDate.setDate(now.getDate() - 7)
      break
    case '30d':
      startDate.setDate(now.getDate() - 30)
      break
    case '90d':
      startDate.setDate(now.getDate() - 90)
      break
  }

  // Build query
  let query = supabase
    .from('transactions')
    .select(`
      *,
      user:users!user_id(
        external_user_id,
        email
      ),
      user_balances!user_id(
        balance
      )
    `, { count: 'exact' })
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  // Apply type filter
  if (searchParams.type && searchParams.type !== 'all') {
    query = query.eq('subtype', searchParams.type)
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

  const { data: transactions, error, count } = await query

  if (error) {
    logger.error('Error fetching transactions', error, {
      function: 'getTransactions',
      page,
      type: searchParams.type,
      range: searchParams.range,
    })
    return { transactions: [], count: 0, stats: null, page, limit }
  }

  // Calculate stats for the same period
  const { data: statsData } = await supabase
    .from('transactions')
    .select('type, subtype, amount, status')
    .gte('created_at', startDate.toISOString())

  const stats = {
    deposits24h: 0,
    withdrawals24h: 0,
    netRevenue: 0,
    totalCount: count || 0,
    pendingCount: 0,
    failedCount: 0
  }

  if (statsData) {
    stats.deposits24h = statsData
      .filter(t => t.type === 'credit' && t.subtype === 'deposit')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    stats.withdrawals24h = statsData
      .filter(t => t.type === 'debit' && t.subtype === 'withdrawal')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    stats.netRevenue = stats.deposits24h - stats.withdrawals24h

    stats.pendingCount = statsData.filter(t => t.status === 'pending').length
    stats.failedCount = statsData.filter(t => t.status === 'failed').length
  }

  return {
    transactions: transactions || [],
    count: count || 0,
    stats,
    page,
    limit
  }
}

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: Promise<{
    type?: string
    range?: string
    search?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const { transactions, count, stats, page, limit } = await getTransactions(params)
  const totalPages = Math.ceil(count / limit)

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">Monitor all financial transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <ArrowDownLeft className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats ? (stats.deposits24h / 1000).toFixed(1) : '0'}K
          </p>
          <p className="text-sm text-gray-600">Deposits</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <ArrowUpRight className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats ? (stats.withdrawals24h / 1000).toFixed(1) : '0'}K
          </p>
          <p className="text-sm text-gray-600">Withdrawals</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats ? (stats.netRevenue / 1000).toFixed(1) : '0'}K
          </p>
          <p className="text-sm text-gray-600">Net Revenue</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.totalCount.toLocaleString() : '0'}
          </p>
          <p className="text-sm text-gray-600">Total</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.pendingCount : '0'}
          </p>
          <p className="text-sm text-gray-600">Pending</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? stats.failedCount : '0'}
          </p>
          <p className="text-sm text-gray-600">Failed</p>
        </div>
      </div>

      {/* Client Component for Filters and Table */}
      <TransactionsClient
        transactions={transactions}
        count={count}
        page={page}
        totalPages={totalPages}
        currentType={params.type || 'all'}
        currentRange={params.range || '7d'}
        currentSearch={params.search || ''}
      />
    </div>
  )
}