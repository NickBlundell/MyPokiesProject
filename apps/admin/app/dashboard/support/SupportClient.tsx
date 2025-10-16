'use client'

import { useState } from 'react'
import {
  MessageSquare,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Search,
  Filter,
  Reply,
  AlertCircle,
  PhoneCall,
  Mail,
  MessageCircle,
  TrendingUp,
  RefreshCw,
  XCircle,
  ChevronRight,
  Zap,
  UserCheck,
  Star
} from 'lucide-react'

interface SupportTicket {
  id: string
  player_id: string
  player_username?: string
  player_email?: string
  subject: string
  category: 'account' | 'payment' | 'bonus' | 'technical' | 'gameplay' | 'verification' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'pending' | 'resolved' | 'closed'
  channel?: 'email' | 'phone' | 'chat' | 'sms'
  created_at: string
  updated_at: string
  response_time?: number
  assigned_to?: string
  player_tier?: string
  messages_count?: number
  last_message?: string
}

interface Stats {
  openTickets: number
  urgentTickets: number
  pendingTickets: number
  resolvedTickets: number
  avgResponseTime: string
  satisfactionRate: string
  liveChats: number
}

interface SupportClientProps {
  tickets: SupportTicket[]
  stats: Stats
}

// Custom icon components
const CreditCard = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="7" width="18" height="10" rx="2" strokeWidth="2"/>
    <line x1="3" y1="11" x2="21" y2="11" strokeWidth="2"/>
  </svg>
)

const Gift = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="8" width="18" height="13" rx="2" strokeWidth="2"/>
    <path d="M12 8V21M3 12H21" strokeWidth="2"/>
    <path d="M7.5 8C7.5 8 7.5 5 10 5C11 5 12 6 12 8M16.5 8C16.5 8 16.5 5 14 5C13 5 12 6 12 8" strokeWidth="2"/>
  </svg>
)

const Gamepad2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="5" y="8" width="14" height="8" rx="2" strokeWidth="2"/>
    <circle cx="9" cy="12" r="1" fill="currentColor"/>
    <circle cx="15" cy="12" r="1" fill="currentColor"/>
  </svg>
)

