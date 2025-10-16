'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePlayerBalance } from '@/lib/contexts/player-context'

interface DigitProps {
  current: string
  next: string
  direction: 'up' | 'down' | 'none'
}

function AnimatingDigit({ current, next, direction }: DigitProps) {
  const [values, setValues] = useState([current, next])
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (next !== values[1] && direction !== 'none') {
      // Update values
      setValues([values[1], next])

      // Reset and animate
      if (containerRef.current) {
        containerRef.current.style.transition = 'none'

        // Start position depends on direction
        if (direction === 'up') {
          // New number comes from below, pushes current up
          containerRef.current.style.transform = 'translateY(0)'
        } else {
          // New number comes from above, pushes current down
          containerRef.current.style.transform = 'translateY(0)'
        }

        // Force reflow (intentional expression for DOM update)
        void containerRef.current.offsetHeight

        // Animate
        containerRef.current.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        if (direction === 'up') {
          containerRef.current.style.transform = 'translateY(-1em)'
        } else {
          containerRef.current.style.transform = 'translateY(-1em)'
        }
      }
    }
  }, [next, values, direction])

  // Fixed width based on character type
  const getWidth = (char: string) => {
    if (char === ',' || char === '.') return '0.25em'
    if (char === '$') return '0.65em'
    if (char === ' ') return '0.25em'
    return '0.6em' // digits
  }

  const width = getWidth(current)

  // If digit hasn't changed, just show it static
  if (current === next || direction === 'none') {
    return (
      <span style={{
        display: 'inline-block',
        width: width,
        textAlign: 'center',
        height: '1em',
        lineHeight: '1em'
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
      height: '1em',
      width: width,
      textAlign: 'center',
      verticalAlign: 'baseline'
    }}>
      <span ref={containerRef} style={{
        display: 'inline-block',
        transform: 'translateY(0)',
        width: '100%'
      }}>
        {direction === 'down' && (
          <span style={{
            display: 'block',
            height: '1em',
            lineHeight: '1em',
            textAlign: 'center'
          }}>
            {values[1]}
          </span>
        )}
        <span style={{
          display: 'block',
          height: '1em',
          lineHeight: '1em',
          textAlign: 'center'
        }}>
          {values[0]}
        </span>
        {direction === 'up' && (
          <span style={{
            display: 'block',
            height: '1em',
            lineHeight: '1em',
            textAlign: 'center'
          }}>
            {values[1]}
          </span>
        )}
      </span>
    </span>
  )
}

interface BalanceCounterProps {
  className?: string
}

export function BalanceCounter({ className = '' }: BalanceCounterProps) {
  const { balances, loading } = usePlayerBalance()
  const [currentValue, setCurrentValue] = useState(0)
  const [nextValue, setNextValue] = useState(0)
  const [direction, setDirection] = useState<'up' | 'down' | 'none'>('none')
  const [flash, setFlash] = useState(false)
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Get the primary balance (assuming first currency or USD)
  const primaryBalance = balances.find(b => b.currency === 'USD') || balances[0]
  const balanceValue = primaryBalance?.balance || 0

  useEffect(() => {
    if (balanceValue !== currentValue) {
      const isIncreasing = balanceValue > currentValue
      setDirection(isIncreasing ? 'up' : 'down')
      setNextValue(balanceValue)

      // Clear any existing timers
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current)
      }
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }

      // Trigger flash
      setFlash(true)
      flashTimerRef.current = setTimeout(() => setFlash(false), 500)

      // Update current after animation
      updateTimerRef.current = setTimeout(() => {
        setCurrentValue(balanceValue)
        setDirection('none')
      }, 500)
    }

    // Cleanup function
    return () => {
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current)
      }
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [balanceValue, currentValue])

  if (loading) {
    return <span className={className}>$0.00</span>
  }

  // Format the numbers
  const currentFormatted = `$${currentValue.toFixed(2)}`
  const nextFormatted = `$${nextValue.toFixed(2)}`

  // Pad to same length
  const maxLength = Math.max(currentFormatted.length, nextFormatted.length)
  const currentPadded = currentFormatted.padStart(maxLength, ' ')
  const nextPadded = nextFormatted.padStart(maxLength, ' ')

  return (
    <span
      className={`balance-counter ${className} ${flash ? (direction === 'up' ? 'flash-green' : 'flash-red') : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        position: 'relative',
        transition: 'color 0.15s ease-in-out'
      }}
    >
      {currentPadded.split('').map((char, i) => (
        <AnimatingDigit
          key={i}
          current={char}
          next={nextPadded[i] || char}
          direction={direction}
        />
      ))}

      <style jsx>{`
        .balance-counter {
          color: inherit;
        }

        .flash-green {
          animation: flashGreen 0.5s ease-in-out;
        }

        .flash-red {
          animation: flashRed 0.5s ease-in-out;
        }

        @keyframes flashGreen {
          0%, 100% { color: inherit; }
          50% { color: #22c55e; }
        }

        @keyframes flashRed {
          0%, 100% { color: inherit; }
          50% { color: #ef4444; }
        }
      `}</style>
    </span>
  )
}
