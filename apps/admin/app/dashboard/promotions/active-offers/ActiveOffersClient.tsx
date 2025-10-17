'use client'

import { useState, useMemo } from 'react'
import {
  Gift,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter
} from 'lucide-react'
import { TriggeredPromotion, ActiveOffersStats } from './page'

interface ActiveOffersClientProps {
  offers: TriggeredPromotion[]
  stats: ActiveOffersStats
}

type StatusFilter = 'all' | 'available' | 'claimed' | 'expired'

export default function ActiveOffersClient({
  offers: initialOffers,
  stats
}: ActiveOffersClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter offers based on status and search query
  const filteredOffers = useMemo(() => {
    let filtered = initialOffers

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(offer => offer.status === statusFilter)
    }

    // Filter by search query (user email, phone, or promotion name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(offer =>
        offer.user_email?.toLowerCase().includes(query) ||
        offer.user_phone?.toLowerCase().includes(query) ||
        offer.promotion_name?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [initialOffers, statusFilter, searchQuery])

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Available
          </span>
        )
      case 'claimed':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Claimed
          </span>
        )
      case 'expired':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            Expired
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Active Offers</h1>
        <p className="text-gray-600 mt-2">View all triggered promotion offers and their status</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Gift className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalOffers}</p>
          <p className="text-sm text-gray-600">Total Offers</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.liveOffers}</p>
          <p className="text-sm text-gray-600">Live Offers</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.claimedOffers}</p>
          <p className="text-sm text-gray-600">Claimed</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.expiredOffers}</p>
          <p className="text-sm text-gray-600">Expired</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by user email, phone, or promotion name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="claimed">Claimed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Promotion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Triggered At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Claimed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No offers match your filters.'
                      : 'No active offers yet. Offers will appear here when promotions are triggered.'}
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {offer.promotion_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {offer.user_email || offer.user_phone || 'Unknown'}
                      </div>
                      {offer.user_email && offer.user_phone && (
                        <div className="text-xs text-gray-500">{offer.user_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(offer.triggered_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {offer.claimed_at ? formatDateTime(offer.claimed_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(offer.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(offer.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || statusFilter !== 'all') && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredOffers.length} of {initialOffers.length} offers
        </div>
      )}
    </div>
  )
}
