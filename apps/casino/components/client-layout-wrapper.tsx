'use client'

import { ReactNode, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSidebar } from '@/lib/contexts/sidebar-context'
import { useAuth } from '@/lib/contexts/auth-context'
import { ErrorBoundary } from '@mypokies/ui'

// Dynamic imports for better code splitting
const StakeSidebar = dynamic(() => import('@/components/stake-sidebar'), {
  ssr: false,
  loading: () => <div className="fixed left-0 top-0 z-30 h-screen w-64 bg-[#1a2024] animate-pulse" />
})

const StakeHeader = dynamic(() => import('@/components/stake-header'), {
  ssr: false, // CLIENT COMPONENT FIX: Uses client-only hooks (useState, useRef, lazy)
  loading: () => <div className="fixed top-0 left-0 right-0 z-40 h-20 bg-[#1a2024] animate-pulse" />
})

const StarfieldBackground = dynamic(() => import('@/components/starfield-background'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#0a0f14]" />
})

interface ClientLayoutWrapperProps {
  children: ReactNode
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { isCollapsed } = useSidebar()
  const { user } = useAuth()

  return (
    <div className="min-h-screen relative overflow-visible">
      {/* Starfield Background - persists across navigations */}
      <Suspense fallback={<div className="fixed inset-0 bg-[#0a0f14]" />}>
        <StarfieldBackground />
      </Suspense>

      {/* Header - persists across navigations */}
      <Suspense fallback={<div className="fixed top-0 left-0 right-0 z-40 h-20 bg-[#1a2024] animate-pulse" />}>
        <StakeHeader />
      </Suspense>

      {/* Sidebar - persists across navigations */}
      <Suspense fallback={<div className="fixed left-0 top-0 z-30 h-screen w-64 bg-[#1a2024] animate-pulse" />}>
        <StakeSidebar user={user} />
      </Suspense>

      {/* Main Content - only this part changes on navigation */}
      <main className={`pt-20 pb-24 lg:pb-0 min-h-screen transition-all duration-300 lg:ml-0 flex flex-col overflow-visible ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  )
}
