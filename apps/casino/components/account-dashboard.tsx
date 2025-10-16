'use client'

import { Star, Ticket, Clock, Gift, ChevronRight } from 'lucide-react'
import { usePlayerLoyalty, usePlayerTickets, usePlayerBonuses } from '@/lib/contexts/player-context'
import { useState, useRef, useEffect, memo } from 'react'
import Link from 'next/link'
import { logError } from '@/lib/utils/client-logger'

interface AccountDashboardProps {
  userName?: string
}

// Helper function to get next Wednesday 8 PM
function getNextDrawDate(): Date {
  const now = new Date()
  const nextDraw = new Date(now)

  // Get current day (0 = Sunday, 3 = Wednesday)
  const currentDay = now.getDay()
  const currentHour = now.getHours()

  // Calculate days until next Wednesday
  let daysUntilWednesday = (3 - currentDay + 7) % 7

  // If it's Wednesday but past 8 PM, move to next Wednesday
  if (currentDay === 3 && currentHour >= 20) {
    daysUntilWednesday = 7
  }

  // If today is after Wednesday, or it's Wednesday past 8 PM, add the days
  if (daysUntilWednesday === 0 && currentDay !== 3) {
    daysUntilWednesday = 7
  }

  nextDraw.setDate(now.getDate() + daysUntilWednesday)
  nextDraw.setHours(20, 0, 0, 0) // 8 PM

  return nextDraw
}

// Helper function to format time remaining
function formatTimeRemaining(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else {
    return `${minutes}m ${seconds}s`
  }
}

