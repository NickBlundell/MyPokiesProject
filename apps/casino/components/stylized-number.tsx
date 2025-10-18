'use client'

import Image from 'next/image'

interface StylizedNumberProps {
  value: string | number
  className?: string
  digitHeight?: number
}

export function StylizedNumber({ value, className = '', digitHeight = 48 }: StylizedNumberProps) {
  // Convert value to string and split into characters
  const chars = value.toString().split('')

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ gap: '2px' }}>
      {chars.map((char, index) => {
        // Map characters to image filenames
        let imageName = ''
        if (char >= '0' && char <= '9') {
          imageName = `${char}.png`
        } else if (char === '$') {
          imageName = '$.png'
        } else if (char === ',') {
          imageName = 'comma.png'
        } else if (char === '.') {
          imageName = 'fullstop.png'
        } else {
          // Skip unsupported characters
          return null
        }

        return (
          <div
            key={`${char}-${index}`}
            className="relative"
            style={{ height: `${digitHeight}px`, width: 'auto' }}
          >
            <Image
              src={`/numbers/${imageName}`}
              alt={char}
              width={digitHeight}
              height={digitHeight}
              className="object-contain"
              style={{ height: `${digitHeight}px`, width: 'auto' }}
              priority
            />
          </div>
        )
      })}
    </div>
  )
}
