import { createAdminClient } from '@/lib/supabase/server'
import LeadsClient from './LeadsClient'

interface LeadList {
  id: string
  name: string
  description: string
  total_leads: number
  source: string
  campaign_type: string
  bonus_enabled: boolean
  bonus_type?: string
  bonus_amount?: number
  created_at: string
  conversion_rate: number
  contacted: number
}

interface Lead {
  id: string
  phone_number: string
  email?: string
  first_name?: string
  last_name?: string
  status: string
  last_contacted_at?: string
  contact_count: number
  tags: string[]
  list_name: string
}

interface LeadsStats {
  total_leads: number
  sms_sent: number
  registrations: number
  bonuses_assigned: number
}

async function getLeadsData(): Promise<{ leadLists: LeadList[], leads: Lead[], stats: LeadsStats }> {
  const supabase = await createAdminClient()

  // Try different possible table names for lead lists
  const possibleLeadListTables = ['lead_lists', 'lead_campaigns', 'marketing_lists']
  let leadLists: LeadList[] = []

  for (const tableName of possibleLeadListTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        leadLists = data.map((list: Record<string, unknown>) => ({
          id: list.id as string,
          name: (list.name as string) || (list.list_name as string) || 'Unnamed List',
          description: (list.description as string) || '',
          total_leads: (list.total_leads as number) || (list.lead_count as number) || 0,
          source: (list.source as string) || (list.lead_source as string) || 'unknown',
          campaign_type: (list.campaign_type as string) || (list.type as string) || 'sms',
          bonus_enabled: (list.bonus_enabled as boolean) ?? false,
          bonus_type: list.bonus_type as string | undefined,
          bonus_amount: list.bonus_amount as number | undefined,
          created_at: list.created_at as string,
          conversion_rate: (list.conversion_rate as number) || 0,
          contacted: (list.contacted as number) || (list.contacted_count as number) || 0
        }))
        break
      }
    } catch {
      continue
    }
  }

  // Try different possible table names for leads
  const possibleLeadTables = ['leads', 'marketing_leads', 'contacts']
  let leads: Lead[] = []

  for (const tableName of possibleLeadTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        leads = data.map((lead: Record<string, unknown>) => ({
          id: lead.id as string,
          phone_number: (lead.phone_number as string) || (lead.phone as string) || '',
          email: lead.email as string | undefined,
          first_name: (lead.first_name as string) || (lead.firstName as string),
          last_name: (lead.last_name as string) || (lead.lastName as string),
          status: (lead.status as string) || 'new',
          last_contacted_at: (lead.last_contacted_at as string) || (lead.lastContactedAt as string),
          contact_count: (lead.contact_count as number) || (lead.contactCount as number) || 0,
          tags: (lead.tags as string[]) || [],
          list_name: (lead.list_name as string) || (lead.listName as string) || 'Unknown List'
        }))
        break
      }
    } catch {
      continue
    }
  }

  // Calculate statistics
  const stats: LeadsStats = {
    total_leads: leads.length,
    sms_sent: leads.filter(l => l.status === 'contacted' || l.contact_count > 0).length,
    registrations: leads.filter(l => l.status === 'registered' || l.status === 'converted').length,
    bonuses_assigned: leadLists.reduce((sum, list) =>
      sum + (list.bonus_enabled ? (list.bonus_amount || 0) * list.contacted : 0), 0
    )
  }

  // If no data found, use empty arrays (will show empty state in UI)
  return { leadLists, leads, stats }
}

export default async function LeadsPage() {
  const { leadLists, leads, stats } = await getLeadsData()

  return <LeadsClient leadLists={leadLists} leads={leads} stats={stats} />
}
