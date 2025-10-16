'use client'

import { useState } from 'react'
import {
  Mail,
  MessageSquare,
  Send,
  Users,
  Calendar,
  Target,
  Plus,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign
} from 'lucide-react'

type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
type CampaignType = 'email' | 'sms' | 'push' | 'in_app'

interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  segment?: string
  audience?: number
  sent?: number
  opened?: number
  clicked?: number
  converted?: number
  revenue?: number
  scheduled_date?: string
  created_at: string
  updated_at: string
}

interface CampaignsClientProps {
  campaigns: Campaign[]
  stats: {
    activeCampaigns: number
    totalReach: number
    avgOpenRate: number
    totalRevenue: number
  }
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const statusConfig = {
    draft: { color: 'bg-gray-100 text-gray-800', icon: Edit },
    scheduled: { color: 'bg-blue-100 text-blue-800', icon: Calendar },
    active: { color: 'bg-green-100 text-green-800', icon: PlayCircle },
    paused: { color: 'bg-yellow-100 text-yellow-800', icon: PauseCircle },
    completed: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function CampaignTypeIcon({ type }: { type: CampaignType }) {
  const icons = {
    email: Mail,
    sms: MessageSquare,
    push: Send,
    in_app: Target
  }
  const Icon = icons[type]
  return <Icon className="w-4 h-4" />
}

export default function CampaignsClient({ campaigns, stats }: CampaignsClientProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'scheduled' | 'draft'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredCampaigns = campaigns.filter(campaign => {
    if (selectedTab === 'all') return true
    if (selectedTab === 'active') return campaign.status === 'active'
    if (selectedTab === 'scheduled') return campaign.status === 'scheduled'
    if (selectedTab === 'draft') return campaign.status === 'draft'
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 1) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Manager</h1>
          <p className="text-gray-600 mt-2">Create and manage marketing campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Mail className="w-8 h-8 text-indigo-600" />
            <span className="text-xs text-gray-500">This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</p>
          <p className="text-sm text-gray-600">Active Campaigns</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-green-600" />
            <span className="text-xs text-gray-500">Total Reach</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalReach.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Players Reached</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-xs text-gray-500">Avg Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgOpenRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Open Rate</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-yellow-600" />
            <span className="text-xs text-gray-500">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats.totalRevenue > 1000 ? `${(stats.totalRevenue / 1000).toFixed(1)}K` : stats.totalRevenue}
          </p>
          <p className="text-sm text-gray-600">Generated Revenue</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'active', 'scheduled', 'draft'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <CampaignTypeIcon type={campaign.type} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                          <p className="text-xs text-gray-500">
                            {campaign.type} • Created {formatDate(campaign.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{campaign.segment || 'All Players'}</p>
                      <p className="text-xs text-gray-500">
                        {campaign.audience ? `${campaign.audience.toLocaleString()} players` : '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {campaign.sent ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              Sent: {campaign.sent.toLocaleString()}
                            </span>
                          </div>
                          {campaign.opened !== undefined && (
                            <div className="flex items-center gap-2">
                              <Eye className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                Opened: {campaign.opened}
                                {campaign.sent > 0 && ` (${Math.round((campaign.opened / campaign.sent) * 100)}%)`}
                              </span>
                            </div>
                          )}
                          {campaign.clicked !== undefined && (
                            <div className="flex items-center gap-2">
                              <MousePointer className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                Clicked: {campaign.clicked}
                                {campaign.opened && campaign.opened > 0 && ` (${Math.round((campaign.clicked / campaign.opened) * 100)}%)`}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No data yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {campaign.revenue ? `$${campaign.revenue.toLocaleString()}` : '—'}
                      </p>
                      {campaign.converted && campaign.converted > 0 && (
                        <p className="text-xs text-gray-500">
                          {campaign.converted} conversions
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1 text-gray-600 hover:text-indigo-600" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-600 hover:text-blue-600" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-600 hover:text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No campaigns found</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create Your First Campaign
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-semibold mb-4">Quick Campaign Ideas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white/10 backdrop-blur rounded-lg p-4 text-left hover:bg-white/20 transition-colors">
            <h3 className="font-semibold mb-2">VIP Appreciation</h3>
            <p className="text-sm opacity-90">Send exclusive offers to your top players</p>
          </button>
          <button className="bg-white/10 backdrop-blur rounded-lg p-4 text-left hover:bg-white/20 transition-colors">
            <h3 className="font-semibold mb-2">New Game Launch</h3>
            <p className="text-sm opacity-90">Announce new games with free spins</p>
          </button>
          <button className="bg-white/10 backdrop-blur rounded-lg p-4 text-left hover:bg-white/20 transition-colors">
            <h3 className="font-semibold mb-2">Weekend Special</h3>
            <p className="text-sm opacity-90">Boost weekend activity with bonuses</p>
          </button>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Campaign</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Weekend Special Bonus"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push Notification</option>
                    <option value="in_app">In-App Message</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Segment</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Players</option>
                    <option value="vip">VIP Players</option>
                    <option value="new">New Players</option>
                    <option value="inactive">Inactive Players</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="now">Send Immediately</option>
                  <option value="schedule">Schedule for Later</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your campaign message..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}