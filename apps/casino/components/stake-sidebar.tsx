'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef, useMemo, lazy, Suspense, memo } from 'react'
import {
  Star,
  Gift,
  Crown,
  Menu,
  X,
  Coins,
  Dices,
  Search,
  Heart,
  Clock,
  Shield,
  Users,
  Trophy,
  Wallet,
  Home,
  Sparkles,
  Flame,
  Spade,
  CircleDot,
  Gamepad2,
  Clover,
  LayoutGrid,
  Headphones,
  Cherry,
  Video,
  Diamond
} from 'lucide-react'
import { useSidebar } from '@/lib/contexts/sidebar-context'
import { useAuthModal } from '@/lib/contexts/auth-modal-context'
import { useJackpotAnimation } from '@/lib/contexts/jackpot-animation-context'
import { usePlayerBalance } from '@/lib/contexts/player-context'
import { useBonusTotals } from '@/lib/hooks/use-bonus-totals'
import { JackpotCounter } from './jackpot-counter'
import { JackpotCountdown } from './jackpot-countdown'
import { logDebug } from '@mypokies/monitoring/client'

// Lazy load WalletModal - only loads when mobile user clicks wallet button
const WalletModal = lazy(() => import('./wallet-modal').then(mod => ({ default: mod.WalletModal })))

// Icons for slots/pokies
const SlotsIcon = Cherry

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  requiresLogin?: boolean
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const getNavSections = (isLoggedIn: boolean): NavSection[] => {
  const sections: NavSection[] = [
    // Top section (no title)
    {
      items: [
        { label: 'HOME', href: '/', icon: Home },
        { label: 'NEW RELEASES', href: '/games/new', icon: Sparkles },
        { label: 'FAVORITES', href: '/games/favorites', icon: Star, requiresLogin: true },
        { label: 'RECENT', href: '/games/recent', icon: Clock, requiresLogin: true },
      ]
    },
    // REWARDS section
    {
      title: 'REWARDS',
      items: [
        { label: 'PROMOTIONS', href: '/promotions', icon: Gift },
        { label: 'WEEKLY JACKPOT', href: '/jackpot', icon: Trophy },
      ]
    },
    // GAMES section
    {
      title: 'GAMES',
      items: [
        { label: 'ORIGINALS', href: '/games/originals', icon: Flame },
        { label: 'SLOTS', href: '/games/pokies', icon: SlotsIcon },
        { label: 'LIVE CASINO', href: '/games/live', icon: Video, badge: 'LIVE' },
        { label: 'BLACKJACK', href: '/games/blackjack', icon: Spade },
        { label: 'ROULETTE', href: '/games/roulette', icon: CircleDot },
        { label: 'GAME SHOWS', href: '/games/shows', icon: Gamepad2 },
        { label: 'TABLE GAMES', href: '/games/table', icon: Coins },
        { label: 'BACCARAT', href: '/games/baccarat', icon: Diamond },
        { label: 'PROVIDERS', href: '/providers', icon: LayoutGrid },
      ]
    },
    // Bottom section (no title)
    {
      items: [
        { label: 'VIP', href: '/vip', icon: Crown },
        { label: 'REFERRAL', href: '/referral', icon: Users },
        { label: 'LEADERBOARD', href: '/leaderboard', icon: Trophy },
        { label: 'LIVE SUPPORT', href: '/support', icon: Headphones },
      ]
    }
  ]

  return sections
}

interface StakeSidebarProps {
  user?: {
    email?: string
    user_metadata?: {
      first_name?: string
    }
  } | null
}

