'use client'

import { memo } from 'react'

// Skeleton loading state for game cards
export const GameCardSkeleton = memo(function GameCardSkeleton() {
  return (
    <div className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-lg bg-[#1a2024] border border-[#2a3439] animate-pulse">
        {/* Image skeleton */}
        <div className="aspect-[3/4] bg-gradient-to-br from-blue-900/10 via-[#1a2024] to-yellow-900/10 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-[#2a3439] rounded-lg"></div>
          </div>
        </div>

        {/* Game Info skeleton */}
        <div className="p-3 bg-[#1a2024] space-y-2">
          <div className="h-4 bg-[#2a3439] rounded w-3/4"></div>
          <div className="h-3 bg-[#2a3439] rounded w-1/2"></div>
        </div>
      </div>
    </div>
  )
})

// Grid of skeleton cards
export const GameGridSkeleton = memo(function GameGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  )
})
