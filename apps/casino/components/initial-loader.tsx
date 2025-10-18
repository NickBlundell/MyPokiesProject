'use client'

import { useEffect, useState, useRef } from 'react'

export function InitialLoader() {
  const [show, setShow] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Show loader for 2.5 seconds
    const timer = setTimeout(() => {
      setFadeOut(true)
      // Wait for fade out animation to complete
      setTimeout(() => {
        setShow(false)
      }, 500)
    }, 2500)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  if (!show) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="max-w-sm w-full px-4"
        style={{ maxHeight: '30vh' }}
      >
        <source src="/loading-video.mp4" type="video/mp4" />
      </video>
    </div>
  )
}
