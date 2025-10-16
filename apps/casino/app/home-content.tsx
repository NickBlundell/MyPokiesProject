'use client'

import { useAppContext } from '@/lib/contexts/app-context'
import { useAuth } from '@/lib/contexts/auth-context'
import { Trophy, Star, ChevronRight, Coins, Dices, Heart, Clock, Apple, TrendingUp, Flame, Award, Radio, Sparkles, Gamepad2, Search, LayoutGrid, Video, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { GameWithStats } from '@/types/games'
import { memo, useState, useRef, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports for heavy components
const AccountDashboard = dynamic(() => import('@/components/account-dashboard').then(mod => ({ default: mod.AccountDashboard })), {
  loading: () => <div className="h-32 bg-[#1a2024]/50 animate-pulse rounded-lg" />,
  ssr: false
})

const Footer = dynamic(() => import('@/components/footer').then(mod => ({ default: mod.Footer })), {
  loading: () => <div className="h-96 bg-[#1a2024]/50 animate-pulse" />,
  ssr: true  // Footer can be SSR'd
})

// Use Apple icon for pokies/slots
const FruitIcon = Apple

// Custom Home icon to avoid hydration mismatch
const HomeIconSVG = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

// Client-only icon wrapper to fix hydration issues
const ClientOnlyIcon = ({ icon: Icon, className }: { icon: any, className?: string }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span className={className} style={{ display: 'inline-block', width: '1em', height: '1em' }} />
  }

  return <Icon className={className} aria-hidden="true" />
}

const PROVIDERS = [
  'Pragmatic Play',
  'Play\'n GO',
  'Evolution',
  'NetEnt',
  'Microgaming',
  'Push Gaming',
  'Relax Gaming',
  'Hacksaw Gaming',
  'NoLimit City',
  'Yggdrasil',
  'Quickspin',
  'Red Tiger',
]

interface GameCardProps {
  game: GameWithStats
}

const GameCard = memo(function GameCard({ game }: GameCardProps) {
  const { game_name, provider, thumbnail_url, is_new, has_jackpot } = game
  const [imageError, setImageError] = useState(false)

  return (
    <div className="group cursor-pointer transition-transform duration-300 hover:-translate-y-2 overflow-visible">
      <div className="relative overflow-hidden rounded-lg bg-[#1a2024] hover:shadow-2xl transition-all duration-300 border border-[#2a3439] hover:border-blue-800/50">
        {/* Game Image */}
        <div className="aspect-[3/4] bg-gradient-to-br from-blue-900/20 via-[#1a2024] to-yellow-900/20 relative overflow-hidden">
          {thumbnail_url && !imageError ? (
            <Image
              src={thumbnail_url}
              alt={game_name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 110px, (max-width: 768px) 140px, 160px"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-1">
                <div className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1 bg-[#1a2024] rounded-lg flex items-center justify-center shadow-lg border border-[#2a3439]">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-blue-700 to-blue-800 rounded-md"></div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-gray-300 font-medium px-0.5">{game_name}</p>
              </div>
            </div>
          )}

          {/* Badge */}
          {is_new && (
            <div className="absolute top-1 left-1 bg-gradient-to-r from-blue-700 to-blue-800 text-white text-[7px] sm:text-[8px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full shadow-lg">
              NEW
            </div>
          )}

          {/* Jackpot Badge */}
          {has_jackpot && (
            <div className="absolute top-1 right-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-[#0a0f14] text-[7px] sm:text-[8px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full shadow-lg">
              JACKPOT
            </div>
          )}

          {/* Hover overlay with play button */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
            <button className="opacity-0 group-hover:opacity-100 bg-yellow-400 hover:bg-yellow-500 text-[#0a0f14] px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-bold text-[9px] sm:text-[10px] transform scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl">
              Play
            </button>
          </div>
        </div>

        {/* Game Info */}
        <div className="p-1 sm:p-1.5 bg-[#1a2024]">
          <h3 className="text-[9px] sm:text-[10px] font-semibold text-gray-100 truncate mb-0.5">{game_name}</h3>
          <p className="text-[7px] sm:text-[8px] text-gray-400">{provider || 'Casino Game'}</p>
        </div>
      </div>
    </div>
  )
})

interface GameSectionProps {
  title: string
  icon?: React.ReactNode
  games: GameWithStats[]
  viewAllLink?: string
  fullGrid?: boolean
}

// PERFORMANCE FIX: Memoize GameSection to prevent unnecessary re-renders
// Only re-renders when games array or other props actually change
const GameSection = memo(function GameSection({ title, icon, games, viewAllLink, fullGrid = false }: GameSectionProps) {
  if (games.length === 0) {
    return null
  }

  return (
    <section className="mb-6 md:mb-10 overflow-visible">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          {icon && <div className="scale-75 sm:scale-100">{icon}</div>}
          <h2 className="text-sm sm:text-base font-bold text-white uppercase">{title}</h2>
        </div>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="text-white hover:text-gray-300 text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 transition-colors group"
          >
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">All</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
      {/* Conditional rendering: horizontal scroll for lobby, grid for category pages */}
      {!fullGrid ? (
        /* Horizontal scroll carousel for lobby - tiles sized same as grid */
        <>
          <style jsx>{`
            .carousel-container {
              display: grid;
              grid-auto-flow: column;
              grid-auto-columns: calc(33.333% - 0.33rem);
              gap: 0.5rem;
              overflow-x: auto;
              overflow-y: visible;
              padding-top: 10px;
              padding-bottom: 10px;
              margin-top: -10px;
              margin-bottom: -10px;
            }
            @media (min-width: 640px) {
              .carousel-container {
                grid-auto-columns: calc(25% - 0.5rem);
                gap: 0.75rem;
              }
            }
            @media (min-width: 768px) {
              .carousel-container {
                grid-auto-columns: calc(20% - 0.6rem);
              }
            }
            @media (min-width: 1024px) {
              .carousel-container {
                grid-auto-columns: calc(14.2857% - 0.65rem);
              }
            }
          `}</style>
          <div className="carousel-container scrollbar-hide">
            {games.map((game) => (
              <div key={game.id} className="overflow-visible">
                <GameCard game={game} />
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Grid layout for category pages - responsive width */
        <>
          <style jsx>{`
            .game-tile-grid {
              display: grid;
              gap: 0.5rem;
              grid-template-columns: repeat(3, 1fr); /* 3 columns on mobile */
              padding-top: 10px;
              padding-bottom: 10px;
              margin-top: -10px;
              margin-bottom: -10px;
            }
            @media (min-width: 640px) {
              .game-tile-grid {
                gap: 0.75rem;
                grid-template-columns: repeat(4, 1fr); /* 4 columns on small screens */
              }
            }
            @media (min-width: 768px) {
              .game-tile-grid {
                grid-template-columns: repeat(5, 1fr); /* 5 columns on medium screens */
              }
            }
            @media (min-width: 1024px) {
              .game-tile-grid {
                grid-template-columns: repeat(7, 1fr); /* 7 columns on desktop */
              }
            }
          `}</style>
          <div className="game-tile-grid overflow-visible">
            {games.map((game) => (
              <div key={game.id} className="overflow-visible">
                <GameCard game={game} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
})

export default function HomeContent() {
  // Get user from AuthContext instead of prop
  const { user } = useAuth()
  const { games, gamesLoading: loading } = useAppContext()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })
  const [isJellyAnimating, setIsJellyAnimating] = useState(false)
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const [searchQuery, setSearchQuery] = useState('')


  // Update slider position when category changes
  useEffect(() => {
    // Trigger jelly animation
    setIsJellyAnimating(true)
    const timer = setTimeout(() => setIsJellyAnimating(false), 600)

    const activeButton = buttonRefs.current[selectedCategory]
    if (activeButton) {
      setSliderStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth
      })
    }

    return () => clearTimeout(timer)
  }, [selectedCategory])

  // Filter games by category
  // NOTE: Favorites and recents currently show first 8 games
  // TODO (tracked in TODO.md): Implement user favorite games filtering
  //   - Add favorite_games table or user_game_preferences
  //   - Filter: games.filter(g => userFavorites.includes(g.id))
  const favoritesGames = games.slice(0, 8)

  // TODO (tracked in TODO.md): Implement recent play history
  //   - Query game_rounds table for user's recent games
  //   - Order by created_at DESC, filter unique games
  const recentsGames = games.slice(0, 8)

  // For LOBBY view - show limited games per section
  const pokiesGamesLobby = games.filter(g => g.category === 'slots').slice(0, 12)
  const liveCasinoGamesLobby = games.filter(g => g.category === 'live').slice(0, 8)
  const tableGamesLobby = games.filter(g => g.category === 'table').slice(0, 8)
  const newGamesLobby = games.filter(g => g.is_new).slice(0, 8)
  const jackpotGamesLobby = games.filter(g => g.has_jackpot).slice(0, 8)
  const popularGamesLobby = games.slice(0, 12)

  // For individual category views - show ALL games
  const pokiesGames = games.filter(g => g.category === 'slots')
  const liveCasinoGames = games.filter(g => g.category === 'live')
  const tableGames = games.filter(g => g.category === 'table')
  const newGames = games.filter(g => g.is_new)
  const jackpotGames = games.filter(g => g.has_jackpot)

  // TODO (tracked in TODO.md): Implement popularity tracking
  //   - Track play_count or total_wagered per game
  //   - Sort by: games.sort((a, b) => b.play_count - a.play_count)
  const popularGames = games

  // New category game arrays
  // TODO: Implement actual logic for these categories
  const topPicksGames = games
  const recommendedGames = games
  const trendingGames = games
  const mostPlayedGames = games

  return (
    <>
      <style jsx>{`
        /* Jelly blob stretch animation */
        @keyframes jellyStretch {
          0% {
            transform: scale(1, 1);
          }
          20% {
            transform: scale(1.4, 0.8);
          }
          40% {
            transform: scale(0.9, 1.1);
          }
          60% {
            transform: scale(1.1, 0.95);
          }
          80% {
            transform: scale(0.95, 1.02);
          }
          100% {
            transform: scale(1, 1);
          }
        }

        /* Breathing glow animation */
        @keyframes breatheGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.3), 0 0 25px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 0 0 35px rgba(59, 130, 246, 0.3);
          }
        }

        :global(.jelly-blob-active) {
          animation: jellyStretch 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        :global(.glow-breathe) {
          animation: breatheGlow 2s ease-in-out infinite;
        }
      `}</style>
      <div className="relative bg-black/30 backdrop-blur-sm py-6 md:py-10 flex-1 overflow-visible">
          {/* Account Dashboard Section - Only for logged in users */}
          {user && (
            <AccountDashboard userName={user.user_metadata?.first_name} />
          )}

          {/* Hero Section - Only for non-logged in users */}
          {!user && (
            <div className="relative overflow-visible mb-6 md:mb-10">
              <div className="relative max-w-[1400px] mx-auto px-6 md:px-8">
                <div className="relative overflow-visible rounded-xl bg-[#1a2024] border-2 border-[#2a3439] shadow-xl">
                  <div className="relative p-6 md:p-8">
                    <div className="text-left">
                      <div className="inline-block bg-yellow-400/20 backdrop-blur-sm px-2 py-0.5 md:px-4 md:py-2 rounded-full mb-1.5 md:mb-3">
                        <span className="text-yellow-400 font-semibold text-[8px] md:text-sm uppercase tracking-wide">
                          ⚡ Welcome Offer
                        </span>
                      </div>
                      <h1 className="text-base md:text-4xl lg:text-5xl font-bold text-white mb-1 md:mb-3">
                        Get 100% Match Bonus
                      </h1>
                      <p className="text-white text-[10px] md:text-lg mb-2 md:mb-4 opacity-95">
                        Up to <span className="font-bold text-yellow-400">$500</span> on your first deposit + <span className="font-bold text-yellow-400">$20 Free</span> on phone verification!
                      </p>
                      <div className="flex flex-wrap gap-1.5 md:gap-3">
                        <Link
                          href="/auth/signup"
                          className="bg-yellow-400 hover:bg-yellow-500 text-[#0a0f14] px-3 py-1.5 md:px-6 md:py-3 rounded-full font-bold text-[10px] md:text-base transition-all transform hover:scale-105 shadow-xl"
                        >
                          Sign Up Now
                        </Link>
                        <Link
                          href="/promotions"
                          className="bg-transparent border border-yellow-400 hover:bg-yellow-400 hover:text-[#0a0f14] text-yellow-400 px-3 py-1.5 md:px-6 md:py-3 rounded-full font-bold text-[10px] md:text-base transition-all"
                        >
                          View All Promotions
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative px-6 md:px-8 pb-6 md:pb-10 max-w-[1400px] mx-auto overflow-visible">
          {/* Search Bar */}
          <div className="mb-6 md:mb-10">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a2024] border border-[#2a3439] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Category Slider */}
          <div className="mb-6 md:mb-10 overflow-x-auto scrollbar-hide">
            <div className="inline-flex bg-[#1a2024] rounded-lg p-1 min-w-max relative">
              {/* Animated sliding background */}
              <div
                className={`absolute bg-blue-600 rounded-lg glow-breathe ${isJellyAnimating ? 'jelly-blob-active' : ''}`}
                style={{
                  left: sliderStyle.left,
                  width: sliderStyle.width,
                  height: 'calc(100% - 8px)',
                  top: '4px',
                  transition: 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              />
              <button
                ref={(el) => { buttonRefs.current['all'] = el }}
                onClick={() => setSelectedCategory('all')}
                className={`relative z-10 px-4 py-2 rounded-md font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 uppercase ${
                  selectedCategory === 'all'
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <HomeIconSVG className="w-4 h-4" />
                LOBBY
              </button>
              <button
                ref={(el) => { buttonRefs.current['top-picks'] = el }}
                onClick={() => setSelectedCategory('top-picks')}
                className={`relative z-10 px-4 py-2 rounded-md font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 uppercase ${
                  selectedCategory === 'top-picks'
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <ClientOnlyIcon icon={Award} className="w-4 h-4" />
                TOP PICKS
              </button>
              <button
                ref={(el) => { buttonRefs.current['recommended'] = el }}
                onClick={() => setSelectedCategory('recommended')}
                className={`relative z-10 px-4 py-2 rounded-md font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 uppercase ${
                  selectedCategory === 'recommended'
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <ClientOnlyIcon icon={Star} className="w-4 h-4" />
                RECOMMENDED
              </button>
              <button
                ref={(el) => { buttonRefs.current['live'] = el }}
                onClick={() => setSelectedCategory('live')}
                className={`relative z-10 px-4 py-2 rounded-md font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 uppercase ${
                  selectedCategory === 'live'
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <ClientOnlyIcon icon={Video} className="w-4 h-4" />
                LIVE CASINO
              </button>
              <button
                ref={(el) => { buttonRefs.current['trending'] = el }}
                onClick={() => setSelectedCategory('trending')}
                className={`relative z-10 px-4 py-2 rounded-md font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 uppercase ${
                  selectedCategory === 'trending'
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <ClientOnlyIcon icon={TrendingUp} className="w-4 h-4" />
                TRENDING
              </button>
              <button
                ref={(el) => { buttonRefs.current['popular'] = el }}
                onClick={() => setSelectedCategory('popular')}
                className={`relative z-10 px-4 py-2 rounded-md font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 uppercase ${
                  selectedCategory === 'popular'
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <ClientOnlyIcon icon={Heart} className="w-4 h-4" />
                POPULAR
              </button>
              <button
                ref={(el) => { buttonRefs.current['most-played'] = el }}
                onClick={() => setSelectedCategory('most-played')}
                className={`relative z-10 px-4 py-2 rounded-md font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 uppercase ${
                  selectedCategory === 'most-played'
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <ClientOnlyIcon icon={Users} className="w-4 h-4" />
                MOST PLAYED
              </button>
              <button
                ref={(el) => { buttonRefs.current['new'] = el }}
                onClick={() => setSelectedCategory('new')}
                className={`relative z-10 px-4 py-2 rounded-md font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 uppercase ${
                  selectedCategory === 'new'
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <ClientOnlyIcon icon={Sparkles} className="w-4 h-4" />
                NEW RELEASES
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-800 border-t-transparent"></div>
              <p className="text-gray-400 mt-4">Loading games...</p>
            </div>
          )}

          {/* Games sections */}
          {!loading && (
            <>
              {/* Show all sections when "All Games" is selected */}
              {selectedCategory === 'all' && (
                <>
                  {/* Top Picks Section */}
                  <GameSection
                    title="Top Picks"
                    icon={<Award className="w-5 h-5 text-white" />}
                    games={pokiesGamesLobby}
                    viewAllLink="/games/pokies"
                  />

                  {/* Recommended Section */}
                  <GameSection
                    title="Recommended"
                    icon={<Star className="w-5 h-5 text-white" />}
                    games={popularGamesLobby}
                    viewAllLink="/games/popular"
                  />

                  {/* Game Providers Section - Moved here */}
                  <section className="mb-6 md:mb-10">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-white scale-75 sm:scale-100" />
                        <h2 className="text-sm sm:text-base font-bold text-white uppercase">Providers</h2>
                      </div>
                      <Link
                        href="/providers"
                        className="text-white hover:text-gray-300 text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 transition-colors group"
                      >
                        <span className="hidden sm:inline">View All</span>
                        <span className="sm:hidden">All</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                    <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
                      <div className="flex gap-3 py-2">
                        {PROVIDERS.slice(0, 8).map((provider) => (
                          <div
                            key={provider}
                            style={{ width: '160px', minWidth: '160px', maxWidth: '160px', flexShrink: 0 }}
                            className="h-16 sm:h-18 md:h-20 bg-[#1a2024] border border-[#2a3439] hover:border-blue-800/50 hover:shadow-xl rounded-xl p-3 md:p-4 flex items-center justify-center cursor-pointer transition-all group"
                          >
                            <span className="text-gray-300 group-hover:text-blue-700 text-xs sm:text-sm font-semibold text-center transition-colors">
                              {provider}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Live Casino Section */}
                  <GameSection
                    title="Live Casino"
                    icon={<Video className="w-5 h-5 text-white" />}
                    games={liveCasinoGamesLobby}
                    viewAllLink="/games/live"
                  />

                  {/* Trending Section */}
                  <GameSection
                    title="Trending"
                    icon={<TrendingUp className="w-5 h-5 text-white" />}
                    games={pokiesGamesLobby}
                    viewAllLink="/games/trending"
                  />

                  {/* Popular Section */}
                  <GameSection
                    title="Popular"
                    icon={<Heart className="w-5 h-5 text-white" />}
                    games={popularGamesLobby}
                    viewAllLink="/games/popular"
                  />

                  {/* Most Played Section */}
                  <GameSection
                    title="Most Played"
                    icon={<Users className="w-5 h-5 text-white" />}
                    games={pokiesGamesLobby}
                    viewAllLink="/games/most-played"
                  />

                  {/* New Releases Section */}
                  <GameSection
                    title="New Releases"
                    icon={<Sparkles className="w-5 h-5 text-white" />}
                    games={newGamesLobby}
                    viewAllLink="/games/new"
                  />
                </>
              )}

              {/* Show only Top Picks when selected */}
              {selectedCategory === 'top-picks' && (
                <GameSection
                  title="Top Picks"
                  icon={<Award className="w-5 h-5 text-white" />}
                  games={topPicksGames}
                  fullGrid={true}
                />
              )}

              {/* Show only Recommended when selected */}
              {selectedCategory === 'recommended' && (
                <GameSection
                  title="Recommended"
                  icon={<Star className="w-5 h-5 text-white" />}
                  games={recommendedGames}
                  fullGrid={true}
                />
              )}

              {/* Show only Live Casino when selected */}
              {selectedCategory === 'live' && (
                <GameSection
                  title="Live Casino"
                  icon={<Video className="w-5 h-5 text-white" />}
                  games={liveCasinoGames}
                  fullGrid={true}
                />
              )}

              {/* Show only Trending when selected */}
              {selectedCategory === 'trending' && (
                <GameSection
                  title="Trending"
                  icon={<TrendingUp className="w-5 h-5 text-white" />}
                  games={trendingGames}
                  fullGrid={true}
                />
              )}

              {/* Show only Popular when selected */}
              {selectedCategory === 'popular' && (
                <GameSection
                  title="Popular"
                  icon={<Heart className="w-5 h-5 text-white" />}
                  games={popularGames}
                  fullGrid={true}
                />
              )}

              {/* Show only Most Played when selected */}
              {selectedCategory === 'most-played' && (
                <GameSection
                  title="Most Played"
                  icon={<Users className="w-5 h-5 text-white" />}
                  games={mostPlayedGames}
                  fullGrid={true}
                />
              )}

              {/* Show only New Releases when selected */}
              {selectedCategory === 'new' && (
                <GameSection
                  title="New Releases"
                  icon={<Sparkles className="w-5 h-5 text-white" />}
                  games={newGames}
                  fullGrid={true}
                />
              )}
            </>
          )}

          </div>
        </div>

      {/* Footer */}
      <Footer />
    </>
  )
}