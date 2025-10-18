'use client'

import Image from 'next/image'
import { Footer } from '@/components/footer'
import { JackpotCounter } from '@/components/jackpot-counter'
import { JackpotCountdown } from '@/components/jackpot-countdown'
import { useJackpotAnimation } from '@/lib/contexts/jackpot-animation-context'
import { usePlayerTickets, usePlayerLoyalty } from '@/lib/contexts/player-context'
import { Trophy, Ticket } from 'lucide-react'

interface JackpotPageProps {
  user?: {
    email?: string
    user_metadata?: {
      first_name?: string
      last_name?: string
    }
  } | null
}

export default function JackpotPage({ user }: JackpotPageProps) {
  const { currentJackpot } = useJackpotAnimation()
  const { ticketCount, ticketOdds, loading: ticketsLoading } = usePlayerTickets()
  const { loyalty, loading: loyaltyLoading } = usePlayerLoyalty()

  // Calculate user's ticket stats
  const myTickets = ticketCount
  const myOdds = ticketOdds
  const poolAmount = currentJackpot?.current_amount || 0

  // Prize breakdown (from CASINO_SYSTEM_COMPLETE.md)
  const grandPrize = poolAmount * 0.50
  const majorPrize = poolAmount * 0.10
  const minorPrize = poolAmount * 0.02

  // VIP tier wager requirements for tickets (from CASINO_SYSTEM_COMPLETE.md)
  const tierWagerRequirements = {
    'Bronze': 250,
    'Silver': 225,
    'Gold': 200,
    'Platinum': 175,
    'Diamond': 150
  }

  // Get user's current tier and wager requirement
  const currentTier = loyalty?.tier_name || 'Bronze'
  const wagerPerTicket = tierWagerRequirements[currentTier as keyof typeof tierWagerRequirements] || 250

  // Calculate wager progress (mock data for now - should come from backend)
  // In a real implementation, this would track current wagering towards next ticket
  const currentWagerProgress = loyalty ? Math.floor(Math.random() * wagerPerTicket) : 0
  const wagerProgressPercent = (currentWagerProgress / wagerPerTicket) * 100

  return (
    <>
      <div className="relative py-6 md:py-10 flex-1 overflow-visible">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8">

            {/* Current Jackpot Counter */}
            <div className="mb-8 flex flex-col items-center gap-3">
              {/* Desktop version - unchanged */}
              <div className="hidden md:block relative inline-block">
                {/* WEEKLY JACKPOT Text */}
                <div className="absolute left-3 top-0 z-10 transform" style={{
                  transform: 'translateY(-32px)',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px'
                }}>
                  <Image src="/logo.webp" alt="MyPokies" width={150} height={75} style={{ height: '75px', width: 'auto' }} />
                </div>
                <div className="bg-black flex items-center justify-center" style={{ border: '8px solid #FFD700', padding: '0 6rem', width: '900px', boxShadow: '0 0 20px 4px #60a5fa' }}>
                  <div style={{ fontSize: '3.375rem' }}>
                    <JackpotCounter useAnimation={true} strokeWidth={2} shadowSize={2.7} color="#2563eb" />
                  </div>
                </div>
              </div>

              {/* Mobile version - responsive */}
              <div className="md:hidden relative w-full px-4">
                {/* WEEKLY JACKPOT Text */}
                <div className="absolute left-6 top-0 z-10 transform -translate-y-5">
                  <Image src="/logo.webp" alt="MyPokies" width={80} height={40} className="h-10 w-auto" />
                </div>
                <div className="bg-black flex items-center justify-center px-6 py-2 w-full" style={{ border: '4px solid #FFD700', boxShadow: '0 0 15px 3px #60a5fa' }}>
                  <div className="text-2xl">
                    <JackpotCounter useAnimation={true} strokeWidth={2} shadowSize={2.7} color="#2563eb" />
                  </div>
                </div>
              </div>

              {/* Countdown Clock - separate section */}
              <div className="mt-2 pt-2 flex justify-center scale-125 md:scale-[1.8] md:mt-3 md:pt-3">
                <JackpotCountdown />
              </div>
              <div className="mt-1 mb-2 pb-1 text-center md:mt-2 md:mb-3 md:pb-2">
                <p className="text-white font-bold text-base md:text-lg">DRAWN Every Wednesday at 8:00 PM AEST</p>
              </div>

              {/* Grand Prize - 50% of pool - Red */}
              {/* Desktop version */}
              <div className="hidden md:block relative mt-4">
                <div className="absolute left-2 top-0 z-10 transform" style={{
                  transform: 'translateY(-50px)',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px'
                }}>
                  <svg width="142" height="100" viewBox="0 0 85 70">
                    <defs>
                      <style>{`
                        @font-face {
                          font-family: 'Anton';
                          src: url('/fonts/Anton-Regular.ttf') format('truetype');
                        }
                      `}</style>
                    </defs>
                    <g transform="scale(1.4625, 1.125)">
                      <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="none" stroke="#facc15" strokeWidth="4.5" strokeLinejoin="round" letterSpacing="0.1em">GRAND</text>
                      <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="none" stroke="#000000" strokeWidth="2.25" strokeLinejoin="round" letterSpacing="0.1em">GRAND</text>
                      <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="#dc2626" letterSpacing="0.1em">GRAND</text>
                    </g>
                  </svg>
                  <svg width="149" height="93" viewBox="0 0 130 70" style={{ marginLeft: '-30px' }}>
                    <defs>
                      <filter id="shineGrand">
                        <feSpecularLighting result="specOut" specularConstant="0.033" specularExponent="25" lightingColor="white">
                          <fePointLight x="40" y="20" z="100"/>
                        </feSpecularLighting>
                        <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
                        <feComposite in="specOut2" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
                      </filter>
                    </defs>
                    <g transform="scale(1.4625, 1.125)">
                      <text x="5" y="36" fontFamily="Anton, sans-serif" fontSize="10" fontWeight="600" fill="#FFD700" stroke="#000000" strokeWidth="5.25" strokeLinejoin="round" paintOrder="stroke" letterSpacing="0.1em">JACKPOT</text>
                      <text x="5" y="36" fontFamily="Anton, sans-serif" fontSize="10" fontWeight="600" fill="#FFD700" letterSpacing="0.1em" filter="url(#shineGrand)">JACKPOT</text>
                    </g>
                  </svg>
                </div>
                <div className="bg-black flex items-center justify-center" style={{ border: '4.5px solid #FFD700', padding: '0 2.6rem', width: '630px', boxShadow: '0 0 20px 4px #dc2626' }}>
                  <div style={{ fontSize: '2.23rem' }}>
                    <JackpotCounter value={grandPrize} strokeWidth={2} shadowSize={1.5} color="#dc2626" />
                  </div>
                </div>
                <div className="mt-3 text-center" style={{ width: '630px' }}>
                  <p className="text-white font-bold text-lg">1 winner (50%)</p>
                </div>
              </div>

              {/* Mobile version */}
              <div className="md:hidden relative w-full px-4 mt-3">
                <div className="absolute left-1/2 transform -translate-x-1/2 top-0 z-10 -translate-y-8">
                  <div className="flex items-center">
                    <span className="text-red-600 font-bold text-xl" style={{ textShadow: '1px 1px 0 #000' }}>GRAND</span>
                    <span className="text-yellow-400 font-bold text-xl ml-1" style={{ textShadow: '1px 1px 0 #000' }}>JACKPOT</span>
                  </div>
                </div>
                <div className="bg-black flex items-center justify-center px-6 py-2 w-full" style={{ border: '4px solid #FFD700', boxShadow: '0 0 15px 3px #dc2626' }}>
                  <div className="text-2xl">
                    <JackpotCounter value={grandPrize} strokeWidth={2} shadowSize={1.5} color="#dc2626" />
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-white font-bold text-base">1 winner (50%)</p>
                </div>
              </div>

              {/* Major and Minor Prizes in same row */}
              {/* Desktop version */}
              <div className="hidden md:flex gap-3 justify-center mt-4">
                {/* Major Prize - 10% each - Green */}
                <div className="relative inline-block">
                  <div className="absolute left-2 top-0 z-10 transform" style={{
                    transform: 'translateY(-36px)',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0px'
                  }}>
                    <svg width="126" height="89" viewBox="0 0 85 70">
                      <defs>
                        <style>{`
                          @font-face {
                            font-family: 'Anton';
                            src: url('/fonts/Anton-Regular.ttf') format('truetype');
                          }
                        `}</style>
                      </defs>
                      <g transform="scale(1.3, 1.0)">
                        <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="none" stroke="#facc15" strokeWidth="6" strokeLinejoin="round" letterSpacing="0.1em">MAJOR</text>
                        <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="none" stroke="#000000" strokeWidth="3" strokeLinejoin="round" letterSpacing="0.1em">MAJOR</text>
                        <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="#16a34a" letterSpacing="0.1em">MAJOR</text>
                      </g>
                    </svg>
                    <svg width="133" height="82" viewBox="0 0 130 70" style={{ marginLeft: '-30px' }}>
                      <defs>
                        <filter id="shineMajor">
                          <feSpecularLighting result="specOut" specularConstant="0.033" specularExponent="25" lightingColor="white">
                            <fePointLight x="40" y="20" z="100"/>
                          </feSpecularLighting>
                          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
                          <feComposite in="specOut2" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
                        </filter>
                      </defs>
                      <g transform="scale(1.3, 1.0)">
                        <text x="5" y="36" fontFamily="Anton, sans-serif" fontSize="10" fontWeight="600" fill="#FFD700" stroke="#000000" strokeWidth="5.25" strokeLinejoin="round" paintOrder="stroke" letterSpacing="0.1em">JACKPOT</text>
                        <text x="5" y="36" fontFamily="Anton, sans-serif" fontSize="10" fontWeight="600" fill="#FFD700" letterSpacing="0.1em" filter="url(#shineMajor)">JACKPOT</text>
                      </g>
                    </svg>
                  </div>
                  <div className="bg-black flex items-center justify-center" style={{ border: '4px solid #FFD700', padding: '0 2.6rem', width: '415px', boxShadow: '0 0 20px 4px #16a34a' }}>
                    <div style={{ fontSize: '1.47rem' }}>
                      <JackpotCounter value={majorPrize} strokeWidth={1.5} shadowSize={1.01} color="#16a34a" glowSize={0.6} />
                    </div>
                  </div>
                  <div className="mt-3 text-center" style={{ width: '415px' }}>
                    <p className="text-white font-bold text-lg">3 winners (10%)</p>
                  </div>
                </div>

                {/* Minor Prize - 2% each - Orange */}
                <div className="relative inline-block">
                  <div className="absolute left-2 top-0 z-10 transform" style={{
                    transform: 'translateY(-36px)',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0px'
                  }}>
                    <svg width="126" height="89" viewBox="0 0 85 70">
                      <defs>
                        <style>{`
                          @font-face {
                            font-family: 'Anton';
                            src: url('/fonts/Anton-Regular.ttf') format('truetype');
                          }
                        `}</style>
                      </defs>
                      <g transform="scale(1.3, 1.0)">
                        <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="none" stroke="#facc15" strokeWidth="6" strokeLinejoin="round" letterSpacing="0.1em">MINOR</text>
                        <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="none" stroke="#000000" strokeWidth="3" strokeLinejoin="round" letterSpacing="0.1em">MINOR</text>
                        <text x="1" y="36" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="600" fill="#ea580c" letterSpacing="0.1em">MINOR</text>
                      </g>
                    </svg>
                    <svg width="133" height="82" viewBox="0 0 130 70" style={{ marginLeft: '-30px' }}>
                      <defs>
                        <filter id="shineMinor">
                          <feSpecularLighting result="specOut" specularConstant="0.033" specularExponent="25" lightingColor="white">
                            <fePointLight x="40" y="20" z="100"/>
                          </feSpecularLighting>
                          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
                          <feComposite in="specOut2" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
                        </filter>
                      </defs>
                      <g transform="scale(1.3, 1.0)">
                        <text x="5" y="36" fontFamily="Anton, sans-serif" fontSize="10" fontWeight="600" fill="#FFD700" stroke="#000000" strokeWidth="5.25" strokeLinejoin="round" paintOrder="stroke" letterSpacing="0.1em">JACKPOT</text>
                        <text x="5" y="36" fontFamily="Anton, sans-serif" fontSize="10" fontWeight="600" fill="#FFD700" letterSpacing="0.1em" filter="url(#shineMinor)">JACKPOT</text>
                      </g>
                    </svg>
                  </div>
                  <div className="bg-black flex items-center justify-center" style={{ border: '4px solid #FFD700', padding: '0 2.6rem', width: '415px', boxShadow: '0 0 20px 4px #ea580c' }}>
                    <div style={{ fontSize: '1.47rem' }}>
                      <JackpotCounter value={minorPrize} strokeWidth={1.5} shadowSize={1.01} color="#ea580c" glowSize={0.6} />
                    </div>
                  </div>
                  <div className="mt-3 text-center" style={{ width: '415px' }}>
                    <p className="text-white font-bold text-lg">10 winners (2%)</p>
                  </div>
                </div>
              </div>

              {/* Mobile version - Major and Minor in same row */}
              <div className="md:hidden flex gap-2 justify-center mt-3 px-4">
                {/* Major Prize - 10% each - Green */}
                <div className="relative flex-1">
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-0 z-10 -translate-y-7">
                    <div className="flex items-center">
                      <span className="text-green-600 font-bold text-sm" style={{ textShadow: '1px 1px 0 #000' }}>MAJOR</span>
                      <span className="text-yellow-400 font-bold text-sm ml-0.5" style={{ textShadow: '1px 1px 0 #000' }}>JACKPOT</span>
                    </div>
                  </div>
                  <div className="bg-black flex items-center justify-center px-3 py-1.5 w-full" style={{ border: '3px solid #FFD700', boxShadow: '0 0 10px 2px #16a34a' }}>
                    <div className="text-sm">
                      <JackpotCounter value={majorPrize} strokeWidth={1.5} shadowSize={1.01} color="#16a34a" glowSize={0.6} />
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-white font-bold text-xs">3 winners (10%)</p>
                  </div>
                </div>

                {/* Minor Prize - 2% each - Orange */}
                <div className="relative flex-1">
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-0 z-10 -translate-y-7">
                    <div className="flex items-center">
                      <span className="text-orange-600 font-bold text-sm" style={{ textShadow: '1px 1px 0 #000' }}>MINOR</span>
                      <span className="text-yellow-400 font-bold text-sm ml-0.5" style={{ textShadow: '1px 1px 0 #000' }}>JACKPOT</span>
                    </div>
                  </div>
                  <div className="bg-black flex items-center justify-center px-3 py-1.5 w-full" style={{ border: '3px solid #FFD700', boxShadow: '0 0 10px 2px #ea580c' }}>
                    <div className="text-sm">
                      <JackpotCounter value={minorPrize} strokeWidth={1.5} shadowSize={1.01} color="#ea580c" glowSize={0.6} />
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-white font-bold text-xs">10 winners (2%)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Ticket Progress - Only for logged in users */}
            {user && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 text-center">Your Ticket Progress</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {/* Wager Progress */}
                  <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4 justify-center">
                      <Ticket className="w-8 h-8 text-yellow-400" />
                      <h3 className="text-white font-bold">Next Ticket Progress</h3>
                    </div>
                    {loyaltyLoading ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 bg-gray-700 rounded w-full"></div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">
                              ${currentWagerProgress.toFixed(2)} of ${wagerPerTicket}
                            </span>
                            <span className="text-yellow-400 font-bold">
                              {wagerProgressPercent.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#0a0f14] rounded-full h-4 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(wagerProgressPercent, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm mt-3 text-center">
                          {currentTier !== 'Bronze' && (
                            <span className="text-yellow-400 font-semibold">{currentTier} Tier: </span>
                          )}
                          Wager ${(wagerPerTicket - currentWagerProgress).toFixed(2)} more to earn your next ticket!
                        </p>
                      </>
                    )}
                  </div>

                  {/* Your Tickets Count */}
                  <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4 justify-center">
                      <Trophy className="w-8 h-8 text-yellow-400" />
                      <h3 className="text-white font-bold">Your Current Tickets</h3>
                    </div>
                    {ticketsLoading ? (
                      <div className="animate-pulse">
                        <div className="h-10 bg-gray-700 rounded mb-2 max-w-[120px] mx-auto"></div>
                        <div className="h-4 bg-gray-700 rounded w-full"></div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2">
                          <p className="text-4xl font-bold text-white mb-2 text-center">
                            {myTickets.toLocaleString()}
                          </p>
                          <p className="text-gray-400 text-sm text-center">Total entries for this week&apos;s draw</p>
                        </div>
                        {myTickets > 0 && (
                          <p className="text-gray-400 text-sm mt-3 text-center">
                            <span className="text-yellow-400 font-semibold">Win Chance: </span>
                            {myOdds.toFixed(2)}% to win a prize!
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <style jsx>{`
              @keyframes glowPulse {
                0%, 100% {
                  box-shadow: 0 0 10px 2px #3b82f6;
                }
                50% {
                  box-shadow: 0 0 20px 4px #3b82f6;
                }
              }
            `}</style>

            {/* How to Earn Tickets */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">How to Earn Tickets</h2>
              <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6 max-w-5xl mx-auto">
                <p className="text-gray-300 mb-4 text-center">
                  Earn jackpot tickets automatically by playing! The amount you need to wager per ticket depends on your VIP tier:
                </p>
                <div className="grid md:grid-cols-5 gap-4">
                  <div className="bg-[#0a0f14] rounded-lg p-4 text-center">
                    <p className="text-orange-400 font-bold mb-2">Bronze</p>
                    <p className="text-2xl font-bold text-white mb-1">$250</p>
                    <p className="text-gray-400 text-xs">per ticket</p>
                  </div>
                  <div className="bg-[#0a0f14] rounded-lg p-4 text-center">
                    <p className="text-gray-300 font-bold mb-2">Silver</p>
                    <p className="text-2xl font-bold text-white mb-1">$225</p>
                    <p className="text-gray-400 text-xs">per ticket</p>
                  </div>
                  <div className="bg-[#0a0f14] rounded-lg p-4 text-center">
                    <p className="text-yellow-400 font-bold mb-2">Gold</p>
                    <p className="text-2xl font-bold text-white mb-1">$200</p>
                    <p className="text-gray-400 text-xs">per ticket</p>
                  </div>
                  <div className="bg-[#0a0f14] rounded-lg p-4 text-center">
                    <p className="text-blue-400 font-bold mb-2">Platinum</p>
                    <p className="text-2xl font-bold text-white mb-1">$175</p>
                    <p className="text-gray-400 text-xs">per ticket</p>
                  </div>
                  <div className="bg-[#0a0f14] rounded-lg p-4 text-center">
                    <p className="text-purple-400 font-bold mb-2">Diamond</p>
                    <p className="text-2xl font-bold text-white mb-1">$150</p>
                    <p className="text-gray-400 text-xs">per ticket</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">How It Works</h2>
              <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6 max-w-3xl mx-auto">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                    <div>
                      <h3 className="text-white font-bold mb-1">Earn Tickets</h3>
                      <p className="text-gray-400 text-sm">Play your favorite games and earn tickets automatically based on your wagers</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                    <div>
                      <h3 className="text-white font-bold mb-1">Weekly Draw</h3>
                      <p className="text-gray-400 text-sm">Every Wednesday at 8:00 PM, we randomly draw 14 winners from all tickets</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                    <div>
                      <h3 className="text-white font-bold mb-1">Win Big</h3>
                      <p className="text-gray-400 text-sm">Winners are instantly credited with their prizes - no wagering requirements!</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
                    <div>
                      <h3 className="text-white font-bold mb-1">New Week</h3>
                      <p className="text-gray-400 text-sm">Tickets reset and a new pool begins building for next week&apos;s draw</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA for non-logged in users */}
            {!user && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/50 rounded-xl p-8 text-center">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-white mb-3">Start Earning Tickets Today!</h3>
                <p className="text-gray-300 mb-6">Sign up now and start playing to earn your chance at the weekly jackpot</p>
                <button className="bg-yellow-400 hover:bg-yellow-500 text-[#0a0f14] px-8 py-3 rounded-full font-bold transition-all">
                  Sign Up Now
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </>
  )
}
