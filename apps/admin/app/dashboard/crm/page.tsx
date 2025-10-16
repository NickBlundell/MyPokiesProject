import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Users,
  MessageSquare,
  Send,
  DollarSign,
  Bot,
  ArrowUp,
  ChevronRight
} from 'lucide-react'

async function getCRMStats() {
  const supabase = await createAdminClient()

  // Get total outbound messages sent
  const { count: outboundCount } = await supabase
    .from('sms_messages')
    .select('*', { count: 'exact', head: true })
    .eq('direction', 'outbound')

  // Get active conversations (people in conversation who haven't converted)
  const { count: activeConversations } = await supabase
    .from('sms_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('converted', false)
    .neq('status', 'closed')

  // Get pitched leads (leads who have been contacted but haven't signed up)
  const { count: pitchedLeads } = await supabase
    .from('marketing_leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'contacted')
    .is('player_id', null)

  // Get deposited players (converted leads who made a deposit)
  const { data: depositedPlayers } = await supabase
    .from('marketing_leads')
    .select('player_id')
    .not('player_id', 'is', null)

  let depositedCount = 0
  if (depositedPlayers && depositedPlayers.length > 0) {
    const playerIds = depositedPlayers.map(p => p.player_id).filter(Boolean)

    if (playerIds.length > 0) {
      const { count: depositsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .in('user_id', playerIds)
        .eq('type', 'credit')
        .eq('subtype', 'deposit')

      depositedCount = depositsCount || 0
    }
  }

  // Get AI response stats
  const { data: messages } = await supabase
    .from('sms_messages')
    .select('ai_generated')
    .limit(1000)

  const totalMessages = messages?.length || 0
  const aiMessages = messages?.filter(m => m.ai_generated).length || 0
  const aiResponseRate = totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0

  // Get conversion rate
  const { count: totalConversations } = await supabase
    .from('sms_conversations')
    .select('*', { count: 'exact', head: true })

  const { count: convertedConversations } = await supabase
    .from('sms_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('converted', true)

  const conversionRate = totalConversations && totalConversations > 0
    ? ((convertedConversations || 0) / totalConversations * 100).toFixed(1)
    : '0.0'

  return {
    outboundSent: outboundCount || 0,
    activeConversations: activeConversations || 0,
    pitched: pitchedLeads || 0,
    deposited: depositedCount,
    aiResponseRate,
    conversionRate
  }
}

export default async function CRMDashboard() {
  const stats = await getCRMStats()

  // Quick action cards with links
  const quickActions = [
    {
      title: 'Send Outbound SMS',
      description: 'Send initial outbound messages to leads',
      icon: Send,
      href: '/dashboard/crm/outbound',
      color: 'bg-blue-600',
      stats: { count: stats.outboundSent.toLocaleString(), label: 'Messages Sent' }
    },
    {
      title: 'Conversations',
      description: 'View AI-powered SMS conversations',
      icon: MessageSquare,
      href: '/dashboard/crm/conversations',
      color: 'bg-purple-600',
      stats: { count: stats.activeConversations.toLocaleString(), label: 'Active' }
    },
    {
      title: 'Lead Lists',
      description: 'Manage marketing lead lists and upload CSVs',
      icon: Users,
      href: '/dashboard/crm/leads',
      color: 'bg-indigo-600',
      stats: { count: stats.pitched.toLocaleString(), label: 'Pitched' }
    }
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SMS CRM Overview</h1>
          <p className="text-gray-600 mt-2">AI-powered SMS marketing and lead management</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/crm/outbound"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Outbound SMS
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.outboundSent.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Outbound Messages Sent</p>
          <p className="text-xs text-gray-500 mt-2">Total outbound SMS delivered</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <MessageSquare className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.activeConversations.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Active Conversations</p>
          <p className="text-xs text-gray-500 mt-2">Ongoing chats, not yet converted</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pitched.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Pitched Leads</p>
          <p className="text-xs text-gray-500 mt-2">Contacted but not signed up</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <ArrowUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.deposited.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Deposited</p>
          <p className="text-xs text-green-600 mt-2">Converted leads who deposited</p>
        </div>
      </div>

      {/* AI Performance Alert */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-purple-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-purple-900">AI Automation Active</h3>
            <p className="text-sm text-purple-700 mt-1">
              Your AI assistant has handled {stats.aiResponseRate}% of conversations, maintaining a {stats.conversionRate}% conversion rate.
              The AI is currently using the &quot;Friendly Casino Host&quot; persona.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-purple-600">Model: Claude 3 Opus</span>
              <span className="text-xs text-purple-600">Response Delay: 1-3 min</span>
              <span className="text-xs text-purple-600">Automated: {stats.aiResponseRate}%</span>
            </div>
          </div>
          <Link
            href="/dashboard/crm/integrations"
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
          >
            Configure AI
          </Link>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 ${action.color} rounded-lg`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{action.title}</h3>
            <p className="text-xs text-gray-600 mb-3">{action.description}</p>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-lg font-bold text-gray-900">{action.stats.count}</p>
              <p className="text-xs text-gray-500">{action.stats.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}