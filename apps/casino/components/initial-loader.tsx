'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export function InitialLoader() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Hide loader after 2 seconds
    const timer = setTimeout(() => {
      setShow(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (!show) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0a0f14] flex items-center justify-center transition-opacity duration-500 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        {/* Logo */}
        <div className="relative w-64 h-24 mb-4">
          <Image
            src="/logo.webp"
            alt="MyPokies"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="w-16 h-16 border-4 border-[#1a2439] rounded-full"></div>
          <div
            className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-yellow-400 border-r-yellow-400 border-b-yellow-400 rounded-full"
            style={{
              animation: 'spin 1s linear infinite'
            }}
          ></div>
        </div>
        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        {/* Loading text */}
        <p className="text-gray-400 text-sm animate-pulse">Loading MyPokies...</p>
      </div>
    </div>
  )
}
