'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  Building,
  CreditCard,
  Wallet,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Check,
  X
} from 'lucide-react'

interface WithdrawalTransaction {
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
  totalWithdrawn: number
  user?: {
    external_user_id?: string
    email?: string
    kyc_status?: string
  }
  user_balances?: {
    balance?: number
    currency?: string
  }[]
}

interface WithdrawalsClientProps {
  withdrawals: WithdrawalTransaction[]
  count: number
  page: number
  totalPages: number
  currentStatus: string
  currentSearch: string
}

export default function WithdrawalsClient({
  withdrawals,
  count,
  page,
  totalPages,
  currentStatus,
  currentSearch
}: WithdrawalsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(currentSearch)

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
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

  const getStatusBadge = (status: string | null) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      reviewing: { color: 'bg-blue-100 text-blue-800', icon: Eye },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      processing: { color: 'bg-purple-100 text-purple-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle }
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

  const getMethodIcon = (method: string | null) => {
    if (!method) return <DollarSign className="w-4 h-4" />

    const methodLower = method.toLowerCase()
    if (methodLower.includes('bank')) return <Building className="w-4 h-4" />
    if (methodLower.includes('card')) return <CreditCard className="w-4 h-4" />
    if (methodLower.includes('crypto') || methodLower.includes('btc') || methodLower.includes('eth'))
      return <Wallet className="w-4 h-4" />
    if (methodLower.includes('wallet') || methodLower.includes('paypal'))
      return <DollarSign className="w-4 h-4" />

    return <DollarSign className="w-4 h-4" />
  }

  // Get USD balance from user balances
  const getUsdBalance = (balances?: { balance?: number, currency?: string }[]) => {
    if (!balances || balances.length === 0) return 0
    const usdBalance = balances.find(b => b.currency === 'USD')
    return usdBalance?.balance || balances[0]?.balance || 0
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
            value={currentStatus}
            onChange={(e) => updateParams('status', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
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
                  Verification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No withdrawal requests found</p>
                  </td>
                </tr>
              ) : (
                withdrawals.map((withdrawal) => {
                  const notes = withdrawal.metadata?.notes as string | undefined
                  return (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {withdrawal.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {withdrawal.user?.external_user_id || withdrawal.user_id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-gray-500">{withdrawal.user?.email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          ${Number(withdrawal.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{withdrawal.currency || 'USD'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(withdrawal.payment_method)}
                          <div>
                            <p className="text-sm text-gray-900 capitalize">
                              {withdrawal.payment_method?.replace('_', ' ') || 'Unknown'}
                            </p>
                            {withdrawal.reference_id && (
                              <p className="text-xs text-gray-500">{withdrawal.reference_id}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(withdrawal.status)}
                        {notes && (
                          <p className="text-xs text-gray-500 mt-1">{notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {withdrawal.user?.kyc_status === 'verified' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            KYC Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <XCircle className="w-3 h-3" />
                            KYC Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">
                          Balance: ${getUsdBalance(withdrawal.user_balances).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Total Withdrawn: ${withdrawal.totalWithdrawn.toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {withdrawal.status === 'pending' && (
                          <>
                            <button
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })
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