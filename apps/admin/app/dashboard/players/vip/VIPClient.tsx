'use client'

import { useState, useMemo } from 'react'
import {
  Crown,
  Star,
  Award,
  Diamond,
  Gem,
  Search,
  Filter,
  Download,
  Plus
} from 'lucide-react'

interface VIPPlayer {
  id: string
  username: string
  email: string
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
  points: number
  totalDeposits: number
  totalWagered: number
  joinedAt: string
  lastActive: string
  personalHost?: string
}

interface TierStats {
  tier: string
  count: number
  averageValue: number
}

interface VIPClientProps {
  players: VIPPlayer[]
  tierStats: TierStats[]
  totalVIPPlayers: number
}

const tierConfig = {
  Bronze: { color: 'bg-orange-100 text-orange-800', icon: Award, minPoints: 0 },
  Silver: { color: 'bg-gray-100 text-gray-800', icon: Star, minPoints: 500 },
  Gold: { color: 'bg-yellow-100 text-yellow-800', icon: Crown, minPoints: 2500 },
  Platinum: { color: 'bg-purple-100 text-purple-800', icon: Gem, minPoints: 10000 },
  Diamond: { color: 'bg-blue-100 text-blue-800', icon: Diamond, minPoints: 50000 }
}

export default function VIPClient({ players, tierStats, totalVIPPlayers }: VIPClientProps) {
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter players based on search and tier selection
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch = searchQuery === '' ||
        player.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.email.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTier = selectedTier === 'all' || player.tier === selectedTier

      return matchesSearch && matchesTier
    })
  }, [players, searchQuery, selectedTier])

  const getTierBadge = (tier: VIPPlayer['tier']) => {
    const config = tierConfig[tier]
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {tier}
      </span>
    )
  }

  // formatDate function removed as it was unused

  const getNextTier = (currentTier: VIPPlayer['tier']) => {
    const tiers: VIPPlayer['tier'][] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
    const currentIndex = tiers.indexOf(currentTier)
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null
  }

  const calculateProgress = (points: number, tier: VIPPlayer['tier']) => {
    const nextTier = getNextTier(tier)
    if (!nextTier) return 100 // Already at max tier

    const currentMin = tierConfig[tier].minPoints
    const nextMin = tierConfig[nextTier].minPoints
    const progress = ((points - currentMin) / (nextMin - currentMin)) * 100
    return Math.min(100, Math.max(0, progress))
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VIP Management</h1>
          <p className="text-gray-600 mt-2">Manage your VIP players and loyalty program</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add VIP Manually
        </button>
      </div>

      {/* VIP Tier Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {Object.entries(tierConfig).map(([tier, config]) => {
          const Icon = config.icon
          const stats = tierStats.find(s => s.tier === tier)
          return (
            <div key={tier} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.count || 0}</p>
              <p className="text-sm text-gray-600">{tier} Players</p>
              <p className="text-xs text-gray-500">{config.minPoints.toLocaleString()}+ points</p>
            </div>
          )
        })}
      </div>

      {/* VIP Benefits Overview */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">VIP Benefits by Tier</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <Award className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">Bronze</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 5% cashback</li>
              <li>• Birthday bonus</li>
              <li>• 1 point/$10</li>
            </ul>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <Star className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">Silver</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 10% cashback</li>
              <li>• Priority support</li>
              <li>• 1.2 points/$10</li>
            </ul>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <Crown className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">Gold</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 15% cashback</li>
              <li>• Personal host</li>
              <li>• 1.5 points/$10</li>
            </ul>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <Gem className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">Platinum</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 20% cashback</li>
              <li>• Exclusive events</li>
              <li>• 2 points/$10</li>
            </ul>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <Diamond className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">Diamond</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 25% cashback</li>
              <li>• Luxury gifts</li>
              <li>• 3 points/$10</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search VIP players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Tiers</option>
            {Object.keys(tierConfig).map(tier => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredPlayers.length} of {totalVIPPlayers} VIP players
        </p>
      </div>

      {/* VIP Players Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VIP Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loyalty Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Deposits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Wagered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personal Host
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No VIP players found
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{player.username}</p>
                        <p className="text-xs text-gray-500">{player.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTierBadge(player.tier)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{player.points.toLocaleString()}</p>
                      <div className="w-24 bg-gray-200 rounded-full h-1 mt-1">
                        <div
                          className="bg-indigo-600 h-1 rounded-full"
                          style={{ width: `${calculateProgress(player.points, player.tier)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ${player.totalDeposits.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ${player.totalWagered.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {player.personalHost || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {player.lastActive}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="text-indigo-600 hover:text-indigo-800">View</button>
                        <button className="text-gray-600 hover:text-gray-800">Contact</button>
                        <button className="text-gray-600 hover:text-gray-800">Gift</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
