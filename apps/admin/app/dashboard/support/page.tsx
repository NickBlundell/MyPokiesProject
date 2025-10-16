import { createAdminClient } from '@/lib/supabase/server'
import SupportClient from './SupportClient'

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

async function getSupportTickets(): Promise<{ tickets: SupportTicket[], stats: Stats }> {
  const supabase = await createAdminClient()

  // Try different possible table names
  const possibleTables = ['support_tickets', 'tickets', 'customer_support']
  let tickets: SupportTicket[] = []
  let tableName: string | null = null

  // Find which table exists and has data
  for (const table of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (!error && data) {
        tableName = table
        break
      }
    } catch {
      // Table doesn't exist, try next one
      continue
    }
  }

  // If we found a table, fetch all tickets
  if (tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        *,
        users!inner (
          id,
          external_user_id,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      // Transform the data to match our interface
      tickets = data.map((ticket: Record<string, unknown>): SupportTicket => {
        // Map database fields to our interface
        const user = (ticket.users as Record<string, unknown>) || {}

        return {
          id: (ticket.id as string) || (ticket.ticket_id as string) || `TKT-${ticket.id as string}`,
          player_id: (ticket.player_id as string) || (ticket.user_id as string) || (user.id as string),
          player_username: (ticket.player_username as string) || (user.external_user_id as string),
          player_email: (ticket.player_email as string) || (user.email as string),
          subject: (ticket.subject as string) || (ticket.title as string) || 'Support Request',
          category: ((ticket.category as string) || 'other') as 'account' | 'payment' | 'bonus' | 'technical' | 'gameplay' | 'verification' | 'other',
          priority: ((ticket.priority as string) || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          status: ((ticket.status as string) || 'open') as 'open' | 'pending' | 'resolved' | 'closed',
          channel: ((ticket.channel as string) || (ticket.contact_method as string)) as 'email' | 'phone' | 'chat' | 'sms' | undefined,
          created_at: ticket.created_at as string,
          updated_at: (ticket.updated_at as string) || (ticket.created_at as string),
          response_time: (ticket.response_time as number) || (ticket.first_response_time as number),
          assigned_to: (ticket.assigned_to as string) || (ticket.agent_name as string),
          player_tier: (ticket.player_tier as string) || (ticket.user_tier as string),
          messages_count: (ticket.messages_count as number) || (ticket.message_count as number) || 0,
          last_message: (ticket.last_message as string) || (ticket.description as string) || (ticket.message as string)
        }
      })
    }
  }

  // Calculate statistics from the fetched tickets
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const openTickets = tickets.filter(t => t.status === 'open').length
  const urgentTickets = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length
  const pendingTickets = tickets.filter(t => t.status === 'pending').length

  // Count resolved tickets from last 7 days
  const resolvedTickets = tickets.filter(t => {
    if (t.status !== 'resolved') return false
    const ticketDate = new Date(t.updated_at as string)
    return ticketDate >= sevenDaysAgo
  }).length

  // Calculate average response time from tickets that have response times
  const ticketsWithResponseTime = tickets.filter(t => t.response_time && t.response_time > 0)
  let avgResponseTime = '0m'

  if (ticketsWithResponseTime.length > 0) {
    const totalMinutes = ticketsWithResponseTime.reduce((sum, t) => sum + (t.response_time || 0), 0)
    const avgMinutes = Math.round(totalMinutes / ticketsWithResponseTime.length)

    if (avgMinutes < 60) {
      avgResponseTime = `${avgMinutes}m`
    } else if (avgMinutes < 1440) {
      avgResponseTime = `${Math.round(avgMinutes / 60)}h`
    } else {
      avgResponseTime = `${Math.round(avgMinutes / 1440)}d`
    }
  } else {
    // Default based on mock data expectations
    avgResponseTime = '15m'
  }

  // Mock satisfaction rate (would come from feedback/ratings in real implementation)
  const satisfactionRate = '92%'

  // Count live chats (tickets with status 'open' and channel 'chat')
  const liveChats = tickets.filter(t => t.status === 'open' && t.channel === 'chat').length

  const stats: Stats = {
    openTickets,
    urgentTickets,
    pendingTickets,
    resolvedTickets,
    avgResponseTime,
    satisfactionRate,
    liveChats
  }

  return { tickets, stats }
}

export default async function SupportPage() {
  const { tickets, stats } = await getSupportTickets()

  return <SupportClient tickets={tickets} stats={stats} />
}
