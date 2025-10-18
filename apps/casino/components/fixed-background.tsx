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
        background: 'linear-gradient(to bottom, #000000 0%, #000000 25%, #0a1628 100%)'
      }}></div>

      <style jsx>{`
        @keyframes twinkle-strong {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .star {
          animation: twinkle-strong 3s ease-in-out infinite;
        }
        .star-delay-1 {
          animation: twinkle-strong 3s ease-in-out infinite 1s;
        }
        .star-delay-2 {
          animation: twinkle-strong 3s ease-in-out infinite 2s;
        }
      `}</style>

      {/* Parallax star layers - white dots with glow */}
      {/* Far background stars - slowest */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ transform: `translateY(${scrollY * 0.2}px)` }}
      >
        <div className="absolute top-[5%] left-[10%] w-2 h-2 rounded-full bg-white star" style={{ boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)' }} />
        <div className="absolute top-[8%] right-[15%] w-1.5 h-1.5 rounded-full bg-white star-delay-1" style={{ boxShadow: '0 0 6px 1px rgba(255, 255, 255, 0.7)' }} />
        <div className="absolute top-[12%] left-[25%] w-2 h-2 rounded-full bg-white star-delay-2" style={{ boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)' }} />
        <div className="absolute top-[15%] right-[35%] w-1 h-1 rounded-full bg-white star" style={{ boxShadow: '0 0 4px 1px rgba(255, 255, 255, 0.6)' }} />
        <div className="absolute top-[20%] left-[45%] w-1.5 h-1.5 rounded-full bg-white star-delay-1" style={{ boxShadow: '0 0 6px 1px rgba(255, 255, 255, 0.7)' }} />
        <div className="absolute top-[25%] right-[55%] w-2 h-2 rounded-full bg-white star-delay-2" style={{ boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)' }} />
        <div className="absolute top-[30%] left-[65%] w-1 h-1 rounded-full bg-white star" style={{ boxShadow: '0 0 4px 1px rgba(255, 255, 255, 0.6)' }} />
        <div className="absolute top-[35%] right-[75%] w-1.5 h-1.5 rounded-full bg-white star-delay-1" style={{ boxShadow: '0 0 6px 1px rgba(255, 255, 255, 0.7)' }} />
      </div>

      {/* Mid-ground stars - medium speed */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ transform: `translateY(${scrollY * 0.4}px)` }}
      >
        <div className="absolute top-[3%] left-[20%] w-2 h-2 rounded-full bg-white star-delay-1" style={{ boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)' }} />
        <div className="absolute top-[10%] right-[25%] w-1.5 h-1.5 rounded-full bg-white star" style={{ boxShadow: '0 0 6px 1px rgba(255, 255, 255, 0.7)' }} />
        <div className="absolute top-[18%] left-[35%] w-2 h-2 rounded-full bg-white star-delay-2" style={{ boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)' }} />
        <div className="absolute top-[22%] right-[45%] w-1 h-1 rounded-full bg-white star-delay-1" style={{ boxShadow: '0 0 4px 1px rgba(255, 255, 255, 0.6)' }} />
        <div className="absolute top-[28%] left-[55%] w-1.5 h-1.5 rounded-full bg-white star" style={{ boxShadow: '0 0 6px 1px rgba(255, 255, 255, 0.7)' }} />
        <div className="absolute top-[32%] right-[65%] w-2 h-2 rounded-full bg-white star-delay-2" style={{ boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)' }} />
      </div>

      {/* Foreground stars - fastest */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ transform: `translateY(${scrollY * 0.6}px)` }}
      >
        <div className="absolute top-[7%] left-[15%] w-2.5 h-2.5 rounded-full bg-white star" style={{ boxShadow: '0 0 10px 3px rgba(255, 255, 255, 0.9)' }} />
        <div className="absolute top-[14%] right-[30%] w-2 h-2 rounded-full bg-white star-delay-2" style={{ boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)' }} />
        <div className="absolute top-[24%] left-[50%] w-2.5 h-2.5 rounded-full bg-white star-delay-1" style={{ boxShadow: '0 0 10px 3px rgba(255, 255, 255, 0.9)' }} />
        <div className="absolute top-[28%] right-[70%] w-2 h-2 rounded-full bg-white star" style={{ boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.8)' }} />
      </div>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
const FixedBackground = memo(FixedBackgroundComponent)

// Default export for dynamic import compatibility
export default FixedBackground