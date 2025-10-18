'use client'

import { Footer } from '@/components/footer'
import { useAppContext } from '@/lib/contexts/app-context'
import { useAuth } from '@/lib/contexts/auth-context'
import { Heart, Grid3x3, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import type { GameWithStats } from '@/types/games'
import { useState, useMemo, memo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface GameCatalogProps {
  title: string
  category?: string
  showNew?: boolean
  showJackpot?: boolean
  icon?: React.ReactNode
  requiresAuth?: boolean
}

interface GameCardProps {
  game: GameWithStats
  onFavoriteToggle?: (gameId: string) => void
  isFavorited?: boolean
}

// Memoize GameCard to prevent unnecessary re-renders
const GameCard = memo(function GameCard({ game, onFavoriteToggle, isFavorited }: GameCardProps) {
  const { game_name, provider, thumbnail_url, is_new, has_jackpot } = game

  return (
    <div className="group cursor-pointer transition-transform duration-300 hover:scale-105">
      <div className="relative overflow-hidden rounded-lg bg-[#1a2024] hover:shadow-2xl transition-all duration-300 border border-[#2a3439] hover:border-blue-800/50">
        {/* Game Image */}
        <div className="aspect-[3/4] bg-gradient-to-br from-blue-900/20 via-[#1a2024] to-yellow-900/20 relative overflow-hidden">
          {thumbnail_url ? (
            <Image
              src={thumbnail_url}
              alt={game_name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-2">
                <div className="w-10 h-10 mx-auto mb-2 bg-[#1a2024] rounded-lg flex items-center justify-center shadow-lg border border-[#2a3439]">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-700 to-blue-800 rounded-md"></div>
                </div>
                <p className="text-xs text-gray-300 font-medium px-1">{game_name}</p>
              </div>
            </div>
          )}

          {/* Favorite Button */}
          {onFavoriteToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFavoriteToggle(game.id)
              }}
              className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-all z-10"
            >
              <Heart
                className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`}
              />
            </button>
          )}

          {/* Badges */}
          {is_new && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-700 to-blue-800 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              NEW
            </div>
          )}
          {has_jackpot && (
            <div className="absolute bottom-2 right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-[#0a0f14] text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              JACKPOT
            </div>
          )}

          {/* Hover overlay with play button */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
            <button className="opacity-0 group-hover:opacity-100 bg-yellow-400 hover:bg-yellow-500 text-[#0a0f14] px-6 py-3 rounded-full font-bold text-sm transform scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl">
              Play
            </button>
          </div>
        </div>

        {/* Game Info */}
        <div className="p-3 bg-[#1a2024]">
          <h3 className="text-sm font-semibold text-gray-100 truncate mb-1">{game_name}</h3>
          <p className="text-xs text-gray-400">{provider || 'Casino Game'}</p>
        </div>
      </div>
    </div>
  )
})

export default function GameCatalogOptimized({ title, category, showNew, showJackpot, icon, requiresAuth }: GameCatalogProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { games, gamesLoading: loading } = useAppContext()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(24) // Default to 24 games per page
  const [visibleGames, setVisibleGames] = useState(24) // For lazy loading
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false) // Toggle between pagination and infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Handle auth redirect using useEffect (not during render)
  useEffect(() => {
    if (requiresAuth && !user) {
      router.push('/auth/login')
    }
  }, [requiresAuth, user, router])

  // Filter games based on props - memoized to prevent unnecessary recalculations
  // MUST be before any early returns (React hooks rule)
  const filteredGames = useMemo(() => {
    let filtered = [...games]

    if (category) {
      filtered = filtered.filter((g) => g.category === category)
    }
    if (showNew) {
      filtered = filtered.filter((g) => g.is_new === true)
    }
    if (showJackpot) {
      filtered = filtered.filter((g) => g.has_jackpot === true)
    }

    return filtered
  }, [games, category, showNew, showJackpot])

  // Pagination calculations
  const totalPages = Math.ceil(filteredGames.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentGames = useInfiniteScroll
    ? filteredGames.slice(0, visibleGames)
    : filteredGames.slice(startIndex, endIndex)

  // Setup Intersection Observer for infinite scroll
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0]
    if (target.isIntersecting && visibleGames < filteredGames.length) {
      // Load 24 more games when user scrolls to bottom
      setVisibleGames(prev => Math.min(prev + 24, filteredGames.length))
    }
  }, [visibleGames, filteredGames.length])

  useEffect(() => {
    if (!useInfiniteScroll) return

    const option = {
      root: null,
      rootMargin: '200px', // Start loading 200px before reaching the bottom
      threshold: 0
    }

    observerRef.current = new IntersectionObserver(handleObserver, option)

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleObserver, useInfiniteScroll])

  // Reset visible games when filters change
  useEffect(() => {
    setVisibleGames(24)
    setCurrentPage(1)
  }, [category, showNew, showJackpot])

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const maxPages = 5 // Show max 5 page numbers

    let start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, start + maxPages - 1)

    // Adjust start if we're near the end
    if (end - start < maxPages - 1) {
      start = Math.max(1, end - maxPages + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }

  // Show loading state while redirecting (redirect handled in useEffect above)
  if (requiresAuth && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-800 border-t-transparent"></div>
          <p className="text-gray-400 mt-4">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative py-6 md:py-10 flex-1 overflow-visible">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {icon && <div>{icon}</div>}
              <h1 className="text-3xl md:text-4xl font-bold text-white">{title}</h1>
            </div>
            <p className="text-gray-400">
              {loading ? 'Loading...' : `${filteredGames.length} games available`}
            </p>
          </div>

          {/* View Toggle and Items Per Page */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-blue-800 text-white rounded-md font-medium text-sm transition-all flex items-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                Grid View
              </button>

              {/* Toggle between pagination and infinite scroll */}
              <button
                onClick={() => setUseInfiniteScroll(!useInfiniteScroll)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  useInfiniteScroll
                    ? 'bg-green-800 text-white'
                    : 'bg-[#1a2024] border border-[#2a3439] text-gray-300 hover:bg-[#2a3439]'
                }`}
              >
                {useInfiniteScroll ? 'Infinite Scroll ON' : 'Paginated View'}
              </button>

              {/* Items per page selector (only for pagination mode) */}
              {!useInfiniteScroll && (
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1) // Reset to first page
                  }}
                  className="px-4 py-2 bg-[#1a2024] border border-[#2a3439] text-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                >
                  <option value="12">12 per page</option>
                  <option value="24">24 per page</option>
                  <option value="48">48 per page</option>
                  <option value="96">96 per page</option>
                </select>
              )}
            </div>

            <div className="hidden md:block text-sm text-gray-400">
              {useInfiniteScroll
                ? `Showing ${Math.min(visibleGames, filteredGames.length)} of ${filteredGames.length} games`
                : `Showing ${startIndex + 1}-${Math.min(endIndex, filteredGames.length)} of ${filteredGames.length} games`
              }
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-800 border-t-transparent"></div>
              <p className="text-gray-400 mt-4">Loading games...</p>
            </div>
          )}

          {/* Games Grid */}
          {!loading && (
            <>
              {currentGames.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8 py-2">
                    {currentGames.map((game) => (
                      <GameCard key={game.id} game={game} />
                    ))}
                  </div>

                  {/* Infinite Scroll Observer Target */}
                  {useInfiniteScroll && visibleGames < filteredGames.length && (
                    <div ref={loadMoreRef} className="flex justify-center py-8">
                      <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-800 border-t-transparent"></div>
                    </div>
                  )}

                  {/* Pagination Controls - Only show when not using infinite scroll */}
                  {!useInfiniteScroll && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-[#1a2024] border border-[#2a3439] text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3439] transition-all flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {currentPage > 3 && (
                          <>
                            <button
                              onClick={() => setCurrentPage(1)}
                              className="px-3 py-2 bg-[#1a2024] border border-[#2a3439] text-gray-300 rounded-lg hover:bg-[#2a3439] transition-all"
                            >
                              1
                            </button>
                            {currentPage > 4 && <span className="text-gray-500 px-2">...</span>}
                          </>
                        )}

                        {getPageNumbers().map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg transition-all ${
                              page === currentPage
                                ? 'bg-blue-800 text-white'
                                : 'bg-[#1a2024] border border-[#2a3439] text-gray-300 hover:bg-[#2a3439]'
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && <span className="text-gray-500 px-2">...</span>}
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              className="px-3 py-2 bg-[#1a2024] border border-[#2a3439] text-gray-300 rounded-lg hover:bg-[#2a3439] transition-all"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-[#1a2024] border border-[#2a3439] text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3439] transition-all flex items-center gap-2"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <div className="text-gray-400 text-lg mb-2">No games found</div>
                  <p className="text-gray-500 text-sm">
                    Try selecting a different category
                  </p>
                </div>
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