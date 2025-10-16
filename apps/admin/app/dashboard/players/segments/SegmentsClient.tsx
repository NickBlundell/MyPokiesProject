'use client'

import { useState } from 'react'
import {
  Users,
  Target,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  UserCheck
} from 'lucide-react'

interface Segment {
  id: string
  name: string
  description: string
  criteria: Record<string, unknown>
  player_count?: number
  playerCount?: number
  avg_value?: number
  avgValue?: number
  last_updated?: string
  lastUpdated?: string
  auto_update?: boolean
  autoUpdate?: boolean
  color?: string
  created_at?: string
  updated_at?: string
}

interface SegmentStats {
  activeSegments: number
  segmentedPlayers: number
  coverageRate: number
  avgSegmentValue: number
}

interface SegmentsClientProps {
  segments: Segment[]
  stats: SegmentStats
}

export default function SegmentsClient({ segments, stats }: SegmentsClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Note: selectedSegment and setSelectedSegment removed as they were unused

  const predefinedCriteria = [
    { label: 'Deposit Amount', field: 'deposit', operators: ['>', '<', '=', 'between'] },
    { label: 'Registration Date', field: 'registered', operators: ['before', 'after', 'between'] },
    { label: 'Last Activity', field: 'lastActive', operators: ['within', 'more than'] },
    { label: 'VIP Tier', field: 'vipTier', operators: ['is', 'is not', 'in'] },
    { label: 'Game Preference', field: 'gameType', operators: ['includes', 'excludes'] },
    { label: 'Country', field: 'country', operators: ['is', 'is not', 'in'] }
  ]

  // Normalize segment data to handle both snake_case and camelCase
  const normalizedSegments = segments.map(segment => ({
    ...segment,
    playerCount: segment.player_count ?? segment.playerCount ?? 0,
    avgValue: segment.avg_value ?? segment.avgValue ?? 0,
    lastUpdated: segment.last_updated ?? segment.lastUpdated ?? segment.updated_at ?? 'N/A',
    autoUpdate: segment.auto_update ?? segment.autoUpdate ?? false,
    color: segment.color ?? 'indigo'
  }))

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value}`
  }

  const formatDate = (dateString: string) => {
    if (dateString === 'N/A') return dateString

    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffHours < 1) return 'Just now'
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      return date.toLocaleDateString()
    } catch {
      return dateString
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Player Segments</h1>
          <p className="text-gray-600 mt-2">Create and manage player segments for targeted marketing</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Segment
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activeSegments}</p>
          <p className="text-sm text-gray-600">Active Segments</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.segmentedPlayers.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Segmented Players</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.coverageRate}%</p>
          <p className="text-sm text-gray-600">Coverage Rate</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgSegmentValue)}</p>
          <p className="text-sm text-gray-600">Avg. Segment Value</p>
        </div>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {normalizedSegments.length === 0 ? (
          <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No segments yet</h3>
            <p className="text-gray-600 mb-4">Create your first player segment to start organizing your audience</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Segment
            </button>
          </div>
        ) : (
          normalizedSegments.map((segment) => (
            <div key={segment.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-${segment.color}-500`}></div>
                  <h3 className="text-lg font-semibold text-gray-900">{segment.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {segment.autoUpdate && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Auto
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{segment.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Players</p>
                  <p className="text-lg font-semibold text-gray-900">{segment.playerCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg. Value</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(segment.avgValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Updated</p>
                  <p className="text-sm text-gray-600">{formatDate(segment.lastUpdated)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                  Use in Campaign
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Segment Builder */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-semibold mb-4">Quick Segment Ideas</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white/10 backdrop-blur rounded-lg p-4 text-left hover:bg-white/20 transition-colors"
          >
            <UserCheck className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">Loyal Players</h3>
            <p className="text-sm opacity-90">Active for 6+ months</p>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white/10 backdrop-blur rounded-lg p-4 text-left hover:bg-white/20 transition-colors"
          >
            <TrendingUp className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">Rising Stars</h3>
            <p className="text-sm opacity-90">Increasing activity</p>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white/10 backdrop-blur rounded-lg p-4 text-left hover:bg-white/20 transition-colors"
          >
            <Clock className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">At Risk</h3>
            <p className="text-sm opacity-90">Declining engagement</p>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white/10 backdrop-blur rounded-lg p-4 text-left hover:bg-white/20 transition-colors"
          >
            <DollarSign className="w-6 h-6 mb-2" />
            <h3 className="font-semibold">Big Spenders</h3>
            <p className="text-sm opacity-90">Top 10% by value</p>
          </button>
        </div>
      </div>

      {/* Create Segment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Segment</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Segment Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., High Rollers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Brief description of this segment..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Criteria</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                      {predefinedCriteria.map(c => (
                        <option key={c.field} value={c.field}>{c.label}</option>
                      ))}
                    </select>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg">
                      <option>is greater than</option>
                      <option>is less than</option>
                      <option>equals</option>
                      <option>between</option>
                    </select>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Value"
                    />
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 w-full">
                    + Add Criteria
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600" defaultChecked />
                  <span className="text-sm font-medium text-gray-700">Auto-update this segment daily</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Estimated players: <span className="font-semibold">calculating...</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Create Segment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
