'use client'

import { useState } from 'react'
import { logDebug } from '@mypokies/monitoring/client'
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Edit3,
  RefreshCw,
  Eye,
  ChevronRight,
  Calendar,
  TrendingUp,
  DollarSign,
  Bot,
  Target,
  BarChart3,
  Filter,
  Download
} from 'lucide-react'

interface ScheduledMessage {
  id: string
  player_id: string
  player_name: string
  player_email: string
  player_tier: string
  message_type: 'missed_pattern' | 'engaged_player_dropout' | 'jackpot_proximity' | 'loss_recovery' | 'reactivation'
  trigger_reason: string
  ai_generated_message: string
  scheduled_send_time: string
  status: 'proposed' | 'approved' | 'rejected' | 'scheduled' | 'sent' | 'failed'
  approval_status: 'pending_review' | 'approved' | 'rejected'
  created_at: string
  context_snapshot: {
    avg_deposit_per_week?: number
    days_inactive?: number
    deposit_pattern?: string
    last_deposit_amount?: number
    offer_type?: string
    offer_amount?: number
    jackpot_value?: number
  }
}

interface ScheduledMessagesStats {
  pending_review: number
  scheduled: number
  sent_today: number
  response_rate: number
  revenue_7d: number
}

interface ScheduledMessagesClientProps {
  proposedMessages: ScheduledMessage[]
  scheduledMessages: ScheduledMessage[]
  sentMessages: ScheduledMessage[]
  stats: ScheduledMessagesStats
}