export default function SupportClient({ tickets, stats }: SupportClientProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery === '' ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.player_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.player_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || ticket.priority === selectedPriority

    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusBadge = (status: SupportTicket['status']) => {
    const statusConfig = {
      open: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      closed: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
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

  const getPriorityBadge = (priority: SupportTicket['priority']) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800', icon: '↓' },
      medium: { color: 'bg-blue-100 text-blue-800', icon: '→' },
      high: { color: 'bg-orange-100 text-orange-800', icon: '↑' },
      urgent: { color: 'bg-red-100 text-red-800', icon: '⚡' }
    }

    const config = priorityConfig[priority]

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    )
  }

  const getChannelIcon = (channel?: SupportTicket['channel']) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'phone':
        return <PhoneCall className="w-4 h-4" />
      case 'chat':
        return <MessageCircle className="w-4 h-4" />
      case 'sms':
        return <MessageSquare className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  const getCategoryIcon = (category: SupportTicket['category']) => {
    switch (category) {
      case 'account':
        return <User className="w-4 h-4 text-blue-600" />
      case 'payment':
        return <CreditCard className="w-4 h-4 text-green-600" />
      case 'bonus':
        return <Gift className="w-4 h-4 text-purple-600" />
      case 'technical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'gameplay':
        return <Gamepad2 className="w-4 h-4 text-indigo-600" />
      case 'verification':
        return <UserCheck className="w-4 h-4 text-yellow-600" />
      default:
        return <HelpCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatResponseTime = (minutes?: number) => {
    if (!minutes) return null
    if (minutes < 60) return `${Math.round(minutes)}m`
    return `${Math.round(minutes / 60)}h`
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-600 mt-2">Manage player support tickets and inquiries</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.openTickets}</p>
          <p className="text-sm text-gray-600">Open Tickets</p>
          {stats.urgentTickets > 0 && (
            <p className="text-xs text-red-600 mt-1">{stats.urgentTickets} urgent</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingTickets}</p>
          <p className="text-sm text-gray-600">Pending</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.resolvedTickets}</p>
          <p className="text-sm text-gray-600">Resolved (7d)</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}</p>
          <p className="text-sm text-gray-600">Avg. Response</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.satisfactionRate}</p>
          <p className="text-sm text-gray-600">Satisfaction</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <MessageCircle className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.liveChats}</p>
          <p className="text-sm text-gray-600">Live Chats</p>
        </div>
      </div>

      {/* Quick Actions */}
      {stats.urgentTickets > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900">{stats.urgentTickets} Urgent Tickets Require Attention</h3>
              <p className="text-sm text-yellow-700 mt-1">
                High-priority issues need immediate response.
              </p>
            </div>
            <button
              onClick={() => setSelectedPriority('urgent')}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
            >
              View Urgent
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Show:</span>
          <button className="px-3 py-1 bg-indigo-600 text-white rounded">My Tickets</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">All Tickets</button>
        </div>
      </div>

      {/* Support Tickets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No tickets found</p>
                      <p className="text-sm mt-1">
                        {searchQuery || selectedStatus !== 'all' || selectedPriority !== 'all'
                          ? 'Try adjusting your filters or search query'
                          : 'No support tickets have been created yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ticket.id}</p>
                        {ticket.messages_count && (
                          <p className="text-xs text-gray-500">{ticket.messages_count} messages</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {ticket.player_username || `Player ${ticket.player_id}`}
                          </p>
                          {ticket.player_email && (
                            <p className="text-xs text-gray-500">{ticket.player_email}</p>
                          )}
                        </div>
                        {ticket.player_tier && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            ticket.player_tier === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                            ticket.player_tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.player_tier === 'Silver' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {ticket.player_tier}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                        {ticket.last_message && (
                          <p className="text-xs text-gray-500 truncate">{ticket.last_message}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(ticket.category)}
                        <span className="text-sm capitalize text-gray-700">{ticket.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ticket.status)}
                      {ticket.assigned_to && (
                        <p className="text-xs text-gray-500 mt-1">{ticket.assigned_to}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {getChannelIcon(ticket.channel)}
                        <span className="text-sm capitalize text-gray-700">{ticket.channel || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{formatDateTime(ticket.created_at)}</p>
                        {ticket.response_time && (
                          <p className="text-xs text-green-600">Response: {formatResponseTime(ticket.response_time)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="View">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {ticket.status === 'open' && (
                          <button className="p-1 text-green-600 hover:bg-green-50 rounded" title="Reply">
                            <Reply className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-1 text-gray-600 hover:bg-gray-50 rounded" title="Assign">
                          <User className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredTickets.length}</span> of{' '}
              <span className="font-medium">{tickets.length}</span> tickets
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Response Time Analytics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time by Priority</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Urgent</span>
              <span className="text-sm font-medium text-red-600">~5 min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">High</span>
              <span className="text-sm font-medium text-orange-600">~15 min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Medium</span>
              <span className="text-sm font-medium text-blue-600">~30 min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Low</span>
              <span className="text-sm font-medium text-gray-600">~2 hours</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Issue Categories</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Payment Issues</span>
              <span className="text-sm font-medium text-gray-900">
                {Math.round((tickets.filter(t => t.category === 'payment').length / tickets.length) * 100) || 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Bonus Queries</span>
              <span className="text-sm font-medium text-gray-900">
                {Math.round((tickets.filter(t => t.category === 'bonus').length / tickets.length) * 100) || 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Account Verification</span>
              <span className="text-sm font-medium text-gray-900">
                {Math.round((tickets.filter(t => t.category === 'verification').length / tickets.length) * 100) || 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Technical Issues</span>
              <span className="text-sm font-medium text-gray-900">
                {Math.round((tickets.filter(t => t.category === 'technical').length / tickets.length) * 100) || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
          <div className="space-y-3">
            {tickets.filter(t => t.assigned_to).reduce((acc: Array<{ name: string, count: number }>, ticket) => {
              const agent = ticket.assigned_to!
              const existing = acc.find(a => a.name === agent)
              if (existing) {
                existing.count++
              } else {
                acc.push({ name: agent, count: 1 })
              }
              return acc
            }, []).slice(0, 3).map((agent, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{agent.name}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium">4.8</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{agent.count} tickets</div>
              </div>
            ))}
            {tickets.filter(t => t.assigned_to).length === 0 && (
              <p className="text-sm text-gray-500">No agents assigned yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
