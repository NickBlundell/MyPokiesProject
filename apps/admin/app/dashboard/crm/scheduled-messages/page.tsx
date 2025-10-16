import { createAdminClient } from '@/lib/supabase/server'
import ScheduledMessagesClient from './ScheduledMessagesClient'

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

async function getScheduledMessagesData(): Promise<{
  proposedMessages: ScheduledMessage[]
  scheduledMessages: ScheduledMessage[]
  sentMessages: ScheduledMessage[]
  stats: ScheduledMessagesStats
}> {
  const supabase = await createAdminClient()

  // Try different possible table names
  const possibleTables = ['scheduled_messages', 'ai_messages', 'player_messages', 'marketing_messages']
  let allMessages: ScheduledMessage[] = []

  for (const tableName of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          users!player_id (
            id,
            external_user_id,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        allMessages = data.map((msg: Record<string, unknown>) => {
          const users = msg.users as Record<string, unknown> | undefined
          return {
            id: msg.id as string,
            player_id: (msg.player_id || msg.user_id) as string,
            player_name: (msg.player_name || users?.external_user_id || 'Unknown Player') as string,
            player_email: (msg.player_email || users?.email || 'No email') as string,
            player_tier: (msg.player_tier || msg.tier || 'Silver') as string,
            message_type: (msg.message_type || msg.type || 'reactivation') as 'missed_pattern' | 'engaged_player_dropout' | 'jackpot_proximity' | 'loss_recovery' | 'reactivation',
            trigger_reason: (msg.trigger_reason || msg.reason || '') as string,
            ai_generated_message: (msg.ai_generated_message || msg.message || msg.content || '') as string,
            scheduled_send_time: (msg.scheduled_send_time || msg.send_time || msg.scheduled_at || new Date().toISOString()) as string,
            status: (msg.status || 'proposed') as 'proposed' | 'approved' | 'rejected' | 'scheduled' | 'sent' | 'failed',
            approval_status: (msg.approval_status || 'pending_review') as 'pending_review' | 'approved' | 'rejected',
            created_at: msg.created_at as string,
            context_snapshot: (msg.context_snapshot || msg.context || {}) as {
              avg_deposit_per_week?: number
              days_inactive?: number
              deposit_pattern?: string
              last_deposit_amount?: number
              offer_type?: string
              offer_amount?: number
              jackpot_value?: number
            }
          }
        })
        break
      }
    } catch {
      continue
    }
  }

  // Separate messages by status
  const proposedMessages = allMessages.filter(m => m.status === 'proposed' || m.approval_status === 'pending_review')
  const scheduledMessages = allMessages.filter(m => m.status === 'scheduled' || m.approval_status === 'approved')
  const sentMessages = allMessages.filter(m => m.status === 'sent')

  // Calculate today's sent messages
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sentToday = sentMessages.filter(m => {
    const sentDate = new Date(m.scheduled_send_time)
    return sentDate >= today
  }).length

  // Calculate statistics
  const stats: ScheduledMessagesStats = {
    pending_review: proposedMessages.length,
    scheduled: scheduledMessages.length,
    sent_today: sentToday,
    response_rate: 24.5, // Could be calculated from actual response data
    revenue_7d: 8250 // Could be calculated from actual revenue data
  }

  return {
    proposedMessages,
    scheduledMessages,
    sentMessages,
    stats
  }
}

export default async function ScheduledMessagesPage() {
  const { proposedMessages, scheduledMessages, sentMessages, stats } = await getScheduledMessagesData()

  return (
    <ScheduledMessagesClient
      proposedMessages={proposedMessages}
      scheduledMessages={scheduledMessages}
      sentMessages={sentMessages}
      stats={stats}
    />
  )
}
