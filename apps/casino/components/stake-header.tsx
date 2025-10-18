'use client'

import { User, ChevronDown, Wallet } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/lib/contexts/sidebar-context'
import { useAuth } from '@/lib/contexts/auth-context'
import { useAuthModal } from '@/lib/contexts/auth-modal-context'
import { BalanceCounter } from '@/components/balance-counter'
import { AccountDropdown } from '@/components/account-dropdown'
import { useState, useRef, useEffect, lazy, Suspense, useMemo, useCallback } from 'react'
import * as React from 'react'
import { usePlayerBalance } from '@/lib/contexts/player-context'
import { useBonusTotals } from '@/lib/hooks/use-bonus-totals'
import { createClient } from '@/lib/supabase/client'
import { logError } from '@mypokies/monitoring/client'

// Lazy load heavy components - saves ~200KB from initial bundle
const AuthModals = lazy(() => import('@/components/auth-modals').then(mod => ({ default: mod.AuthModals })))
const WalletDropdown = lazy(() => import('@/components/wallet-dropdown').then(mod => ({ default: mod.WalletDropdown })))

export function StakeHeader() {
  // Get user from auth context instead of props
  const { user } = useAuth()
  const router = useRouter()
  const { isCollapsed } = useSidebar()
  const {
    isLoginOpen,
    isSignUpOpen,
    isForgotPasswordOpen,
    isVerificationOpen,
    verificationPhone,
    verificationBonus,
    openLogin,
    openSignUp,
    openVerification,
    closeLogin,
    closeSignUp,
    closeForgotPassword,
    closeVerification,
    switchToSignUp,
    switchToLogin,
    switchToForgotPassword,
  } = useAuthModal()
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
    <header style={{ zIndex: 150 }} className="relative transition-all duration-300">
      <style jsx>{`
        header {
          position: fixed;
          top: 0;
          background: ${isScrolled ? 'rgba(0, 0, 0, 1)' : 'transparent'};
          border-bottom: ${isScrolled ? '1px solid rgba(55, 65, 81, 0.5)' : 'none'};
          transition: all 0.3s;
        }

        /* Mobile styles */
        @media (max-width: 1023px) {
          header {
            left: 0;
            right: 0;
            height: 5rem;
          }

          header :global(.header-container) {
            position: relative;
          }

          header :global(.logo-container) {
            flex: 0 0 auto;
          }

          header :global(.logo-container img) {
            transform: scale(0.7475);
            transform-origin: left center;
          }

          header :global(.mobile-actions) {
            flex: 0 0 auto;
            position: relative;
            z-index: 20;
            margin-left: auto;
          }

          header :global(.balance-wallet-container) {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            max-width: 50%;
            z-index: 1;
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
            transform: scale(1.15);
          }
        }
      `}</style>
      <div className="h-full m-0 p-0 leading-[0]">
        <div className="h-full max-w-[1400px] mx-auto px-6 md:px-8 flex items-center my-0 py-0 leading-[0] header-container">
          {/* Left side - Logo */}
          <Link href="/" className="flex items-center relative flex-shrink-0 logo-container" style={{ width: 'auto', marginLeft: '-4px' }}>
            <div className="relative" style={{ width: '150px', height: '60px' }}>
              <video
                autoPlay
                loop
                muted
                playsInline
                className="object-contain object-left"
                style={{ width: '150px', height: '60px' }}
              >
                <source src="/logo-animated.mp4" type="video/mp4" />
              </video>
            </div>
          </Link>

          {/* Center - Balance & Wallet Island (when logged in) */}
          {user ? (
            <div className="flex-1 flex justify-center items-center balance-wallet-container px-2">
              {/* Mobile: Balance only */}
              <div className="lg:hidden flex items-center px-4 py-3 bg-[#1a2024] border border-[#2a3439] rounded-lg min-h-[48px]">
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
          <div className="flex items-center justify-end gap-2 lg:gap-3 flex-shrink-0 mobile-actions" style={{ marginRight: '-4px' }}>
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
                  onClick={openLogin}
                  className="px-6 py-3 rounded-lg transition-all border border-gray-700 flex items-center justify-center text-sm font-bold text-gray-300"
                  style={{ backgroundColor: 'rgb(42, 52, 57)', opacity: 1 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(58, 68, 73)'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(42, 52, 57)'
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  Login
                </button>

                {/* Sign Up Button */}
                <button
                  onClick={openSignUp}
                  className="px-6 py-3 rounded-lg transition-all flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: 'rgb(37, 99, 235)', opacity: 1 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(29, 78, 216)'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(37, 99, 235)'
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modals - Lazy loaded, only renders when user clicks login/signup */}
      {(isLoginOpen || isSignUpOpen || isForgotPasswordOpen || isVerificationOpen) && (
        <Suspense fallback={null}>
          <AuthModals
            isLoginOpen={isLoginOpen}
            isSignUpOpen={isSignUpOpen}
            isForgotPasswordOpen={isForgotPasswordOpen}
            isVerificationOpen={isVerificationOpen}
            verificationPhone={verificationPhone}
            verificationBonus={verificationBonus}
            onLoginClose={closeLogin}
            onSignUpClose={closeSignUp}
            onForgotPasswordClose={closeForgotPassword}
            onVerificationClose={closeVerification}
            onOpenVerification={openVerification}
            onSwitchToSignUp={switchToSignUp}
            onSwitchToLogin={switchToLogin}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        </Suspense>
      )}
    </header>
  )
}

// Default export for dynamic import compatibility
export default StakeHeader
