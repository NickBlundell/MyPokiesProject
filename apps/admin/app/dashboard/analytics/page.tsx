import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import AnalyticsClient from './AnalyticsClient'

interface ChartDataPoint {
  label: string
  value: number
}

interface GamePerformance {
  name: string
  revenue: number
  players: number
  rtp: number
  trend: number
}

interface AnalyticsStats {
  total_revenue: number
  net_profit: number
  total_deposits: number
  total_withdrawals: number
  active_players: number
  revenue_change: number
  profit_change: number
  deposits_change: number
  withdrawals_change: number
  players_change: number
  avg_daily_revenue: number
  peak_revenue: number
  growth_rate: number
  projected_revenue: number
  deposit_count: number
  withdrawal_count: number
  bonus_value: number
  bonus_count: number
  avg_fee_percentage: number
}

async function getAnalyticsData(dateRange: string = '7d'): Promise<{
  revenueData: ChartDataPoint[]
  depositData: ChartDataPoint[]
  withdrawalData: ChartDataPoint[]
  profitData: ChartDataPoint[]
  playerActivity: ChartDataPoint[]
  gamePerformance: GamePerformance[]
  stats: AnalyticsStats
}> {
  const supabase = await createAdminClient()

  // Calculate date range
  const now = new Date()
  const daysMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }
  const days = daysMap[dateRange] || 7
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)

  // Initialize default data
  const stats: AnalyticsStats = {
    total_revenue: 0,
    net_profit: 0,
    total_deposits: 0,
    total_withdrawals: 0,
    active_players: 0,
    revenue_change: 0,
    profit_change: 0,
    deposits_change: 0,
    withdrawals_change: 0,
    players_change: 0,
    avg_daily_revenue: 0,
    peak_revenue: 0,
    growth_rate: 0,
    projected_revenue: 0,
    deposit_count: 0,
    withdrawal_count: 0,
    bonus_value: 0,
    bonus_count: 0,
    avg_fee_percentage: 0
  }

  const revenueData: ChartDataPoint[] = []
  const depositData: ChartDataPoint[] = []
  const withdrawalData: ChartDataPoint[] = []
  const profitData: ChartDataPoint[] = []
  const playerActivity: ChartDataPoint[] = []
  let gamePerformance: GamePerformance[] = []

  try {
    // Try to fetch transactions data
    const possibleTables = ['transactions', 'financial_transactions', 'payments']

    for (const tableName of possibleTables) {
      try {
        const { data: transactions, error } = await supabase
          .from(tableName)
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })

        if (!error && transactions && transactions.length > 0) {
          // Calculate daily aggregates
          const dailyData: Record<string, { revenue: number, deposits: number, withdrawals: number, profit: number, players: Set<string> }> = {}

          // Initialize all days in range
          for (let i = 0; i < days; i++) {
            const date = new Date(startDate)
            date.setDate(date.getDate() + i)
            const label = days === 1 ? `${date.getHours()}:00` : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            dailyData[label] = { revenue: 0, deposits: 0, withdrawals: 0, profit: 0, players: new Set() }
          }

          transactions.forEach((txn: Record<string, unknown>) => {
            const txnDate = new Date(txn.created_at as string)
            const label = days === 1
              ? `${txnDate.getHours()}:00`
              : txnDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

            if (!dailyData[label]) return

            const amount = Number(txn.amount) || 0
            const userId = txn.user_id || txn.player_id

            if (userId) {
              dailyData[label].players.add(userId as string)
            }

            if (txn.type === 'credit' && txn.subtype === 'deposit') {
              dailyData[label].deposits += amount
              stats.total_deposits += amount
              stats.deposit_count++
            } else if (txn.type === 'debit' && txn.subtype === 'withdrawal') {
              dailyData[label].withdrawals += amount
              stats.total_withdrawals += amount
              stats.withdrawal_count++
            } else if (txn.type === 'debit' && (txn.subtype === 'bet' || txn.subtype === 'wager')) {
              dailyData[label].revenue += amount
              stats.total_revenue += amount
            }
          })

          // Build chart data arrays
          Object.entries(dailyData).forEach(([label, data]) => {
            const revenue = data.revenue
            const deposits = data.deposits
            const withdrawals = data.withdrawals
            const profit = deposits - withdrawals

            revenueData.push({ label, value: revenue })
            depositData.push({ label, value: deposits })
            withdrawalData.push({ label, value: withdrawals })
            profitData.push({ label, value: profit })
            playerActivity.push({ label, value: data.players.size })

            stats.net_profit += profit
            if (revenue > stats.peak_revenue) {
              stats.peak_revenue = revenue
            }
          })

          // Calculate additional stats
          stats.avg_daily_revenue = stats.total_revenue / days
          stats.growth_rate = 0 // Would require historical comparison
          stats.projected_revenue = stats.avg_daily_revenue * 30

          // Get active players count
          const uniquePlayers = new Set(transactions.map((t: Record<string, unknown>) => t.user_id || t.player_id).filter(Boolean))
          stats.active_players = uniquePlayers.size

          break
        }
      } catch {
        continue
      }
    }

    // Try to fetch game performance data
    const possibleGameTables = ['game_sessions', 'game_plays', 'game_rounds']

    for (const tableName of possibleGameTables) {
      try {
        const { data: gameSessions, error } = await supabase
          .from(tableName)
          .select('*')
          .gte('created_at', startDate.toISOString())

        if (!error && gameSessions && gameSessions.length > 0) {
          const gameStats: Record<string, { revenue: number, wagered: number, players: Set<string>, wins: number }> = {}

          gameSessions.forEach((session: Record<string, unknown>) => {
            const gameType = (session.game_type as string) || (session.game_category as string) || 'Unknown'

            if (!gameStats[gameType]) {
              gameStats[gameType] = { revenue: 0, wagered: 0, players: new Set(), wins: 0 }
            }

            const bet = Number(session.bet_amount || session.wager || 0)
            const win = Number(session.win_amount || session.payout || 0)

            gameStats[gameType].wagered += bet
            gameStats[gameType].wins += win
            gameStats[gameType].revenue += (bet - win)

            if (session.user_id || session.player_id) {
              gameStats[gameType].players.add((session.user_id || session.player_id) as string)
            }
          })

          gamePerformance = Object.entries(gameStats).map(([name, data]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            revenue: data.revenue,
            players: data.players.size,
            rtp: data.wagered > 0 ? (data.wins / data.wagered) * 100 : 0,
            trend: 0 // Would require historical comparison
          }))

          break
        }
      } catch {
        continue
      }
    }

    // Try to get bonus data
    const possibleBonusTables = ['player_bonuses', 'bonuses', 'bonus_claims']

    for (const tableName of possibleBonusTables) {
      try {
        const { data: bonuses, error } = await supabase
          .from(tableName)
          .select('*')
          .gte('created_at', startDate.toISOString())

        if (!error && bonuses) {
          stats.bonus_count = bonuses.length
          stats.bonus_value = bonuses.reduce((sum: number, b: Record<string, unknown>) =>
            sum + (Number(b.amount) || Number(b.bonus_amount) || 0), 0
          )
          break
        }
      } catch {
        continue
      }
    }

  } catch (error) {
    logger.error('Error fetching analytics data', error, {
      function: 'getAnalyticsData',
    })
  }

  return {
    revenueData,
    depositData,
    withdrawalData,
    profitData,
    playerActivity,
    gamePerformance,
    stats
  }
}

export default async function AnalyticsPage() {
  const { revenueData, depositData, withdrawalData, profitData, playerActivity, gamePerformance, stats } = await getAnalyticsData('7d')

  return (
    <AnalyticsClient
      revenueData={revenueData}
      depositData={depositData}
      withdrawalData={withdrawalData}
      profitData={profitData}
      playerActivity={playerActivity}
      gamePerformance={gamePerformance}
      stats={stats}
    />
  )
}
