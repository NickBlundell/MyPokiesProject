'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface Transaction {
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

interface TransactionsClientProps {
  transactions: Transaction[]
  count: number
  page: number
  totalPages: number
  currentType: string
  currentRange: string
  currentSearch: string
}

export default function TransactionsClient({
  transactions,
  count,
  page,
  totalPages,
  currentType,
  currentRange,
  currentSearch
}: TransactionsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(currentSearch)

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams('search', searchQuery)
  }

  const getTypeIcon = (type: string, subtype: string | null) => {
    if (type === 'credit') {
      if (subtype === 'deposit') return <ArrowDownLeft className="w-4 h-4 text-green-600" />
      if (subtype === 'win') return <TrendingUp className="w-4 h-4 text-green-600" />
      if (subtype === 'bonus') return <DollarSign className="w-4 h-4 text-purple-600" />
      if (subtype === 'refund') return <ArrowDownLeft className="w-4 h-4 text-blue-600" />
    }
    if (type === 'debit') {
      if (subtype === 'withdrawal') return <ArrowUpRight className="w-4 h-4 text-red-600" />
      if (subtype === 'bet') return <TrendingDown className="w-4 h-4 text-orange-600" />
    }
    return <DollarSign className="w-4 h-4 text-gray-600" />
  }

  const getStatusBadge = (status: string | null) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] ||
                  { color: 'bg-gray-100 text-gray-800', icon: Clock }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </form>
          <select
            value={currentType}
            onChange={(e) => updateParams('type', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="bet">Bets</option>
            <option value="win">Wins</option>
            <option value="bonus">Bonuses</option>
            <option value="refund">Refunds</option>
          </select>
          <div className="flex bg-white border border-gray-300 rounded-lg">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => updateParams('range', range)}
                className={`px-4 py-2 text-sm font-medium ${
                  currentRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                } first:rounded-l-lg last:rounded-r-lg`}
              >
                {range === '24h' ? 'Today' :
                 range === '7d' ? '7 Days' :
                 range === '30d' ? '30 Days' :
                 '90 Days'}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No transactions found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.id.slice(0, 8).toUpperCase()}
                        </p>
                        {transaction.reference_id && (
                          <p className="text-xs text-gray-500">{transaction.reference_id}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {transaction.user?.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {transaction.user?.external_user_id || transaction.user_id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type, transaction.subtype)}
                        <span className="text-sm capitalize text-gray-900">
                          {transaction.subtype || transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm font-semibold ${
                        transaction.type === 'credit'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        ${Number(transaction.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{transaction.currency || 'USD'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.payment_method || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.user_balances?.balance !== undefined
                        ? `$${Number(transaction.user_balances.balance).toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * 20, count)}</span> of{' '}
              <span className="font-medium">{count}</span> results
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({
                    ...Object.fromEntries(searchParams),
                    page: (page - 1).toString()
                  }).toString()}`}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Link
                    key={pageNum}
                    href={`?${new URLSearchParams({
                      ...Object.fromEntries(searchParams),
                      page: pageNum.toString()
                    }).toString()}`}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      page === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              })}

              {totalPages > 5 && <span className="px-2">...</span>}

              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({
                    ...Object.fromEntries(searchParams),
                    page: (page + 1).toString()
                  }).toString()}`}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}