'use client'

import { useEffect, useState, useRef } from 'react'
import { useJackpotAnimation } from '@/lib/contexts/jackpot-animation-context'

interface DigitProps {
  current: string
  next: string
}

function AnimatingDigit({ current, next }: DigitProps) {
  const [values, setValues] = useState([current, next])
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (next !== values[1]) {
      // Update values
      setValues([values[1], next])

      // Reset and animate
      if (containerRef.current) {
        containerRef.current.style.transition = 'none'
        containerRef.current.style.transform = 'translateY(0)'

        // Force reflow (intentional expression for DOM update)
        void containerRef.current.offsetHeight

        // Animate smooth odometer roll
        containerRef.current.style.transition = 'transform 0.85s cubic-bezier(0.4, 0, 0.2, 1)'
        containerRef.current.style.transform = 'translateY(-0.9em)'
      }
    }
  }, [next, values])

  // Fixed width based on character type
  const getWidth = (char: string) => {
    if (char === ',' || char === '.') return '0.25em'
    if (char === '$') return '0.65em'
    if (char === ' ') return '0.25em'
    return '0.6em' // digits
  }

  const width = getWidth(current)

  // If digit hasn't changed, just show it static
  if (current === next) {
    return (
      <span style={{
        display: 'inline-block',
        width: width,
        textAlign: 'center',
        height: '1.1em',
        lineHeight: '1.1em'
      }}>
        {current}
      </span>
    )
  }

  return (
    <span style={{
      position: 'relative',
      display: 'inline-block',
      overflow: 'hidden',
      height: '1.1em',
      width: width,
      textAlign: 'center',
      verticalAlign: 'baseline'
    }}>
      <span ref={containerRef} style={{
        display: 'inline-block',
        transform: 'translateY(0)',
        width: '100%'
      }}>
        <span style={{
          display: 'block',
          height: '0.9em',
          lineHeight: '0.9em',
          textAlign: 'center'
        }}>
          {values[0]}
        </span>
        <span style={{
          display: 'block',
          height: '0.9em',
          lineHeight: '0.9em',
          textAlign: 'center'
        }}>
          {values[1]}
        </span>
      </span>
    </span>
  )
}

interface JackpotCounterProps {
  value?: number
  className?: string
  strokeWidth?: number
  shadowSize?: number
  color?: string
  glowSize?: number
  useAnimation?: boolean // New prop to control animation usage
}

export function JackpotCounter({
  value,
  className = '',
  strokeWidth = 1,
  color = '#2563eb',
  glowSize = 1,
  useAnimation = false
}: JackpotCounterProps) {
  // Always call hooks (React rules)
  const { animatedAmount, currentJackpot } = useJackpotAnimation()

  // Use animated amount when useAnimation is true and no value is provided
  // Otherwise use provided value or current jackpot amount from context
  const displayValue = useAnimation && value === undefined
    ? animatedAmount
    : (value !== undefined ? value : (currentJackpot?.current_amount || 0))

  const [currentValue, setCurrentValue] = useState(displayValue)
  const [nextValue, setNextValue] = useState(displayValue)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (displayValue !== currentValue) {
      setNextValue(displayValue)

      // Clear any existing timer
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }

      // Update current after animation
      updateTimerRef.current = setTimeout(() => {
        setCurrentValue(displayValue)
      }, 500)
    }

    // Cleanup function
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [displayValue, currentValue])

  // Format the numbers
  const currentFormatted = `$${currentValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

  const nextFormatted = `$${nextValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

  // Pad to same length
  const maxLength = Math.max(currentFormatted.length, nextFormatted.length)
  const currentPadded = currentFormatted.padStart(maxLength, ' ')
  const nextPadded = nextFormatted.padStart(maxLength, ' ')

  return (
    <div className={`jackpot-counter ${className}`}>
      <div className="jackpot-numbers" style={{
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        position: 'relative'
      }}>
        {currentPadded.split('').map((char, i) => (
          <AnimatingDigit
            key={i}
            current={char}
            next={nextPadded[i] || char}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes textGlowPulse {
          0%, 100% {
            text-shadow:
              0 0 ${2 * glowSize}px #facc15,
              0 0 ${3 * glowSize}px #facc15,
              0 0 ${4 * glowSize}px #facc15;
          }
          50% {
            text-shadow:
              0 0 ${4 * glowSize}px #facc15,
              0 0 ${5 * glowSize}px #facc15,
              0 0 ${6 * glowSize}px #facc15;
          }
        }

        .jackpot-counter {
          font-family: Impact, 'Arial Black', sans-serif;
          font-weight: 700;
          font-size: 2.2em;
          letter-spacing: 0;
          color: ${color};
          -webkit-text-stroke: ${strokeWidth}px black;
          text-stroke: ${strokeWidth}px black;
          text-shadow:
            0 0 ${2 * glowSize}px #facc15,
            0 0 ${3 * glowSize}px #facc15,
            0 0 ${4 * glowSize}px #facc15;
          animation: textGlowPulse 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}