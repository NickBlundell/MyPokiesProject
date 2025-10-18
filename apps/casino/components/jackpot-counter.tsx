'use client'

import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { useJackpotAnimation } from '@/lib/contexts/jackpot-animation-context'
import Image from 'next/image'

interface DigitProps {
  current: string
  next: string
  digitHeight: number
}

function AnimatingDigit({ current, next, digitHeight }: DigitProps) {
  // Track the currently visible digit
  const [displayDigit, setDisplayDigit] = useState(current)
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track the OLD digit that's animating out - this ensures stable DOM during animation
  const [animatingOutDigit, setAnimatingOutDigit] = useState(current)
  const [animatingInDigit, setAnimatingInDigit] = useState(current)

  // Track pending animation if one arrives while animating
  const pendingNextRef = useRef<string | null>(null)

  // Initialize transform on mount and reset after animation completes
  // Use layout effect to ensure this happens before browser paints
  useLayoutEffect(() => {
    if (containerRef.current) {
      // If not animating, ensure transform is at 0 so first slot is visible
      if (!isAnimating) {
        containerRef.current.style.transition = 'none'
        containerRef.current.style.transform = 'translateY(0)'
      }
    }
  }, [isAnimating])

  // Check if this is a comma or period (make them smaller)
  const isComma = displayDigit === ','
  const isPeriod = displayDigit === '.'

  // Calculate the actual image size (smaller for punctuation)
  const imageHeight = isPeriod
    ? digitHeight * 0.4  // Periods are 40% of digit height
    : isComma
    ? digitHeight * 0.5  // Commas are 50% of digit height
    : digitHeight  // Numbers are full height

  useEffect(() => {
    // Only animate if the next value is different
    if (next !== displayDigit) {
      // If already animating, queue the new value
      if (isAnimating) {
        pendingNextRef.current = next
        return
      }

      // Start animation
      setIsAnimating(true)

      // Set the stable digits for the animation
      // OLD digit goes in first slot (animates out), NEW digit goes in second slot (animates in)
      setAnimatingOutDigit(displayDigit)
      setAnimatingInDigit(next)

      if (containerRef.current) {
        const container = containerRef.current

        // Step 1: Reset to initial position WITHOUT transition
        container.style.transition = 'none'
        container.style.transform = 'translateY(0)'

        // Force a reflow to ensure the reset is applied
        void container.offsetHeight

        // Step 2: Apply transition and animate
        // Use setTimeout to ensure the reset has been painted
        setTimeout(() => {
          if (container) {
            container.style.transition = 'transform 0.85s cubic-bezier(0.4, 0, 0.2, 1)'
            container.style.transform = `translateY(-${digitHeight}px)`
          }
        }, 10)

        // Step 3: Update the display digit AFTER animation completes
        setTimeout(() => {
          // Update to the new digit
          setDisplayDigit(next)
          setIsAnimating(false)
          // Transform reset happens in useLayoutEffect when isAnimating becomes false

          // Check if there's a pending animation and let useEffect pick it up
          const pending = pendingNextRef.current
          pendingNextRef.current = null
        }, 860) // Slightly longer than animation to ensure completion
      }
    }
  }, [next, displayDigit, digitHeight, isAnimating])

  // Map characters to image filenames
  const getImageName = (char: string) => {
    if (char >= '0' && char <= '9') return `${char}.png`
    if (char === '$') return '$.png'
    if (char === ',') return 'comma.png'
    if (char === '.') return 'fullstop.png'
    return null
  }

  const oldDigitImage = getImageName(animatingOutDigit)
  const newDigitImage = getImageName(animatingInDigit)
  const displayImage = getImageName(displayDigit)

  // If unsupported character, show nothing
  if (!displayImage) {
    return (
      <div style={{ height: `${digitHeight}px`, width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
    )
  }

  // During animation: show stable oldDigit -> newDigit transition
  // After animation: both slots show displayDigit (until next animation)
  const firstSlotImage = isAnimating ? oldDigitImage : displayImage
  const secondSlotImage = isAnimating ? newDigitImage : displayImage

  // Always render the two-digit animation structure (keeps DOM consistent)
  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      height: `${digitHeight}px`,
      width: 'auto'
    }}>
      <div ref={containerRef} style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%'
      }}>
        {/* First slot: OLD digit during animation, display digit when idle */}
        <div style={{
          height: `${digitHeight}px`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          {firstSlotImage && (
            <Image
              src={`/numbers/${firstSlotImage}`}
              alt={isAnimating ? animatingOutDigit : displayDigit}
              width={imageHeight}
              height={imageHeight}
              className="object-contain"
              style={{ height: `${imageHeight}px`, width: 'auto' }}
              priority
            />
          )}
        </div>
        {/* Second slot: NEW digit during animation, display digit when idle */}
        <div style={{
          height: `${digitHeight}px`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          {secondSlotImage && (
            <Image
              src={`/numbers/${secondSlotImage}`}
              alt={isAnimating ? animatingInDigit : displayDigit}
              width={imageHeight}
              height={imageHeight}
              className="object-contain"
              style={{ height: `${imageHeight}px`, width: 'auto' }}
              priority
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface JackpotCounterProps {
  value?: number
  className?: string
  useAnimation?: boolean
}

export function JackpotCounter({
  value,
  className = '',
  useAnimation = false
}: JackpotCounterProps) {
  const { animatedAmount, currentJackpot } = useJackpotAnimation()

  // Use animated amount when useAnimation is true and no value is provided
  const displayValue = useAnimation && value === undefined
    ? animatedAmount
    : (value !== undefined ? value : (currentJackpot?.current_amount || 0))

  const [currentValue, setCurrentValue] = useState(displayValue)
  const [nextValue, setNextValue] = useState(displayValue)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (displayValue !== currentValue) {
      setNextValue(displayValue)

      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }

      // Update current value AFTER animation completes
      // Match child animation duration exactly (860ms)
      updateTimerRef.current = setTimeout(() => {
        setCurrentValue(displayValue)
      }, 860)
    }

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

  // Dynamic digit height based on className (font size)
  const getDigitHeight = () => {
    if (className.includes('text-4xl')) return 48
    if (className.includes('text-3xl')) return 40
    if (className.includes('text-2xl')) return 32
    if (className.includes('text-xl')) return 28
    return 48 // default
  }

  const digitHeight = getDigitHeight()

  return (
    <div className={`jackpot-counter ${className}`}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        whiteSpace: 'nowrap'
      }}>
        {currentPadded.split('').map((char, i) => (
          <AnimatingDigit
            key={i}
            current={char}
            next={nextPadded[i] || char}
            digitHeight={digitHeight}
          />
        ))}
      </div>

      <style jsx>{`
        .jackpot-counter {
          /* No glow effect */
        }
      `}</style>
    </div>
  )
}
