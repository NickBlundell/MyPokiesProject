'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

export function BonusCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)

      const difference = endOfDay.getTime() - now.getTime()

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ hours, minutes, seconds })
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
      }
    }

    // Calculate immediately
    calculateTimeLeft()

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatNumber = (num: number) => String(num).padStart(2, '0')

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-green-400" style={{
        filter: 'drop-shadow(0 0 3px rgba(74, 222, 128, 0.8))'
      }} />
      <div className="flex items-center gap-1 font-mono text-green-400 font-bold text-sm tracking-wider" style={{
        textShadow: '0 0 5px rgba(74, 222, 128, 0.8), 0 0 10px rgba(74, 222, 128, 0.5)',
        fontFamily: 'Courier New, monospace'
      }}>
        <span>{formatNumber(timeLeft.hours)}</span>
        <span className="text-green-400/50">:</span>
        <span>{formatNumber(timeLeft.minutes)}</span>
        <span className="text-green-400/50">:</span>
        <span>{formatNumber(timeLeft.seconds)}</span>
      </div>
    </div>
  )
}
