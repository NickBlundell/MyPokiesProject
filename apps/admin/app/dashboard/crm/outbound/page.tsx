import { createAdminClient } from '@/lib/supabase/server'
import OutboundClient from './OutboundClient'
import { MessageSquare, Users, CheckCircle, Clock } from 'lucide-react'

export interface LeadList {
  id: string
  name: string
  total_leads: number
  source: string
}

export interface RecentOutbound {
  id: string
  phone_number: string
  message_content: string
  created_at: string
  delivery_status?: string
  lead?: {
    first_name?: string
    last_name?: string
  }
}

async function getOutboundData() {
  const supabase = await createAdminClient()

  // Get lead lists for selection
  const { data: leadLists } = await supabase
    .from('lead_lists')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  // Get recent outbound messages
  const { data: recentOutbound } = await supabase
    .from('sms_messages')
    .select(`
      *,
      sms_conversations!inner(
        phone_number
      )
    `)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(50)

  // Get stats
  const { count: totalOutbound } = await supabase
    .from('sms_messages')
    .select('*', { count: 'exact', head: true })
    .eq('direction', 'outbound')

  const { count: deliveredCount } = await supabase
    .from('sms_messages')
    .select('*', { count: 'exact', head: true })
    .eq('direction', 'outbound')
    .eq('delivery_status', 'delivered')

  const { count: respondedCount } = await supabase
    .from('sms_conversations')
    .select('*', { count: 'exact', head: true })
    .gt('message_count', 1) // More than 1 message means they responded

  // Format recent outbound messages
  const formattedOutbound: RecentOutbound[] = (recentOutbound || []).map((msg: Record<string, unknown>) => {
    const smsConversations = msg.sms_conversations as Record<string, unknown> | undefined
    return {
      id: msg.id as string,
      phone_number: (smsConversations?.phone_number as string) || 'Unknown',
      message_content: msg.message_content as string,
      created_at: msg.created_at as string,
      delivery_status: msg.delivery_status as string | undefined
    }
  })

  return {
    leadLists: leadLists || [],
    recentOutbound: formattedOutbound,
    stats: {
      totalOutbound: totalOutbound || 0,
      delivered: deliveredCount || 0,
      responded: respondedCount || 0,
      deliveryRate: totalOutbound && totalOutbound > 0
        ? ((deliveredCount || 0) / totalOutbound * 100).toFixed(1)
        : '0.0',
      responseRate: totalOutbound && totalOutbound > 0
        ? ((respondedCount || 0) / totalOutbound * 100).toFixed(1)
        : '0.0'
    }
  }
}

export default async function OutboundPage() {
  const { leadLists, recentOutbound, stats } = await getOutboundData()

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Send Outbound SMS</h1>
        <p className="text-gray-600 mt-2">
          Send initial outbound messages to leads. Responses are automatically handled by AI.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalOutbound.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Sent</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.delivered.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-xs text-gray-500 mt-1">{stats.deliveryRate}% delivery rate</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.responded.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Responded</p>
          <p className="text-xs text-gray-500 mt-1">{stats.responseRate}% response rate</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">~2m</p>
          <p className="text-sm text-gray-600">Avg AI Response</p>
          <p className="text-xs text-gray-500 mt-1">Random delay 1-3 min</p>
        </div>
      </div>

      {/* Client component for compose form and recent messages */}
      <OutboundClient leadLists={leadLists} recentOutbound={recentOutbound} />
    </div>
  )
}
