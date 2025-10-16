import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import DashboardClient from './DashboardClient'

interface KPIData {
  total_players: number
  active_players_24h: number
  today_deposits: number
  today_revenue: number
  active_bonuses: number
  vip_players: number
  today_withdrawals: number
  pending_kyc: number
}

async function getDashboardKPIs(): Promise<KPIData> {
  const supabase = await createAdminClient()

  const kpis: KPIData = {
    total_players: 0,
    active_players_24h: 0,
    today_deposits: 0,
    today_revenue: 0,
    active_bonuses: 0,
    vip_players: 0,
    today_withdrawals: 0,
    pending_kyc: 0
  }

  try {
    // Get total players count
    const { count: totalPlayers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    kpis.total_players = totalPlayers || 0

    // Get active players in last 24 hours
    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)

    const { count: activePlayers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', oneDayAgo.toISOString())

    kpis.active_players_24h = activePlayers || 0

    // Get today's financial data
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const possibleTables = ['transactions', 'financial_transactions', 'payments']

    for (const tableName of possibleTables) {
      try {
        const { data: transactions } = await supabase
          .from(tableName)
          .select('type, subtype, amount')
          .gte('created_at', today.toISOString())

        if (transactions) {
          kpis.today_deposits = transactions
            .filter(t => t.type === 'credit' && t.subtype === 'deposit')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)

          kpis.today_revenue = transactions
            .filter(t => t.type === 'debit' && (t.subtype === 'bet' || t.subtype === 'wager'))
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)

          kpis.today_withdrawals = transactions
            .filter(t => t.type === 'debit' && t.subtype === 'withdrawal')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)

          break
        }
      } catch {
        continue
      }
    }

    // Get active bonuses
    const possibleBonusTables = ['player_bonuses', 'bonus_assignments', 'bonuses']

    for (const tableName of possibleBonusTables) {
      try {
        const { count: activeBonuses } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')

        if (activeBonuses !== null) {
          kpis.active_bonuses = activeBonuses
          break
        }
      } catch {
        continue
      }
    }

    // Get VIP players (players with tier >= Gold or high deposits)
    const { data: vipPlayers } = await supabase
      .from('users')
      .select(`
        id,
        player_loyalty (
          total_points_earned
        )
      `)

    if (vipPlayers) {
      kpis.vip_players = vipPlayers.filter((p: Record<string, unknown>) => {
        const points = ((p.player_loyalty as Array<Record<string, unknown>>)?.[0]?.total_points_earned as number) || 0
        return points >= 2500 // Gold tier or higher
      }).length
    }

    // Get pending KYC
    const possibleKYCTables = ['kyc_verifications', 'kyc_submissions', 'user_verifications']

    for (const tableName of possibleKYCTables) {
      try {
        const { count: pendingKYC } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (pendingKYC !== null) {
          kpis.pending_kyc = pendingKYC
          break
        }
      } catch {
        continue
      }
    }

  } catch (error) {
    logger.error('Error fetching dashboard KPIs', error, {
      function: 'getDashboardKPIs',
    })
  }

  return kpis
}

export default async function DashboardPage() {
  const kpis = await getDashboardKPIs()

  return <DashboardClient kpis={kpis} />
}