// PERFORMANCE FIX: Memoize AccountDashboard to prevent unnecessary re-renders
// Only re-renders when userName or player data changes
export const AccountDashboard = memo(function AccountDashboard({ userName }: AccountDashboardProps) {
  const { loyalty, loading: loyaltyLoading } = usePlayerLoyalty()
  const { ticketCount, loading: ticketsLoading } = usePlayerTickets()
  usePlayerBonuses() // Data available but not used in this view
  const [activeCard, setActiveCard] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  interface Offer {
    id: string
    bonus_name: string
    match_percentage?: number
    max_bonus_amount?: number
    bonus_code: string
  }
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([])

  // Fetch available offers
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await fetch('/api/bonuses/available')
        if (response.ok) {
          const data = await response.json()
          setAvailableOffers(data.offers || [])
        }
      } catch (error) {
        logError('Error fetching offers', { data: error, context: 'AccountDashboard' })
      }
    }
    fetchOffers()
  }, [])

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const nextDraw = getNextDrawDate()
      const now = new Date()
      const remaining = nextDraw.getTime() - now.getTime()

      if (remaining > 0) {
        setTimeRemaining(formatTimeRemaining(remaining))
      } else {
        setTimeRemaining('Draw in progress...')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  // Calculate progress percentage to next tier
  const progressPercentage = loyalty?.points_to_next_tier
    ? Math.min(100, ((loyalty.total_points % loyalty.points_to_next_tier) / loyalty.points_to_next_tier) * 100)
    : 0

  // Format the tier transition text
  const tierTransition = loyalty?.next_tier_name
    ? `${loyalty.tier_name} → ${loyalty.next_tier_name}`
    : loyalty?.tier_name || 'Bronze'

  // Get tier color based on tier name
  const getTierColor = (tierName: string) => {
    switch (tierName) {
      case 'Bronze':
        return { from: '#8B4513', to: '#CD853F' } // Bronze - rich brown with gradient
      case 'Silver':
        return { from: '#c0c0c0', to: '#e8e8e8' } // Silver - light gray
      case 'Gold':
        return { from: '#d4af37', to: '#f4d03f' } // Gold - rich gold
      case 'Platinum':
        return { from: '#14b8a6', to: '#2dd4bf' } // Platinum - teal
      case 'Diamond':
        return { from: '#b9f2ff', to: '#e0f7ff' } // Diamond - light blue/cyan
      default:
        return { from: '#3b82f6', to: '#60a5fa' } // Default blue
    }
  }

  const currentTierName = loyalty?.tier_name || 'Bronze'
  const tierColors = getTierColor(currentTierName)

  // Default values when no data
  const totalPoints = loyalty?.total_points || 0
  const pointsToNext = loyalty?.points_to_next_tier || 0
  const myTickets = ticketCount

  // VIP tier wager requirements for tickets
  const tierWagerRequirements = {
    'Bronze': 250,
    'Silver': 225,
    'Gold': 200,
    'Platinum': 175,
    'Diamond': 150
  }

  const currentTier = loyalty?.tier_name || 'Bronze'
  const wagerPerTicket = tierWagerRequirements[currentTier as keyof typeof tierWagerRequirements] || 250

  // TODO (tracked in TODO.md): Implement real-time wagering tracker for next jackpot ticket
  //   - Add user_jackpot_wagering table to track cumulative wagering
  //   - Update on each debit transaction: wagering_progress += bet_amount
  //   - Reset to 0 when ticket is awarded (wagering_progress >= wagerPerTicket)
  //   - Real-time updates via Supabase subscription
  // Currently using placeholder calculation for UI demonstration
  const currentWagerProgress = loyalty ? Math.floor(Math.random() * wagerPerTicket) : 0
  const wagerProgressPercent = (currentWagerProgress / wagerPerTicket) * 100

  // Handle scroll to update active indicator
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollPosition = scrollContainerRef.current.scrollLeft
        const containerWidth = scrollContainerRef.current.offsetWidth
        const newActiveCard = Math.round(scrollPosition / containerWidth)
        setActiveCard(newActiveCard)
      }
    }

    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        {/* Mobile Carousel */}
        <div className="lg:hidden">
          <div ref={scrollContainerRef} className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              {/* VIP Progress Card - Mobile Carousel */}
              <div
                className="rounded-xl p-3 snap-start relative overflow-hidden"
                style={{
                  width: 'calc(66.666vw)',
                  background: `linear-gradient(135deg, ${tierColors.from}, ${tierColors.to})`,
                  border: `2px solid ${tierColors.from}`
                }}
              >
                {/* Decorative background circles */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>

                <div className="relative z-10">
                  {/* Header with name and star */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white drop-shadow-lg">{userName || 'Player'}</h3>
                    <Star className="w-4 h-4 text-white/80" />
                  </div>

                  {loyaltyLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-white/20 rounded mb-2"></div>
                      <div className="h-3 bg-white/20 rounded"></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Left: Circular VIP Progress */}
                      <div className="flex-shrink-0">
                        <div className="relative w-16 h-16">
                          <svg className="w-full h-full transform -rotate-90">
                            <defs>
                              <linearGradient id="vipProgressGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
                                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.95)" />
                                <stop offset="100%" stopColor="rgba(255, 255, 255, 1)" />
                              </linearGradient>
                            </defs>
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="rgba(0, 0, 0, 0.2)"
                              strokeWidth="6"
                              fill="none"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="url(#vipProgressGradientMobile)"
                              strokeWidth="6"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercentage / 100)}`}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-base font-bold text-white drop-shadow-lg">{progressPercentage.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Tier Info Box */}
                      <div className="flex-1 space-y-1 bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/80">Tier</span>
                          <span className="text-[10px] font-semibold text-white drop-shadow">{tierTransition}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/80">Points</span>
                          <span className="text-[10px] font-semibold text-white drop-shadow">{totalPoints.toLocaleString()}</span>
                        </div>
                        {loyalty?.next_tier_name && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white/80">To Next</span>
                            <span className="text-[10px] font-semibold text-white drop-shadow">{pointsToNext.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Jackpot Tickets Card - Mobile Carousel */}
              <div
                className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl p-3 relative overflow-hidden snap-start"
                style={{ width: 'calc(66.666vw)' }}
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <Ticket className="w-4 h-4 text-[#0a0f14]" />
                    <h3 className="text-sm font-bold text-[#0a0f14]">Weekly Jackpot</h3>
                  </div>

                  {ticketsLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-[#0a0f14] bg-opacity-20 rounded mb-2"></div>
                      <div className="h-3 bg-[#0a0f14] bg-opacity-20 rounded"></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Left: Circular Progress for Next Ticket */}
                      <div className="flex-shrink-0">
                        <div className="relative w-16 h-16">
                          <svg className="w-full h-full transform -rotate-90">
                            <defs>
                              <linearGradient id="progressGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1e40af" />
                                <stop offset="50%" stopColor="#2563eb" />
                                <stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                            </defs>
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="rgba(10, 15, 20, 0.2)"
                              strokeWidth="6"
                              fill="none"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="url(#progressGradientMobile)"
                              strokeWidth="6"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              strokeDashoffset={`${2 * Math.PI * 28 * (1 - wagerProgressPercent / 100)}`}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-xs font-bold text-[#0a0f14]">${currentWagerProgress}</p>
                            <p className="text-[7px] text-[#0a0f14] opacity-70">of ${wagerPerTicket}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Tickets and Timer */}
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="bg-[#0a0f14] bg-opacity-20 backdrop-blur-sm rounded-lg p-2 text-center">
                          <Ticket className="w-3.5 h-3.5 text-[#0a0f14] mx-auto mb-0.5" />
                          <p className="text-[7px] text-[#0a0f14] mb-0.5">Tickets</p>
                          <p className="text-xs font-bold text-[#0a0f14]">{myTickets.toLocaleString()}</p>
                        </div>

                        <div className="bg-[#0a0f14] bg-opacity-20 backdrop-blur-sm rounded-lg p-2 text-center">
                          <Clock className="w-3.5 h-3.5 text-[#0a0f14] mx-auto mb-0.5" />
                          <p className="text-[7px] text-[#0a0f14] mb-0.5">Next Draw</p>
                          <p className="text-[8px] font-bold text-[#0a0f14]">{timeRemaining}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-2">
            <button
              className={`w-2 h-2 rounded-full transition-all ${activeCard === 0 ? 'bg-blue-500 w-6' : 'bg-gray-500'}`}
              onClick={() => {
                scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
              }}
            />
            <button
              className={`w-2 h-2 rounded-full transition-all ${activeCard === 1 ? 'bg-blue-500 w-6' : 'bg-gray-500'}`}
              onClick={() => {
                scrollContainerRef.current?.scrollTo({ left: scrollContainerRef.current.offsetWidth, behavior: 'smooth' })
              }}
            />
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          {/* VIP Progress Card - Desktop */}
          <div
            className="rounded-xl p-6 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${tierColors.from}, ${tierColors.to})`,
              border: `2px solid ${tierColors.from}`
            }}
          >
            {/* Decorative background circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white drop-shadow-lg">{userName || 'Player'}</h3>
                <Star className="w-6 h-6 text-white/80" />
              </div>

              {loyaltyLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded mb-4"></div>
                  <div className="h-3 bg-gray-700 rounded mb-2"></div>
                </div>
              ) : (
                <>
                  {/* Circular VIP Progress */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative w-36 h-36 mb-3">
                      {/* Background circle */}
                      <svg className="w-full h-full transform -rotate-90">
                        <defs>
                          <linearGradient id="vipProgressGradientDesktop" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
                            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.95)" />
                            <stop offset="100%" stopColor="rgba(255, 255, 255, 1)" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="72"
                          cy="72"
                          r="62"
                          stroke="rgba(0, 0, 0, 0.2)"
                          strokeWidth="14"
                          fill="none"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="72"
                          cy="72"
                          r="62"
                          stroke="url(#vipProgressGradientDesktop)"
                          strokeWidth="14"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 62}`}
                          strokeDashoffset={`${2 * Math.PI * 62 * (1 - progressPercentage / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-bold text-white drop-shadow-lg">{progressPercentage.toFixed(0)}%</p>
                        <p className="text-[10px] text-white/90 drop-shadow">VIP Progress</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/80">Current Tier</span>
                      <span className="text-xs font-semibold text-white drop-shadow">{tierTransition}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/80">Total Points</span>
                      <span className="text-xs font-semibold text-white drop-shadow">{totalPoints.toLocaleString()}</span>
                    </div>
                    {loyalty?.next_tier_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/80">Points to {loyalty.next_tier_name}</span>
                        <span className="text-xs font-semibold text-white drop-shadow">{pointsToNext.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Jackpot Tickets Card */}
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Ticket className="w-5 h-5 text-[#0a0f14]" />
                <h3 className="text-base font-bold text-[#0a0f14]">Weekly Jackpot</h3>
              </div>

              {ticketsLoading ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-24 h-24 rounded-full bg-[#0a0f14] bg-opacity-20 animate-pulse mb-2"></div>
                  <div className="h-4 w-20 bg-[#0a0f14] bg-opacity-20 rounded animate-pulse"></div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {/* Circular Progress for Next Ticket */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32 mb-2">
                      {/* Background circle */}
                      <svg className="w-full h-full transform -rotate-90">
                        <defs>
                          <linearGradient id="progressGradientDesktop" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1e40af" />
                            <stop offset="50%" stopColor="#2563eb" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="rgba(10, 15, 20, 0.2)"
                          strokeWidth="14"
                          fill="none"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="url(#progressGradientDesktop)"
                          strokeWidth="14"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - wagerProgressPercent / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-base font-bold text-[#0a0f14]">${currentWagerProgress}</p>
                        <p className="text-[9px] text-[#0a0f14] opacity-70">of ${wagerPerTicket}</p>
                      </div>
                    </div>
                    <p className="text-[#0a0f14] text-xs font-semibold opacity-70">
                      to next ticket
                    </p>
                  </div>

                  {/* Tickets and Timer Row */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="bg-[#0a0f14] bg-opacity-20 backdrop-blur-sm rounded-lg p-2 text-center">
                      <Ticket className="w-5 h-5 text-[#0a0f14] mx-auto mb-0.5" />
                      <p className="text-[9px] text-[#0a0f14] mb-0.5">Tickets</p>
                      <p className="text-base font-bold text-[#0a0f14]">{myTickets.toLocaleString()}</p>
                    </div>

                    <div className="bg-[#0a0f14] bg-opacity-20 backdrop-blur-sm rounded-lg p-2 text-center">
                      <Clock className="w-5 h-5 text-[#0a0f14] mx-auto mb-0.5" />
                      <p className="text-[9px] text-[#0a0f14] mb-0.5">Next Draw</p>
                      <p className="text-[10px] font-bold text-[#0a0f14]">{timeRemaining}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Promotions & Offers Card */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-white" />
                  <h3 className="text-base font-bold text-white">Promotions</h3>
                </div>
                <Link href="/promotions" className="text-white hover:text-white/80 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              {availableOffers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <p className="text-white/70 text-sm text-center">No active promotions</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent" style={{ maxHeight: 'calc(100% - 50px)' }}>
                  {availableOffers.map((offer) => (
                    <div key={offer.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{offer.bonus_name}</p>
                          <p className="text-white/80 text-xs mt-0.5">
                            {offer.match_percentage ? `${offer.match_percentage}% Match` : 'Special Offer'}
                            {offer.max_bonus_amount && ` • Up to $${offer.max_bonus_amount}`}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-block bg-white/20 text-white text-[9px] font-bold px-2 py-1 rounded">
                            {offer.bonus_code}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