export const StakeSidebar = memo(function StakeSidebar({ user }: StakeSidebarProps = {}) {
  const pathname = usePathname()
  const { isCollapsed, toggleCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar()
  const { openSignUp } = useAuthModal()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isLoggedIn = !!user
  const [sliderStyle, setSliderStyle] = useState({ top: 0, height: 0 })
  const [mobileSliderStyle, setMobileSliderStyle] = useState({ left: 0, width: 0 })
  const [mobileMenuSliderStyle, setMobileMenuSliderStyle] = useState({ top: 0, height: 0 })
  const [isJellyAnimating, setIsJellyAnimating] = useState(false)
  const [isDesktopJellyAnimating, setIsDesktopJellyAnimating] = useState(false)
  const [isMobileMenuJellyAnimating, setIsMobileMenuJellyAnimating] = useState(false)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const navItemRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({})
  const mobileNavRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({})
  const mobileMenuRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({})
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const walletButtonRef = useRef<HTMLButtonElement>(null)

  // Get real-time jackpot value from global context
  const { currentJackpot, isLoading: jackpotLoading } = useJackpotAnimation()
  const jackpotValue = currentJackpot?.current_amount || 0
  const [displayValue, setDisplayValue] = useState(jackpotValue)

  // Get balance and bonus data
  const { balances } = usePlayerBalance()

  // PERFORMANCE FIX: Use shared hook instead of duplicating calculations
  const { totalBonusBalance, totalWageringRequired, totalWageringCompleted } = useBonusTotals()

  // Get real balance
  const primaryBalance = balances.find(b => b.currency === 'USD') || balances[0]
  const realBalance = primaryBalance?.balance || 0

  // Smooth transition when jackpot value updates
  useEffect(() => {
    if (jackpotValue > 0 && jackpotValue !== displayValue) {
      setDisplayValue(jackpotValue)
    }
  }, [jackpotValue, displayValue])

  // Update desktop sidebar slider position when pathname changes or sidebar state changes
  useEffect(() => {
    // Trigger jelly animation for desktop
    setIsDesktopJellyAnimating(true)
    const jellyTimer = setTimeout(() => setIsDesktopJellyAnimating(false), 800)

    const activeNav = navItemRefs.current[pathname]
    if (activeNav) {
      setSliderStyle({
        top: activeNav.offsetTop,
        height: activeNav.offsetHeight
      })
    }

    return () => clearTimeout(jellyTimer)
  }, [pathname, isCollapsed])

  // Update mobile bottom nav slider position when pathname changes or menu opens or wallet opens
  useEffect(() => {
    // Trigger jelly animation
    setIsJellyAnimating(true)
    const timer = setTimeout(() => setIsJellyAnimating(false), 800)

    if (isMobileOpen && menuButtonRef.current) {
      // When menu is open, highlight the menu button
      setMobileSliderStyle({
        left: menuButtonRef.current.offsetLeft,
        width: menuButtonRef.current.offsetWidth
      })
    } else if (isWalletModalOpen && walletButtonRef.current) {
      // When wallet modal is open, highlight the wallet button
      setMobileSliderStyle({
        left: walletButtonRef.current.offsetLeft,
        width: walletButtonRef.current.offsetWidth
      })
    } else {
      // Otherwise highlight the active page
      const activeMobileNav = mobileNavRefs.current[pathname]
      if (activeMobileNav) {
        setMobileSliderStyle({
          left: activeMobileNav.offsetLeft,
          width: activeMobileNav.offsetWidth
        })
      }
    }

    return () => clearTimeout(timer)
  }, [pathname, isMobileOpen, isWalletModalOpen])

  // Update mobile menu slider position when pathname or menu opens
  useEffect(() => {
    // Trigger jelly animation for mobile menu
    setIsMobileMenuJellyAnimating(true)
    const jellyTimer = setTimeout(() => setIsMobileMenuJellyAnimating(false), 800)

    const activeMobileMenuNav = mobileMenuRefs.current[pathname]
    if (activeMobileMenuNav && isMobileOpen) {
      setMobileMenuSliderStyle({
        top: activeMobileMenuNav.offsetTop,
        height: activeMobileMenuNav.offsetHeight
      })
    }

    return () => clearTimeout(jellyTimer)
  }, [pathname, isMobileOpen])

  // Close sidebar ONLY when clicking on whitespace inside sidebar (desktop only, when expanded)
  useEffect(() => {
    function handleSidebarClick(event: MouseEvent) {
      logDebug('Sidebar click handler fired', { context: 'StakeSidebar', data: { isCollapsed } })
      // Only on desktop when sidebar is expanded
      if (window.innerWidth >= 1024 && !isCollapsed && sidebarRef.current) {
        const target = event.target as HTMLElement
        logDebug('Click target detected', {
          context: 'StakeSidebar',
          data: { tagName: target.tagName, className: target.className }
        })

        // Check if click is on an interactive element (link, button, input, or their children)
        const isInteractiveElement = target.closest('a, button, input, img, svg, [role="button"]')
        logDebug('Interactive element check', {
          context: 'StakeSidebar',
          data: { isInteractive: !!isInteractiveElement }
        })

        // If NOT clicking on an interactive element, close the sidebar
        if (!isInteractiveElement) {
          logDebug('Closing sidebar via whitespace click', { context: 'StakeSidebar' })
          event.stopPropagation()
          event.preventDefault()
          toggleCollapsed()
        }
      }
    }

    // Only add listener when sidebar is expanded on desktop
    if (!isCollapsed && window.innerWidth >= 1024 && sidebarRef.current) {
      logDebug('Adding click listener to sidebar', { context: 'StakeSidebar' })
      const currentSidebar = sidebarRef.current
      currentSidebar.addEventListener('click', handleSidebarClick)
      return () => {
        logDebug('Removing click listener from sidebar', { context: 'StakeSidebar' })
        currentSidebar.removeEventListener('click', handleSidebarClick)
      }
    }
  }, [isCollapsed, toggleCollapsed])

  // Memoize navigation sections to avoid recreation on every render
  const navSections = useMemo(() => getNavSections(!!user), [user])

  return (
    <>

      {/* Mobile Bottom Navigation - Floating Island */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4" style={{ zIndex: 9999 }}>
        <div className="backdrop-blur-md rounded-full p-1" style={{ backgroundColor: 'rgba(26, 32, 36, 0.2)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', filter: 'drop-shadow(0 10px 24px rgba(0, 0, 0, 0.5))' }}>
          <div className="flex items-center justify-around relative" style={{ height: '3.525rem', maxHeight: '3.525rem', overflow: 'visible' }}>
            {/* Animated sliding background - rounded pill style */}
            <div
              className={`absolute rounded-full ${isJellyAnimating ? 'jelly-blob-active' : ''}`}
              style={{
                left: mobileSliderStyle.left,
                width: mobileSliderStyle.width,
                height: '100%',
                top: '0',
                backgroundColor: 'rgba(50, 58, 67, 0.6)',
                transform: 'scale(1.2)',
                transition: 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s ease'
              }}
            />
          {/* Menu Button - Leftmost */}
          <button
            ref={menuButtonRef}
            onClick={() => {
              // Close wallet modal if open, then toggle menu
              if (isWalletModalOpen) {
                setIsWalletModalOpen(false)
              }
              setIsMobileOpen(!isMobileOpen)
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all gap-0.5 relative z-10 ${
              isMobileOpen ? 'font-bold' : 'text-gray-300'
            }`}
            style={isMobileOpen ? {
              color: '#45a5ff',
              transform: 'scale(1.35)'
            } : {}}
          >
            {isMobileOpen ? (
              <X className="w-4 h-4 transition-transform" />
            ) : (
              <Menu className="w-4 h-4 transition-transform" />
            )}
            <span className="text-[10px]">Menu</span>
          </button>

          {/* Jackpot */}
          <Link
            ref={(el) => { mobileNavRefs.current['/jackpot'] = el }}
            href="/jackpot"
            prefetch={true}
            onClick={() => {
              setIsMobileOpen(false)
              setIsWalletModalOpen(false)
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative z-10 gap-0.5 ${
              pathname === '/jackpot' && !isMobileOpen && !isWalletModalOpen ? 'font-bold' : 'text-gray-300'
            }`}
            style={pathname === '/jackpot' && !isMobileOpen && !isWalletModalOpen ? {
              color: '#45a5ff',
              transform: 'scale(1.35)'
            } : {}}
          >
            <Trophy
              className={`transition-transform w-4 h-4`}
              style={pathname === '/jackpot' && !isMobileOpen && !isWalletModalOpen ? { color: '#45a5ff' } : {}}
            />
            <span className="text-[10px]">Jackpot</span>
          </Link>

          {/* Home - Center */}
          <Link
            ref={(el) => { mobileNavRefs.current['/'] = el }}
            href="/"
            prefetch={true}
            onClick={() => {
              setIsMobileOpen(false)
              setIsWalletModalOpen(false)
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative z-10 gap-0.5 ${
              pathname === '/' && !isMobileOpen && !isWalletModalOpen ? 'font-bold' : 'text-gray-300'
            }`}
            style={pathname === '/' && !isMobileOpen && !isWalletModalOpen ? {
              color: '#45a5ff',
              transform: 'scale(1.35)'
            } : {}}
          >
            <Home
              className={`transition-transform w-4 h-4`}
              style={pathname === '/' && !isMobileOpen && !isWalletModalOpen ? { color: '#45a5ff' } : {}}
            />
            <span className="text-[10px]">Home</span>
          </Link>

          {/* VIP */}
          <Link
            ref={(el) => { mobileNavRefs.current['/vip'] = el }}
            href="/vip"
            prefetch={true}
            onClick={() => {
              setIsMobileOpen(false)
              setIsWalletModalOpen(false)
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative z-10 gap-0.5 ${
              pathname === '/vip' && !isMobileOpen && !isWalletModalOpen ? 'font-bold' : 'text-gray-300'
            }`}
            style={pathname === '/vip' && !isMobileOpen && !isWalletModalOpen ? {
              color: '#45a5ff',
              transform: 'scale(1.35)'
            } : {}}
          >
            <Crown
              className={`transition-transform w-4 h-4`}
              style={pathname === '/vip' && !isMobileOpen && !isWalletModalOpen ? { color: '#45a5ff' } : {}}
            />
            <span className="text-[10px]">VIP</span>
          </Link>

          {/* Wallet Button - Rightmost (Mobile Only) */}
          <button
            ref={walletButtonRef}
            onClick={() => {
              // Close menu if open
              if (isMobileOpen) {
                setIsMobileOpen(false)
              }

              // If not logged in, show signup modal instead of wallet
              if (!isLoggedIn) {
                openSignUp()
                return
              }

              // If logged in, toggle wallet modal
              setIsWalletModalOpen(!isWalletModalOpen)
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all gap-0.5 relative z-10 ${
              isWalletModalOpen ? 'font-bold' : 'text-gray-300'
            }`}
            style={isWalletModalOpen ? {
              color: '#45a5ff',
              transform: 'scale(1.35)'
            } : {}}
          >
            <Wallet className="w-4 h-4 transition-transform" />
            <span className="text-[10px]">Wallet</span>
          </button>
          </div>
        </div>
      </nav>

      {/* Wallet Modal (Mobile Only) - Lazy loaded */}
      {isWalletModalOpen && (
        <Suspense fallback={null}>
          <WalletModal
            isOpen={isWalletModalOpen}
            onClose={() => setIsWalletModalOpen(false)}
            realBalance={realBalance}
            bonusBalance={totalBonusBalance}
            wageringRequired={totalWageringRequired}
            wageringCompleted={totalWageringCompleted}
          />
        </Suspense>
      )}


      {/* Sidebar - Desktop left side, Mobile bottom sheet */}
      <aside
        ref={sidebarRef}
        style={{ zIndex: 9990 }}
        className={`relative overflow-hidden ${isCollapsed ? 'lg:cursor-pointer' : ''}`}
        onClick={() => {
          logDebug('Aside onClick event', { data: { isCollapsed } })
          // Only expand on desktop when collapsed
          if (isCollapsed && window.innerWidth >= 1024) {
            logDebug('Expanding sidebar via aside click')
            toggleCollapsed();
          }
        }}
      >
        <style jsx>{`
          aside {
            position: fixed;
            background: linear-gradient(180deg, #050810 0%, #070a12 100%);
            overflow-y: auto;
            overflow-x: visible;
          }

          /* Active state for navigation items */
          :global(.nav-item-active) {
            color: #45a5ff !important;
          }

          :global(.nav-item-active svg) {
            color: #45a5ff !important;
          }

          /* Hover effect for navigation items */
          :global(.hover-nav-item:not(.text-gray-500):hover) {
            color: #45a5ff !important;
          }

          :global(.hover-nav-item:not(.text-gray-500):hover svg) {
            color: #45a5ff !important;
          }

          /* Breathing glow animation for active nav items */
          @keyframes navGlowBreathe {
            0%, 100% {
              text-shadow: 0 0 15px rgba(69, 165, 255, 0.5), 0 0 25px rgba(69, 165, 255, 0.3);
            }
            50% {
              text-shadow: 0 0 20px rgba(69, 165, 255, 0.6), 0 0 35px rgba(69, 165, 255, 0.4);
            }
          }

          :global(.nav-item-active) {
            animation: navGlowBreathe 2s ease-in-out infinite;
          }

          /* Jelly blob stretch animation - stretches both horizontally and vertically */
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

          :global(.jelly-blob-active) {
            animation: jellyStretch 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          /* Inflate animation for mobile nav - combines scale with jelly effect */
          @keyframes inflateJelly {
            0% {
              transform: scale(1, 1);
            }
            20% {
              transform: scale(1.5, 0.95);
            }
            40% {
              transform: scale(1.25, 1.4);
            }
            60% {
              transform: scale(1.4, 1.3);
            }
            80% {
              transform: scale(1.32, 1.37);
            }
            100% {
              transform: scale(1.35, 1.35);
            }
          }

          :global(.inflate-jelly-active) {
            animation: inflateJelly 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          /* Breathing glow animation for mobile nav */
          @keyframes breatheGlowMobile {
            0%, 100% {
              box-shadow: 0 0 15px rgba(56, 112, 255, 0.3), 0 0 25px rgba(56, 112, 255, 0.2);
            }
            50% {
              box-shadow: 0 0 20px rgba(56, 112, 255, 0.4), 0 0 35px rgba(56, 112, 255, 0.3);
            }
          }

          :global(.glow-breathe-mobile) {
            animation: breatheGlowMobile 2s ease-in-out infinite;
          }

          /* Mobile styles */
          @media (max-width: 1023px) {
            aside {
              left: 0;
              right: 0;
              top: 5rem;
              bottom: -5rem;
              padding-bottom: 12rem;
              border-radius: 0;
              transform: translateY(${isMobileOpen ? '0' : 'calc(100% + 5rem)'});
              transition: transform 0.3s ease-out;
              overflow-y: auto;
              overflow-x: hidden;
              min-height: calc(100vh);
            }
          }

          @keyframes jackpotBounce {
            0% {
              transform: translateY(50px);
            }
            25% {
              transform: translateY(30px);
            }
            40% {
              transform: translateY(-25px);
            }
            55% {
              transform: translateY(10px);
            }
            70% {
              transform: translateY(-12px);
            }
            85% {
              transform: translateY(5px);
            }
            95% {
              transform: translateY(-2px);
            }
            100% {
              transform: translateY(0);
            }
          }

          .jackpot-bounce-animation {
            animation: jackpotBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }

          /* Desktop styles */
          @media (min-width: 1024px) {
            aside {
              left: 0;
              top: 0;
              height: 100vh;
              transform: translateY(0);
              border-radius: 0;
              width: ${isCollapsed ? '5rem' : '18rem'};
              transition: width 0.3s ease;
              border-right: 1px solid rgba(55, 65, 81, 0.5);
            }
          }

          /* Jackpot glow animation */
          @keyframes glowPulse {
            0%, 100% {
              box-shadow: 0 0 10px 2px #45a5ff;
            }
            50% {
              box-shadow: 0 0 20px 4px #45a5ff;
            }
          }

          :global(.jackpot-glow) {
            animation: glowPulse 5s ease-in-out infinite;
          }
        `}</style>
        {/* Header - Different for mobile and desktop */}
        <div className="py-4 max-lg:pt-8 max-lg:px-4 relative" style={{ zIndex: 10 }}>
          {/* Desktop: Hamburger toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
            className={`hidden lg:flex w-full h-12 items-center px-4 text-gray-300 hover:text-white hover:bg-[#2a3439] transition-all ${
              isCollapsed ? 'justify-center' : 'justify-start'
            }`}
            title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {isCollapsed ? (
              <Menu className="w-7 h-7" />
            ) : (
              <X className="w-6 h-6" />
            )}
          </button>

          {/* Mobile: Progressive Jackpot Display */}
          <div className={`lg:hidden mt-[3px] mb-1 pb-1 relative ${isMobileOpen ? 'jackpot-bounce-animation' : ''}`} style={{ zIndex: 10 }}>
            <div className="absolute left-3 top-0 z-10 transform" style={{
              transform: 'translate(34px, -17px)',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '0px'
            }}>
              <Image src="/logo.webp" alt="MyPokies" width={90} height={35} style={{ height: '35px', width: 'auto' }} priority />
            </div>
            <div className="bg-black pb-1 px-3 mx-4 flex items-center justify-center jackpot-glow" style={{ border: '2.67px solid #FFD700', paddingTop: '12px' }}>
              {jackpotLoading ? (
                <div className="text-4xl text-yellow-400">Loading...</div>
              ) : (
                <JackpotCounter useAnimation={true} className="text-4xl" />
              )}
            </div>
            <div className="mt-1 mb-2 mx-4 flex justify-end pr-1">
              <JackpotCountdown />
            </div>
          </div>


          {/* Mobile: Search Bar */}
          <div className="lg:hidden pt-2 mb-0 relative" style={{ zIndex: 10 }}>
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search games..."
                className="w-full bg-[#1a2024] border border-[#2a3439] text-gray-100 placeholder-gray-500 pl-12 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 pt-2 relative" style={{ zIndex: 10 }}>
          {/* Progressive Jackpot Display - Desktop only */}
          <div className={`hidden lg:block mb-4 relative ${isCollapsed ? 'invisible' : ''}`}>
            <div className="absolute left-3 top-0 z-10 transform" style={{
              transform: 'translateY(-17px)',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '0px'
            }}>
              <Image src="/logo.webp" alt="MyPokies" width={90} height={35} style={{ height: isCollapsed ? '25px' : '35px', width: 'auto' }} priority />
            </div>
            <div className="bg-black pb-1 px-3 flex items-center justify-center jackpot-glow" style={{ border: '2.67px solid #FFD700', paddingTop: '12px' }}>
              {jackpotLoading ? (
                <div className={`${isCollapsed ? 'text-2xl' : 'text-4xl'} text-yellow-400`}>Loading...</div>
              ) : (
                <JackpotCounter
                  useAnimation={true}
                  className={isCollapsed ? 'text-2xl' : 'text-4xl'}
                />
              )}
            </div>
            <div className="mt-1 flex justify-end pr-1">
              <JackpotCountdown />
            </div>
          </div>

          <div className="max-lg:bg-[#1a2024] max-lg:rounded-xl max-lg:p-3">
            <div className="space-y-1 relative">
              {navSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {/* Divider before section (except first) */}
                  {sectionIndex > 0 && (
                    <div className="my-4 border-t border-gray-700/50"></div>
                  )}

                  {/* Section title */}
                  {section.title && !isCollapsed && (
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {section.title}
                    </div>
                  )}

                  {/* Section items */}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      const isDisabled = item.requiresLogin && !isLoggedIn

                      return (
                        <Link
                          key={item.href}
                          ref={(el) => {
                            navItemRefs.current[item.href] = el
                            mobileMenuRefs.current[item.href] = el
                          }}
                          href={item.href}
                          prefetch={true}
                          onClick={(e) => {
                            if (isDisabled) {
                              e.preventDefault();
                              return;
                            }
                            if (isCollapsed) e.stopPropagation();
                            setIsMobileOpen(false);
                          }}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all duration-200 group relative z-10 hover-nav-item ${
                            isDisabled
                              ? 'text-gray-500 cursor-not-allowed'
                              : isActive
                              ? 'nav-item-active'
                              : 'text-white'
                          } ${isCollapsed ? 'justify-center' : ''}`}
                          title={isCollapsed ? item.label : ''}
                          style={isActive && !isDisabled ? {
                            color: '#45a5ff',
                            background: 'linear-gradient(to right, rgba(69, 165, 255, 0.15), transparent)',
                            borderLeft: '2px solid #45a5ff'
                          } : {}}
                        >
                          <Icon
                            className={`flex-shrink-0 ${
                              isDisabled ? 'text-gray-500' : isActive ? 'text-[#45a5ff]' : 'text-white'
                            } ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} transition-colors`}
                          />
                          {!isCollapsed && (
                            <span className="flex-1">{item.label}</span>
                          )}
                          {/* Badge (e.g., LIVE) */}
                          {!isCollapsed && item.badge && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded">
                              {item.badge}
                            </span>
                          )}

                          {/* Tooltip for collapsed state - Desktop only */}
                          {isCollapsed && (
                            <div className="hidden lg:block absolute left-full ml-2 px-3 py-2 bg-[#2a3439] text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap border border-[#3a4449] z-50">
                              {item.label}
                              {item.badge && (
                                <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-red-600 text-white rounded">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </nav>
      </aside>
    </>
  )
})

// Default export for dynamic import compatibility
export default StakeSidebar
