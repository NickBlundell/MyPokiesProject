'use client'

import Image from 'next/image'
import { useState } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
  fill?: boolean
  sizes?: string
  quality?: number
}

// Pre-generate blur placeholders for common images
const blurDataURLs: Record<string, string> = {
  '/logo.webp': 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAACQAgCdASoQAAsAPsVUoEwnpCMhMAgBABIJZAADcAD++gAAAAAAAAAAAAAAAAAAAA==',
  '/22.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAP0lEQVR4nGNgYGBg+M/AwMDAxMDAwMDAwMDAwMjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwAAAJBABgVnSHQAAAABJRU5ErkJggg==',
  // Add more as needed
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  fill = false,
  sizes,
  quality = 75,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  // Get blur placeholder if available
  const blurDataURL = blurDataURLs[src]

  // Default sizes for responsive images
  const defaultSizes = sizes || '(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw'

  if (error) {
    // Fallback UI when image fails to load
    return (
      <div className={`bg-[#1a2024] flex items-center justify-center ${className}`} style={!fill ? { width, height } : {}}>
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-400 text-xl">?</span>
          </div>
          <p className="text-xs text-gray-400">Image unavailable</p>
        </div>
      </div>
    )
  }

  if (fill) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={defaultSizes}
          quality={quality}
          priority={priority}
          className={`object-cover duration-700 ease-in-out ${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL}
        />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 400}
      height={height || 400}
      sizes={defaultSizes}
      quality={quality}
      priority={priority}
      className={`duration-700 ease-in-out ${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'} ${className}`}
      onLoad={() => setIsLoading(false)}
      onError={() => setError(true)}
      placeholder={blurDataURL ? 'blur' : 'empty'}
      blurDataURL={blurDataURL}
    />
  )
}