export default function ScheduledMessagesClient({
  proposedMessages,
  scheduledMessages,
  sentMessages,
  stats
}: ScheduledMessagesClientProps) {
  const [activeTab, setActiveTab] = useState<'proposed' | 'scheduled' | 'sent' | 'analytics'>('proposed')
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null)
  const [showContextModal, setShowContextModal] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState('')

  const getMessageTypeConfig = (type: string) => {
    const configs = {
      missed_pattern: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock, label: 'Missed Pattern' },
      engaged_player_dropout: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, label: 'Player Dropout' },
      jackpot_proximity: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Target, label: 'Jackpot Proximity' },
      loss_recovery: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: TrendingUp, label: 'Loss Recovery' },
      reactivation: { color: 'bg-green-100 text-green-800 border-green-200', icon: RefreshCw, label: 'Reactivation' }
    }
    return configs[type as keyof typeof configs] || configs.reactivation
  }

  const getTierBadgeColor = (tier: string) => {
    const colors = {
      Bronze: 'bg-orange-100 text-orange-800',
      Silver: 'bg-gray-100 text-gray-800',
      Gold: 'bg-yellow-100 text-yellow-800',
      Platinum: 'bg-purple-100 text-purple-800',
      Diamond: 'bg-blue-100 text-blue-800'
    }
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleApproveMessage = (id: string) => {
    logDebug('Approve message', { context: 'ScheduledMessagesClient', data: { id } })
    // API call would go here
  }

  const handleRejectMessage = (id: string) => {
    logDebug('Reject message', { context: 'ScheduledMessagesClient', data: { id } })
    // API call would go here
  }

  const handleEditMessage = (message: ScheduledMessage) => {
    setEditingMessage(message.id)
    setEditedContent(message.ai_generated_message)
  }

  const handleSaveEdit = (id: string) => {
    logDebug('Save edit', { context: 'ScheduledMessagesClient', data: { id, editedContent } })
    setEditingMessage(null)
    // API call would go here
  }

  const handleViewContext = (message: ScheduledMessage) => {
    setSelectedMessage(message)
    setShowContextModal(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Messages</h1>
          <p className="text-gray-600 mt-2">AI-powered player outreach and engagement</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pending_review}</p>
          <p className="text-sm text-gray-600">Pending Review</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
          <p className="text-sm text-gray-600">Scheduled</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Send className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.sent_today}</p>
          <p className="text-sm text-gray-600">Sent Today</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.response_rate.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Response Rate</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${stats.revenue_7d.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Generated (7d)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white rounded-lg border border-gray-200 p-1 w-fit">
        <button
          onClick={() => setActiveTab('proposed')}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${
            activeTab === 'proposed'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Proposed ({proposedMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${
            activeTab === 'scheduled'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Scheduled ({scheduledMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${
            activeTab === 'sent'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Send className="w-4 h-4" />
          Sent
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* Proposed Messages Tab */}
      {activeTab === 'proposed' && (
        <div className="space-y-4">
          {proposedMessages.map((message) => {
            const typeConfig = getMessageTypeConfig(message.message_type)
            const Icon = typeConfig.icon

            return (
              <div key={message.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${typeConfig.color} border`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{message.player_name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTierBadgeColor(message.player_tier)}`}>
                          {message.player_tier}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeConfig.color} border`}>
                          {typeConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{message.player_email}</p>

                      {/* Trigger Reason */}
                      <div className="flex items-start gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                        <Bot className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">AI Trigger</p>
                          <p className="text-sm text-gray-600">{message.trigger_reason}</p>
                        </div>
                      </div>

                      {/* Generated Message */}
                      {editingMessage === message.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(message.id)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Save & Approve
                            </button>
                            <button
                              onClick={() => setEditingMessage(null)}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                            >
                              Cancel
                            </button>
                            <button className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm flex items-center gap-2">
                              <RefreshCw className="w-4 h-4" />
                              Regenerate with AI
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="flex items-start gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-indigo-600 mt-0.5" />
                            <p className="text-sm font-medium text-indigo-900">Generated Message</p>
                          </div>
                          <p className="text-sm text-gray-800">{message.ai_generated_message}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <span>Scheduled: {formatDate(message.scheduled_send_time)}</span>
                            <span>•</span>
                            <span>Generated: {formatDate(message.created_at)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {editingMessage !== message.id && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleViewContext(message)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Context
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectMessage(message.id)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleEditMessage(message)}
                        className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleApproveMessage(message.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve & Schedule
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {proposedMessages.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Proposed Messages</h3>
              <p className="text-gray-600">All messages have been reviewed. New proposals will appear here automatically.</p>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Messages Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sends</h3>
            <div className="space-y-3">
              {scheduledMessages.map((message) => {
                const typeConfig = getMessageTypeConfig(message.message_type)
                return (
                  <div key={message.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded ${typeConfig.color}`}>
                        <typeConfig.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{message.player_name}</p>
                        <p className="text-xs text-gray-600">{message.ai_generated_message.substring(0, 60)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{formatDate(message.scheduled_send_time)}</p>
                        <p className="text-xs text-gray-600">{typeConfig.label}</p>
                      </div>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {scheduledMessages.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No scheduled messages</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sent Messages Tab */}
      {activeTab === 'sent' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sentMessages.map((message) => {
                  const typeConfig = getMessageTypeConfig(message.message_type)
                  return (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{message.player_name}</p>
                          <p className="text-xs text-gray-600">{message.player_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-md truncate">{message.ai_generated_message}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{formatDate(message.scheduled_send_time)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Delivered
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">—</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {sentMessages.length === 0 && (
              <div className="text-center py-12">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No sent messages</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion by Message Type</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Missed Pattern</span>
                  <span className="text-sm font-medium text-gray-900">32.5%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Loss Recovery</span>
                  <span className="text-sm font-medium text-gray-900">28.0%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reactivation</span>
                  <span className="text-sm font-medium text-gray-900">18.5%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Jackpot Proximity</span>
                  <span className="text-sm font-medium text-gray-900">15.2%</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Best Send Times</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Evening (6-9 PM)</span>
                  <span className="text-sm font-medium text-green-600">45% response</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Afternoon (2-5 PM)</span>
                  <span className="text-sm font-medium text-green-600">38% response</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Morning (9-12 PM)</span>
                  <span className="text-sm font-medium text-yellow-600">22% response</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">SMS Cost (7d)</span>
                  <span className="text-sm font-medium text-gray-900">$42.50</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">AI Generation Cost</span>
                  <span className="text-sm font-medium text-gray-900">$12.30</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Revenue Generated</span>
                  <span className="text-sm font-medium text-green-600">${stats.revenue_7d.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-900">ROI</span>
                  <span className="text-sm font-bold text-green-600">15,068%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Modal */}
      {showContextModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Message Generation Context</h3>
              <button onClick={() => setShowContextModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Player Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-900">{selectedMessage.player_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tier:</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTierBadgeColor(selectedMessage.player_tier)}`}>
                      {selectedMessage.player_tier}
                    </span>
                  </div>
                  {selectedMessage.context_snapshot.avg_deposit_per_week && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Weekly Deposit:</span>
                      <span className="font-medium text-gray-900">${selectedMessage.context_snapshot.avg_deposit_per_week}</span>
                    </div>
                  )}
                  {selectedMessage.context_snapshot.deposit_pattern && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pattern:</span>
                      <span className="font-medium text-gray-900">{selectedMessage.context_snapshot.deposit_pattern}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Trigger Details</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedMessage.trigger_reason}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Offer Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900 capitalize">{selectedMessage.context_snapshot.offer_type?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-gray-900">${selectedMessage.context_snapshot.offer_amount}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Generated Message</h4>
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-sm text-gray-800">{selectedMessage.ai_generated_message}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
