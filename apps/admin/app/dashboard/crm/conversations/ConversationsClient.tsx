'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Bot,
  Send,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Activity,
  Zap,
  Edit3,
  RefreshCw
} from 'lucide-react'

interface Conversation {
  id: string
  phone_number: string
  lead_name?: string
  status: string
  ai_enabled: boolean
  message_count: number
  last_message?: string
  last_message_at?: string
  conversion_goal?: string
  converted: boolean
  conversion_value?: number
  engagement_score?: number
  sentiment_score?: number
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  conversation_id: string
  content: string
  direction: string
  timestamp: string
  ai_generated: boolean
  edited?: boolean
  delivery_status?: string
  created_at: string
}

interface ConversationsClientProps {
  conversations: Conversation[]
  messages: Message[]
  stats: {
    activeCount: number
    aiResponseRate: number
    conversionRate: number
    avgMessagesToConvert: number
    totalConversionValue: number
  }
}

export default function ConversationsClient({
  conversations,
  messages,
  stats
}: ConversationsClientProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const getStatusBadge = (status: string, converted: boolean) => {
    if (converted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Converted
        </span>
      )
    }

    const statusConfig: Record<string, { color: string, icon: React.ComponentType<{ className?: string }> }> = {
      active: { color: 'bg-blue-100 text-blue-800', icon: Activity },
      paused: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle }
    }

    const config = statusConfig[status] || statusConfig.active
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getSentimentColor = (score?: number) => {
    if (!score) return 'text-gray-600'
    if (score > 0.5) return 'text-green-600'
    if (score > 0) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`

    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation)
  const conversationMessages = selectedConversation
    ? messages.filter(m => m.conversation_id === selectedConversation)
    : []

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">SMS Conversations</h1>
        <p className="text-gray-600 mt-2">AI-powered SMS conversations with conversion tracking</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activeCount}</p>
          <p className="text-sm text-gray-600">Active Conversations</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Bot className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.aiResponseRate}%</p>
          <p className="text-sm text-gray-600">AI Response Rate</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Conversion Rate</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgMessagesToConvert.toFixed(1)}</p>
          <p className="text-sm text-gray-600">Avg Messages to Convert</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats.totalConversionValue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Total Conv. Value</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 h-[calc(100%-14rem)]">
        {/* Conversations List */}
        <div className="w-1/3 bg-white rounded-lg border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                All
              </button>
              <button className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                Active
              </button>
              <button className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                Converted
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No conversations yet</p>
              </div>
            ) : (
              conversations
                .filter(conv => {
                  if (!searchQuery) return true
                  const query = searchQuery.toLowerCase()
                  return (
                    conv.phone_number?.toLowerCase().includes(query) ||
                    conv.lead_name?.toLowerCase().includes(query) ||
                    conv.last_message?.toLowerCase().includes(query)
                  )
                })
                .map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      selectedConversation === conv.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {conv.lead_name || conv.phone_number || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">{conv.phone_number || '—'}</p>
                      </div>
                      {getStatusBadge(conv.status, conv.converted)}
                    </div>

                    <p className="text-sm text-gray-600 mb-2 truncate">
                      {conv.last_message || 'No messages yet'}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {conv.ai_enabled && (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                            <Bot className="w-3 h-3" />
                            AI
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {conv.message_count} msgs
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {conv.last_message_at ? formatTimestamp(conv.last_message_at) : '—'}
                      </span>
                    </div>

                    {conv.engagement_score !== undefined && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-indigo-600 h-1 rounded-full"
                            style={{ width: `${conv.engagement_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{conv.engagement_score}%</span>
                        {conv.sentiment_score !== undefined && (
                          <span className={`text-xs ${getSentimentColor(conv.sentiment_score)}`}>
                            {conv.sentiment_score > 0 ? '😊' : conv.sentiment_score < 0 ? '😔' : '😐'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Conversation View */}
        {selectedConversation && selectedConv ? (
          <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
            {/* Conversation Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedConv.lead_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">{selectedConv.phone_number || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAiEnabled(!aiEnabled)}
                    className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${
                      aiEnabled
                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    AI {aiEnabled ? 'On' : 'Off'}
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {conversationMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No messages in this conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${message.direction === 'outbound' ? 'order-2' : ''}`}>
                        {message.ai_generated && message.direction === 'outbound' && (
                          <div className="flex items-center gap-2 mb-1 justify-end">
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              AI Generated
                            </span>
                            {message.edited && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Edit3 className="w-3 h-3" />
                                Edited
                              </span>
                            )}
                          </div>
                        )}
                        <div
                          className={`px-4 py-2 rounded-lg ${
                            message.direction === 'outbound'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {message.direction === 'outbound' && message.delivery_status && (
                            <span className="text-xs text-gray-500">
                              {message.delivery_status === 'read' ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Select a conversation to view messages</p>
            </div>
          </div>
        )}

        {/* Conversation Info Panel */}
        {selectedConversation && selectedConv && (
          <div className="w-80 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Details</h3>

            {/* Lead Info */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Lead Information</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Name</span>
                  <span className="text-sm text-gray-900">{selectedConv.lead_name || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Phone</span>
                  <span className="text-sm text-gray-900">{selectedConv.phone_number || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="text-sm text-gray-900">
                    {selectedConv.status.charAt(0).toUpperCase() + selectedConv.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Analytics */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">AI Performance</h4>
              <div className="space-y-3">
                {selectedConv.engagement_score !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Engagement Score</span>
                      <span className="text-xs text-gray-900">{selectedConv.engagement_score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${selectedConv.engagement_score}%` }}
                      />
                    </div>
                  </div>
                )}
                {selectedConv.sentiment_score !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Sentiment</span>
                      <span className={`text-xs ${getSentimentColor(selectedConv.sentiment_score)}`}>
                        {selectedConv.sentiment_score > 0 ? 'Positive' : selectedConv.sentiment_score < 0 ? 'Negative' : 'Neutral'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          selectedConv.sentiment_score > 0 ? 'bg-green-500' :
                          selectedConv.sentiment_score < 0 ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}
                        style={{ width: `${Math.abs(selectedConv.sentiment_score * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">AI Messages</span>
                  <span className="text-xs text-gray-900">
                    {conversationMessages.filter(m => m.ai_generated).length} of {conversationMessages.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Conversion Goal */}
            {selectedConv.conversion_goal && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Conversion Goal</h4>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm font-medium text-indigo-900">{selectedConv.conversion_goal}</p>
                  {selectedConv.conversion_value && (
                    <p className="text-xs text-indigo-700 mt-1">
                      Value: ${selectedConv.conversion_value}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                Transfer to Human Agent
              </button>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                View Full Profile
              </button>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                Export Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}