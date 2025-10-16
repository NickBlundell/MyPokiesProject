'use client'

import { User, ChevronDown, Wallet } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/lib/contexts/sidebar-context'
import { useAuth } from '@/lib/contexts/auth-context'
import { BalanceCounter } from '@/components/balance-counter'
import { AccountDropdown } from '@/components/account-dropdown'
import { useState, useRef, useEffect, lazy, Suspense, useMemo, useCallback } from 'react'
import * as React from 'react'
import { usePlayerBalance } from '@/lib/contexts/player-context'
import { useBonusTotals } from '@/lib/hooks/use-bonus-totals'
import { createClient } from '@/lib/supabase/client'
import { logError } from '@/lib/utils/client-logger'

// Lazy load heavy components - saves ~200KB from initial bundle
const AuthModals = lazy(() => import('@/components/auth-modals').then(mod => ({ default: mod.AuthModals })))
const WalletDropdown = lazy(() => import('@/components/wallet-dropdown').then(mod => ({ default: mod.WalletDropdown })))

export function StakeHeader() {
  // Get user from auth context instead of props
  const { user } = useAuth()
  const router = useRouter()
  const { isCollapsed } = useSidebar()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [isWalletOpen, setIsWalletOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const walletButtonRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLDivElement>(null)
  const { balances } = usePlayerBalance()

  // PERFORMANCE FIX: Use shared hook instead of duplicating calculations
  const { totalBonusBalance, totalWageringRequired, totalWageringCompleted } = useBonusTotals()

  // Get real balance
  const primaryBalance = balances.find(b => b.currency === 'USD') || balances[0]
  const realBalance = primaryBalance?.balance || 0

  // Use real-time bonus data
  const bonusBalance = totalBonusBalance
  const wageringRequired = totalWageringRequired
  const wageringCompleted = totalWageringCompleted

  // Memoize click outside handler to prevent recreation on every render
  const handleClickOutside = useCallback((event: MouseEvent) => {
    // Check wallet dropdown
    if (walletButtonRef.current && !walletButtonRef.current.contains(event.target as Node)) {
      setIsWalletOpen(false)
    }
    // Check account dropdown
    if (accountButtonRef.current && !accountButtonRef.current.contains(event.target as Node)) {
      setIsAccountOpen(false)
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    // Only add listener if at least one dropdown is open
    if (isWalletOpen || isAccountOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isWalletOpen, isAccountOpen, handleClickOutside])

  // Memoize logout handler to prevent recreation on every render
  const handleLogout = useCallback(async () => {
    try {
      const supabase = createClient()

      // Close the dropdown immediately for better UX
      setIsAccountOpen(false)

      // Sign out from Supabase - this clears all auth cookies
      await supabase.auth.signOut()

      // PERFORMANCE FIX: Use soft navigation instead of hard redirect
      // AuthProvider will pick up the SIGNED_OUT event via onAuthStateChange
      router.push('/')
      router.refresh() // Refresh server components
    } catch (error) {
      logError('Error logging out', { data: error })
      // Still redirect even if there's an error
      router.push('/')
      router.refresh()
    }
  }, [router])

  // Detect scroll to show/hide border
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header style={{ zIndex: 150 }} className={`relative transition-all duration-300 ${isScrolled ? 'border-b border-gray-700/50' : ''}`}>
      {/* Static stars in header - more stars and circles mixed */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="hidden sm:block absolute top-[10%] left-[3%] text-white/65 text-sm animate-twinkle">★</div>
        <div className="hidden md:block absolute top-[15%] left-[8%] text-white/55 text-xs animate-twinkle-delay-1">•</div>
        <div className="hidden sm:block absolute top-[12%] right-[5%] text-white/60 text-sm animate-twinkle-delay-2">★</div>
        <div className="hidden md:block absolute top-[20%] left-[12%] text-white/50 text-xs animate-twinkle">•</div>
        <div className="hidden lg:block absolute top-[18%] right-[10%] text-white/55 text-sm animate-twinkle-delay-1">★</div>
        <div className="hidden md:block absolute top-[25%] left-[18%] text-white/45 text-xs animate-twinkle-delay-2">•</div>
        <div className="hidden sm:block absolute top-[22%] right-[15%] text-white/50 text-sm animate-twinkle">★</div>
        <div className="absolute top-[30%] left-[22%] text-white/40 text-xs animate-twinkle-delay-1">•</div>
        <div className="hidden md:block absolute top-[28%] right-[20%] text-white/45 text-sm animate-twinkle-delay-2">★</div>
        <div className="absolute top-[35%] left-[28%] text-white/35 text-xs animate-twinkle">•</div>
        <div className="hidden sm:block absolute top-[33%] right-[25%] text-white/40 text-sm animate-twinkle-delay-1">★</div>
        <div className="hidden md:block absolute top-[40%] left-[33%] text-white/30 text-xs animate-twinkle-delay-2">•</div>
        <div className="absolute top-[45%] right-[30%] text-white/35 text-sm animate-twinkle">★</div>
        <div className="hidden sm:block absolute top-[50%] left-[38%] text-white/25 text-xs animate-twinkle-delay-1">•</div>
        <div className="hidden md:block absolute top-[55%] right-[35%] text-white/30 text-sm animate-twinkle-delay-2">★</div>
        <div className="absolute top-[60%] left-[42%] text-white/20 text-xs animate-twinkle">•</div>
        <div className="hidden sm:block absolute top-[65%] right-[40%] text-white/25 text-sm animate-twinkle-delay-1">★</div>
        <div className="hidden md:block absolute top-[70%] left-[45%] text-white/15 text-xs animate-twinkle-delay-2">•</div>
      </div>
      <style jsx>{`
        header {
          position: fixed;
          top: 0;
          background: rgba(0, 0, 0, 1);
          transition: all 0.3s;
        }

        header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
          pointer-events: none;
        }

        /* Mobile styles */
        @media (max-width: 1023px) {
          header {
            left: 0;
            right: 0;
            height: 5rem;
          }

          header :global(.header-container) {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
            position: relative;
          }

          header :global(.logo-container) {
            flex: 0 0 auto;
            padding-left: 0 !important;
            position: absolute;
            left: 0.5rem;
          }

          header :global(.logo-container img) {
            transform: scale(0.65);
            transform-origin: left center;
          }

          header :global(.mobile-actions) {
            flex: 0 0 auto;
            position: absolute;
            right: 0.5rem;
          }

          header :global(.balance-wallet-container) {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
          }
        }

        /* Desktop styles */
        @media (min-width: 1024px) {
          header {
            height: 5rem;
            left: ${isCollapsed ? '5rem' : '16rem'};
            right: 0;
          }

          header :global(.logo-container img) {
            transform: scale(1.0);
          }
        }
      `}</style>
      <div className="h-full m-0 p-0 leading-[0]">
        <div className="h-full max-w-[1400px] mx-auto px-4 lg:px-6 xl:px-8 flex items-center my-0 py-0 leading-[0] header-container">
          {/* Left side - Logo */}
          <Link href="/" className="block h-full relative py-3 lg:py-4 flex-shrink-0 logo-container animate-logo-breathe" style={{ width: 'auto' }}>
            <div className="h-full relative" style={{ width: '150px' }}>
              <Image
                src="/logo.webp"
                alt="MyPokies"
                fill
                priority
                sizes="150px"
                className="object-contain object-left"
                quality={90}
              />
            </div>
          </Link>

          {/* Center - Balance & Wallet Island (when logged in) */}
          {user ? (
            <div className="flex-1 flex justify-center items-center balance-wallet-container px-2">
              {/* Mobile: Balance only */}
              <div className="lg:hidden flex items-center px-3 py-3 bg-[#1a2024] border border-[#2a3439] rounded-lg mx-auto min-h-[48px]">
                <BalanceCounter className="text-white font-bold text-sm" />
              </div>

              {/* Desktop: Balance + Wallet Island */}
              <div ref={walletButtonRef} className="hidden lg:flex relative items-stretch bg-[#1a2024] border border-[#2a3439] rounded-lg overflow-visible mx-auto">
                {/* Balance side */}
                <div className="flex items-center px-4 py-3 border-r border-[#2a3439]">
                  <BalanceCounter className="text-white font-bold text-base" />
                </div>
                {/* Wallet side */}
                <button
                  onClick={() => setIsWalletOpen(!isWalletOpen)}
                  className={`px-6 py-3 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    isWalletOpen
                      ? 'bg-blue-600/30 text-white border-l border-blue-500/30'
                      : 'bg-[#2a3439] text-gray-300 hover:bg-[#3a4449]'
                  }`}
                >
                  <Wallet className="w-5 h-5" />
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isWalletOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Wallet Dropdown - Lazy loaded */}
                {isWalletOpen && (
                  <Suspense fallback={<div className="absolute top-full mt-2 w-96 bg-[#1a2024] rounded-lg p-4">Loading...</div>}>
                    <WalletDropdown
                      isOpen={isWalletOpen}
                      onClose={() => setIsWalletOpen(false)}
                      realBalance={realBalance}
                      bonusBalance={bonusBalance}
                      wageringRequired={wageringRequired}
                      wageringCompleted={wageringCompleted}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1"></div>
          )}

          {/* Right side - Actions */}
          <div className="flex items-center justify-end gap-2 lg:gap-3 flex-shrink-0 mobile-actions">
            {user ? (
              <>
                {/* Account Button */}
                <div ref={accountButtonRef} className="relative">
                  <button
                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors min-h-[48px] min-w-[48px] lg:min-h-[auto] lg:min-w-[auto] ${
                      isAccountOpen && !isWalletOpen
                        ? 'bg-[#3a4449]'
                        : 'bg-[#2a3439] hover:bg-[#3a4449]'
                    }`}
                  >
                    <User className="w-4 h-4 text-gray-300" />
                    <span className="hidden lg:inline text-sm font-bold text-gray-300 uppercase">Account</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 lg:block hidden transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AccountDropdown
                    isOpen={isAccountOpen}
                    onClose={() => setIsAccountOpen(false)}
                    onLogout={handleLogout}
                    realBalance={realBalance}
                    user={user}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Login Button */}
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="px-3 lg:px-6 py-3 lg:py-3.5 text-white rounded-lg text-xs lg:text-sm transition-all border border-gray-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.4)] uppercase"
                  style={{ fontWeight: 700, backgroundColor: '#2a3439', opacity: 1 }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4449'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2a3439'}
                >
                  Login
                </button>

                {/* Sign Up Button */}
                <button
                  onClick={() => setIsSignUpOpen(true)}
                  className="px-3 lg:px-6 py-3 lg:py-3.5 text-white rounded-lg text-xs lg:text-sm transition-all shadow-md hover:shadow-lg whitespace-nowrap uppercase"
                  style={{ fontWeight: 700, backgroundColor: '#2563eb', opacity: 1 }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modals - Lazy loaded, only renders when user clicks login/signup */}
      {(isLoginOpen || isSignUpOpen || isForgotPasswordOpen) && (
        <Suspense fallback={null}>
          <AuthModals
            isLoginOpen={isLoginOpen}
            isSignUpOpen={isSignUpOpen}
            isForgotPasswordOpen={isForgotPasswordOpen}
            onLoginClose={() => setIsLoginOpen(false)}
            onSignUpClose={() => setIsSignUpOpen(false)}
            onForgotPasswordClose={() => setIsForgotPasswordOpen(false)}
            onSwitchToSignUp={() => {
              setIsLoginOpen(false)
              setIsSignUpOpen(true)
            }}
            onSwitchToLogin={() => {
              setIsSignUpOpen(false)
              setIsForgotPasswordOpen(false)
              setIsLoginOpen(true)
            }}
            onSwitchToForgotPassword={() => {
              setIsLoginOpen(false)
              setIsForgotPasswordOpen(true)
            }}
          />
        </Suspense>
      )}
    </header>
  )
}

// Default export for dynamic import compatibility
export default StakeHeader
