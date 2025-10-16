import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import VIPClient from './VIPClient'

interface VIPPlayer {
  id: string
  username: string
  email: string
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
  points: number
  totalDeposits: number
  totalWagered: number
  joinedAt: string
  lastActive: string
  personalHost?: string
}

interface TierStats {
  tier: string
  count: number
  averageValue: number
}

// Note: tierConfig is not used in this file but kept for reference
// It's defined in VIPClient.tsx where it's actually used

function determineTier(points: number): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' {
  if (points >= 50000) return 'Diamond'
  if (points >= 10000) return 'Platinum'
  if (points >= 2500) return 'Gold'
  if (points >= 500) return 'Silver'
  return 'Bronze'
}

function formatLastActive(lastLogin: string | null): string {
  if (!lastLogin) return 'Never'

  const now = new Date()
  const lastLoginDate = new Date(lastLogin)
  const diffMs = now.getTime() - lastLoginDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return lastLoginDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function getVIPPlayers(): Promise<{ players: VIPPlayer[], tierStats: TierStats[], totalVIPPlayers: number }> {
  const supabase = await createAdminClient()

  // Try different table structures based on what might exist
  let players: VIPPlayer[] = []
  let tierStats: TierStats[] = []

  try {
    // Strategy 1: Check for dedicated vip_players table
    const { data: vipPlayersData, error: vipError } = await supabase
      .from('vip_players')
      .select('*')
      .order('points', { ascending: false })

    if (!vipError && vipPlayersData) {
      logger.debug('Found vip_players table', { function: 'getVIPPlayers' })

      // Transform vip_players data
      players = vipPlayersData.map((player: Record<string, unknown>) => ({
        id: player.id as string,
        username: (player.username as string) || (player.external_user_id as string) || `Player ${(player.id as string).slice(0, 8)}`,
        email: (player.email as string) || 'N/A',
        tier: determineTier((player.loyalty_points as number) || (player.points as number) || 0),
        points: (player.loyalty_points as number) || (player.points as number) || 0,
        totalDeposits: Number(player.total_deposits || 0),
        totalWagered: Number(player.total_wagered || 0),
        joinedAt: (player.created_at as string) || (player.joined_at as string),
        lastActive: formatLastActive((player.last_login as string) || (player.last_active as string)),
        personalHost: (player.personal_host as string) || (player.vip_host as string)
      }))
    } else {
      // Strategy 2: Query users table with loyalty points
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          player_loyalty (
            total_points_earned,
            available_points,
            current_tier_id,
            loyalty_tiers (
              tier_name,
              minimum_points
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (!usersError && usersData) {
        logger.debug('Found users table, processing VIP players', { function: 'getVIPPlayers' })

        // Get transaction data for each user
        const playersWithData = await Promise.all(
          usersData.map(async (user: Record<string, unknown>) => {
            // Get transaction statistics
            const { data: transactions } = await supabase
              .from('transactions')
              .select('type, subtype, amount, created_at')
              .eq('user_id', user.id as string)

            const deposits = transactions
              ?.filter(t => t.type === 'credit' && t.subtype === 'deposit')
              .reduce((sum, t) => sum + Number(t.amount), 0) || 0

            const wagered = transactions
              ?.filter(t => t.type === 'debit' && (t.subtype === 'bet' || t.subtype === 'wager'))
              .reduce((sum, t) => sum + Number(t.amount), 0) || 0

            // Get last login from auth metadata or transactions
            const lastTransaction = transactions?.[0]?.created_at
            const lastLogin = (user.last_sign_in_at as string) || lastTransaction

            // Calculate loyalty points
            const loyaltyPoints = ((user.player_loyalty as Array<Record<string, unknown>>)?.[0]?.total_points_earned as number) ||
                                ((user.player_loyalty as Array<Record<string, unknown>>)?.[0]?.available_points as number) ||
                                Math.floor(deposits / 10) // Fallback: 1 point per $10 deposited

            // Determine if player qualifies as VIP (Bronze tier or higher)
            const tier = determineTier(loyaltyPoints)

            return {
              id: user.id as string,
              username: (user.external_user_id as string) || `Player ${(user.id as string).slice(0, 8)}`,
              email: (user.email as string) || 'N/A',
              tier,
              points: loyaltyPoints,
              totalDeposits: deposits,
              totalWagered: wagered,
              joinedAt: user.created_at as string,
              lastActive: formatLastActive(lastLogin),
              personalHost: tier === 'Gold' || tier === 'Platinum' || tier === 'Diamond'
                ? 'VIP Team'
                : undefined
            }
          })
        )

        // Filter to only VIP players (those with points > 0 or deposits > 0)
        players = playersWithData.filter(p => p.points > 0 || p.totalDeposits > 0)

      } else {
        // Strategy 3: Check for player_tiers table
        const { data: tierData, error: tierError } = await supabase
          .from('player_tiers')
          .select('*')
          .order('points', { ascending: false })

        if (!tierError && tierData) {
          logger.debug('Found player_tiers table', { function: 'getVIPPlayers' })

          players = tierData.map((player: Record<string, unknown>) => ({
            id: (player.id as string) || (player.user_id as string),
            username: (player.username as string) || (player.player_name as string) || `Player ${((player.id as string) || (player.user_id as string)).slice(0, 8)}`,
            email: (player.email as string) || 'N/A',
            tier: determineTier((player.points as number) || (player.tier_points as number) || 0),
            points: (player.points as number) || (player.tier_points as number) || 0,
            totalDeposits: Number(player.total_deposits || 0),
            totalWagered: Number(player.total_wagered || 0),
            joinedAt: (player.created_at as string) || (player.joined_at as string),
            lastActive: formatLastActive((player.last_active as string) || (player.last_login as string)),
            personalHost: (player.vip_manager as string) || (player.account_manager as string)
          }))
        }
      }
    }

  } catch (error) {
    logger.error('Error fetching VIP players', error, {
      function: 'getVIPPlayers',
    })
    // Return empty array if error occurs (will show empty state in UI)
  }

  // Calculate tier statistics
  const tierCounts: Record<string, { count: number, totalValue: number }> = {
    Bronze: { count: 0, totalValue: 0 },
    Silver: { count: 0, totalValue: 0 },
    Gold: { count: 0, totalValue: 0 },
    Platinum: { count: 0, totalValue: 0 },
    Diamond: { count: 0, totalValue: 0 }
  }

  players.forEach(player => {
    tierCounts[player.tier].count++
    tierCounts[player.tier].totalValue += player.totalDeposits
  })

  tierStats = Object.entries(tierCounts).map(([tier, data]) => ({
    tier,
    count: data.count,
    averageValue: data.count > 0 ? data.totalValue / data.count : 0
  }))

  return {
    players: players.sort((a, b) => b.points - a.points), // Sort by points descending
    tierStats,
    totalVIPPlayers: players.length
  }
}

export default async function VIPManagementPage() {
  const { players, tierStats, totalVIPPlayers } = await getVIPPlayers()

  return (
    <VIPClient
      players={players}
      tierStats={tierStats}
      totalVIPPlayers={totalVIPPlayers}
    />
  )
}
