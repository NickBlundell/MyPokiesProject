import type { JackpotPool, JackpotTicket } from '@mypokies/types'

export class JackpotManager {
  private readonly CONTRIBUTION_RATE = 0.005 // 0.5% of wagers

  /**
   * Calculate contribution to jackpot pool
   */
  calculateContribution(wagerAmount: number): number {
    return wagerAmount * this.CONTRIBUTION_RATE
  }

  /**
   * Calculate winning odds for a player
   */
  calculateOdds(playerTickets: number, totalTickets: number): number {
    if (totalTickets === 0) return 0
    return (playerTickets / totalTickets) * 100
  }

  /**
   * Get time until next draw
   */
  getTimeUntilDraw(nextDrawAt: string): {
    days: number
    hours: number
    minutes: number
    seconds: number
  } {
    const now = new Date()
    const drawTime = new Date(nextDrawAt)
    const diff = drawTime.getTime() - now.getTime()

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { days, hours, minutes, seconds }
  }

  /**
   * Format countdown for display
   */
  formatCountdown(nextDrawAt: string): string {
    const { days, hours, minutes, seconds } = this.getTimeUntilDraw(nextDrawAt)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    }
    return `${minutes}m ${seconds}s`
  }

  /**
   * Check if draw should happen
   */
  shouldDraw(pool: JackpotPool): boolean {
    const now = new Date()
    const nextDraw = new Date(pool.next_draw_at || '')

    return now >= nextDraw && pool.status === 'active'
  }

  /**
   * Calculate prize distribution
   */
  calculatePrizeDistribution(poolAmount: number): {
    grand: number
    major: number[]
    minor: number[]
  } {
    // Standard distribution:
    // Grand: 40% (1 winner)
    // Major: 30% (3 winners, 10% each)
    // Minor: 30% (10 winners, 3% each)

    return {
      grand: poolAmount * 0.4,
      major: Array(3).fill(poolAmount * 0.1),
      minor: Array(10).fill(poolAmount * 0.03),
    }
  }

  /**
   * Select random winners from tickets
   */
  selectWinners(
    tickets: JackpotTicket[],
    winnerCount: number
  ): JackpotTicket[] {
    const shuffled = [...tickets].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, winnerCount)
  }

  /**
   * Validate ticket eligibility
   */
  isTicketEligible(ticket: JackpotTicket, drawTime: Date): boolean {
    const ticketTime = new Date(ticket.earned_at)
    return ticket.draw_eligible && ticketTime < drawTime
  }
}