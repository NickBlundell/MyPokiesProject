import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import CampaignsClient from './CampaignsClient'

type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
type CampaignType = 'email' | 'sms' | 'push' | 'in_app'

export interface Campaign {
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

async function getCampaigns() {
  const supabase = await createAdminClient()

  // Fetch campaigns
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching campaigns', error, {
      function: 'getCampaigns',
      table: 'campaigns',
    })
    // Try alternative table names
    const { data: emailCampaigns } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: marketingCampaigns } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    const allCampaigns = [...(emailCampaigns || []), ...(marketingCampaigns || [])]

    const stats = calculateStats(allCampaigns)
    return { campaigns: allCampaigns, stats }
  }

  // Calculate stats from campaigns
  const stats = calculateStats(campaigns || [])

  return {
    campaigns: campaigns || [],
    stats
  }
}

function calculateStats(campaigns: Array<Record<string, unknown>>) {
  // Calculate active campaigns (this month)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const activeCampaigns = campaigns.filter(c => {
    const createdDate = new Date(c.created_at as string)
    return c.status === 'active' && createdDate >= startOfMonth
  }).length

  // Calculate total reach
  const totalReach = campaigns.reduce((sum, c) => sum + ((c.audience as number) || 0), 0)

  // Calculate average open rate
  const campaignsWithOpens = campaigns.filter(c => c.sent && (c.sent as number) > 0 && c.opened !== undefined)
  const avgOpenRate = campaignsWithOpens.length > 0
    ? campaignsWithOpens.reduce((sum, c) => {
        const rate = ((c.opened as number) / (c.sent as number)) * 100
        return sum + rate
      }, 0) / campaignsWithOpens.length
    : 0

  // Calculate total revenue
  const totalRevenue = campaigns.reduce((sum, c) => sum + ((c.revenue as number) || 0), 0)

  return {
    activeCampaigns,
    totalReach,
    avgOpenRate,
    totalRevenue
  }
}

export default async function CampaignsPage() {
  const { campaigns, stats } = await getCampaigns()

  return <CampaignsClient campaigns={campaigns} stats={stats} />
}