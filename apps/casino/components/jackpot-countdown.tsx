'use client'

import { useEffect, useState } from 'react'

export function JackpotCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()

      // Find next Wednesday at 9:00 PM
      const nextDraw = new Date()
      nextDraw.setHours(21, 0, 0, 0) // 9:00 PM

      // Get days until next Wednesday (3 = Wednesday)
      const daysUntilWednesday = (3 - now.getDay() + 7) % 7

      if (daysUntilWednesday === 0 && now.getHours() >= 21) {
        // If it's Wednesday after 9 PM, go to next Wednesday
        nextDraw.setDate(now.getDate() + 7)
      } else if (daysUntilWednesday === 0) {
        // It's Wednesday before 9 PM
        nextDraw.setDate(now.getDate())
      } else {
        // Not Wednesday yet
        nextDraw.setDate(now.getDate() + daysUntilWednesday)
      }

      const diff = nextDraw.getTime() - now.getTime()

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      return { days, hours, minutes, seconds }
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatNumber = (num: number) => String(num).padStart(2, '0')

  return (
    <div className="flex items-center gap-1 font-mono text-red-500 font-bold text-sm tracking-wider" style={{
      textShadow: '0 0 5px rgba(239, 68, 68, 0.8), 0 0 10px rgba(239, 68, 68, 0.5)',
      fontFamily: 'Courier New, monospace'
    }}>
      <span>{formatNumber(timeLeft.days)}</span>
      <span className="text-red-500/50">:</span>
      <span>{formatNumber(timeLeft.hours)}</span>
      <span className="text-red-500/50">:</span>
      <span>{formatNumber(timeLeft.minutes)}</span>
      <span className="text-red-500/50">:</span>
      <span>{formatNumber(timeLeft.seconds)}</span>
    </div>
  )
}
