'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  Eye,
  Ban,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Gift
} from 'lucide-react'

interface ActiveBonus {
  id: string
  user_id: string
  bonus_offer_id: string
  bonus_amount: number
  wagering_completed: number
  wagering_requirement_total: number
  wageringProgress?: number
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

interface ActiveBonusesClientProps {
  activeBonuses: ActiveBonus[]
  count: number
  page: number
  totalPages: number
  currentStatus: string
  currentSearch: string
  expiringSoonCount: number
}

export default function ActiveBonusesClient({
  activeBonuses,
  count,
  page,
  totalPages,
  currentStatus,
  currentSearch,
  expiringSoonCount
}: ActiveBonusesClientProps) {
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: Activity },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      expired: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] ||
                  { color: 'bg-gray-100 text-gray-800', icon: Activity }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const calculateTimeRemaining = (expiresAt: string | undefined) => {
    if (!expiresAt) return '—'

    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h remaining`
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
              placeholder="Search by player or bonus..."
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
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Active Bonuses Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bonus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wagering Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeBonuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No active bonuses found</p>
                  </td>
                </tr>
              ) : (
                activeBonuses.map((bonus) => (
                  <tr key={bonus.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {bonus.user?.external_user_id || bonus.user_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500">{bonus.user?.email || 'No email'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {bonus.bonus?.bonus_name || 'Unknown Bonus'}
                        </p>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {bonus.bonus?.bonus_code || 'N/A'}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        ${Number(bonus.bonus_amount).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-900">
                            ${Number(bonus.wagering_completed).toLocaleString()} /
                            ${Number(bonus.wagering_requirement_total).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {bonus.wageringProgress || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (bonus.wageringProgress || 0) >= 100
                                ? 'bg-green-600'
                                : (bonus.wageringProgress || 0) >= 75
                                ? 'bg-blue-600'
                                : (bonus.wageringProgress || 0) >= 50
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(100, bonus.wageringProgress || 0)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(bonus.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {bonus.status === 'active' ? (
                          <div>
                            <p className={`font-medium ${
                              calculateTimeRemaining(bonus.expires_at).includes('d')
                                ? 'text-gray-900'
                                : 'text-orange-600'
                            }`}>
                              {calculateTimeRemaining(bonus.expires_at)}
                            </p>
                            {bonus.expires_at && (
                              <p className="text-xs text-gray-500">
                                Expires: {new Date(bonus.expires_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : bonus.status === 'completed' && bonus.completed_at ? (
                          <p className="text-xs text-gray-500">
                            Completed: {new Date(bonus.completed_at).toLocaleDateString()}
                          </p>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1 text-gray-600 hover:text-indigo-600" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {bonus.status === 'active' && (
                          <>
                            <button className="p-1 text-gray-600 hover:text-orange-600" title="Extend">
                              <Clock className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-600 hover:text-red-600" title="Cancel">
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
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

      {/* Expiring Soon Alert */}
      {expiringSoonCount > 0 && (
        <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-900">
                {expiringSoonCount} Bonuses Expiring Soon
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                These bonuses will expire within the next 24 hours. Consider sending reminder notifications to players.
              </p>
              <button className="mt-2 px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700">
                Send Reminders
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}