'use client'

import { useEffect, useState, memo } from 'react'

function FixedBackgroundComponent() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    // Throttle scroll handler to improve performance
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: -10 }}>
      {/* Night sky gradient - dark at top, darker blue at bottom */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, #000000 0%, #000000 5%, #010310 15%, #020617 30%, #050a1a 60%, #0a1628 100%)'
      }}></div>

      {/* Parallax star layers - move at different speeds */}
      {/* Far background stars - slowest - Optimized with 50% fewer stars */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ transform: `translateY(${scrollY * 0.2}px)` }}
      >
        {/* Top layer - key stars */}
        <div className="absolute top-[1%] left-[5%] text-white/60 text-sm animate-twinkle">•</div>
        <div className="absolute top-[1%] right-[25%] text-white/60 text-sm animate-twinkle-delay-1">•</div>
        <div className="absolute top-[2%] left-[42%] text-white/65 text-sm animate-twinkle-delay-2">•</div>
        <div className="absolute top-[2.5%] right-[42%] text-white/60 text-sm animate-twinkle-delay-1">•</div>
        <div className="absolute top-[3.5%] right-[48%] text-white/45 text-xs animate-twinkle">★</div>
        <div className="absolute top-[4%] right-[7%] text-white/60 text-xs animate-twinkle-delay-2">★</div>
        <div className="absolute top-[5%] left-[45%] text-white/60 text-sm animate-twinkle">•</div>
        <div className="absolute top-[6%] right-[18%] text-white/50 text-xs animate-twinkle-delay-2">★</div>
        <div className="absolute top-[6.5%] left-[82%] text-white/60 text-sm animate-twinkle">•</div>
        <div className="absolute top-[7%] right-[75%] text-white/55 text-sm animate-twinkle-delay-2">•</div>
        <div className="absolute top-[8%] left-[18%] text-white/55 text-sm animate-twinkle-delay-2">•</div>
        <div className="absolute top-[10%] right-[22%] text-white/50 text-xs animate-twinkle">★</div>

        {/* Medium density */}
        <div className="absolute top-[12%] left-[28%] text-white/40 text-xs animate-twinkle-delay-1">•</div>
        <div className="absolute top-[14%] right-[40%] text-white/40 text-[0.5rem] animate-twinkle-delay-1">•</div>
        <div className="absolute top-[16%] left-[42%] text-white/35 text-xs animate-twinkle-delay-1">•</div>
        <div className="absolute top-[20%] right-[42%] text-white/30 text-[0.5rem] animate-twinkle-delay-1">•</div>

        {/* Sparse */}
        <div className="absolute top-[25%] right-[52%] text-white/20 text-xs animate-twinkle">•</div>
        <div className="absolute top-[32%] right-[62%] text-white/10 text-[0.5rem] animate-twinkle-delay-2">•</div>
      </div>

      {/* Mid-ground stars - medium speed - Optimized */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ transform: `translateY(${scrollY * 0.4}px)` }}
      >
        {/* Top layer */}
        <div className="absolute top-[1%] left-[10%] text-white/65 text-sm animate-twinkle-delay-1">•</div>
        <div className="absolute top-[2%] right-[20%] text-white/65 text-sm animate-twinkle">★</div>
        <div className="absolute top-[4%] left-[50%] text-white/65 text-xs animate-twinkle">•</div>
        <div className="absolute top-[6%] left-[25%] text-white/55 text-sm animate-twinkle-delay-1">•</div>
        <div className="absolute top-[7%] left-[70%] text-white/55 text-sm animate-twinkle">•</div>
        <div className="absolute top-[10%] left-[5%] text-white/50 text-xs animate-twinkle-delay-1">★</div>

        {/* Medium density */}
        <div className="absolute top-[12%] left-[45%] text-white/45 text-sm animate-twinkle">★</div>
        <div className="absolute top-[15%] right-[55%] text-white/35 text-xs animate-twinkle-delay-1">•</div>
        <div className="absolute top-[19%] right-[75%] text-white/30 text-xs animate-twinkle">•</div>

        {/* Sparse */}
        <div className="absolute top-[25%] right-[10%] text-white/20 text-xs animate-twinkle-delay-2">•</div>
        <div className="absolute top-[30%] right-[30%] text-white/10 text-xs animate-twinkle-delay-1">•</div>
      </div>

      {/* Foreground stars - fastest - Optimized */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ transform: `translateY(${scrollY * 0.6}px)` }}
      >
        {/* Top layer */}
        <div className="absolute top-[1%] left-[12%] text-white/70 text-sm animate-twinkle">★</div>
        <div className="absolute top-[2%] right-[28%] text-white/75 text-base animate-twinkle">•</div>
        <div className="absolute top-[4%] left-[55%] text-white/70 text-sm animate-twinkle">★</div>
        <div className="absolute top-[6%] right-[85%] text-white/65 text-base animate-twinkle-delay-1">•</div>

        {/* Medium density */}
        <div className="absolute top-[10%] left-[52%] text-white/50 text-sm animate-twinkle-delay-1">•</div>
        <div className="absolute top-[13%] left-[72%] text-white/40 text-sm animate-twinkle">•</div>
        <div className="absolute top-[17%] left-[42%] text-white/30 text-sm animate-twinkle">•</div>

        {/* Sparse */}
        <div className="absolute top-[23%] left-[52%] text-white/15 text-sm animate-twinkle-delay-2">•</div>
      </div>

      {/* Extra large accent stars - very fast - Optimized */}
      <div
        className="absolute inset-0 overflow-hidden hidden md:block"
        style={{ transform: `translateY(${scrollY * 0.8}px)` }}
      >
        <div className="absolute top-[2%] right-[25%] text-white/80 text-lg animate-twinkle">•</div>
        <div className="absolute top-[6%] right-[45%] text-white/70 text-lg animate-twinkle-delay-2">•</div>
        <div className="absolute top-[10%] right-[65%] text-white/50 text-lg animate-twinkle-delay-1">•</div>
        <div className="absolute top-[15%] right-[75%] text-white/25 text-lg animate-twinkle">•</div>
      </div>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
const FixedBackground = memo(FixedBackgroundComponent)

// Default export for dynamic import compatibility
export default FixedBackground