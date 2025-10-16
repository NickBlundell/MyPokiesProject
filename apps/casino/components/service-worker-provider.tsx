'use client'

import { useEffect } from 'react'
import { logInfo, logError } from '@/lib/utils/client-logger'

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Only register in production or when explicitly enabled
      const shouldRegister =
        process.env.NODE_ENV === 'production' ||
        process.env.NEXT_PUBLIC_ENABLE_SW === 'true'

      if (shouldRegister) {
        let updateInterval: NodeJS.Timeout | null = null

        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              logInfo('[SW] Registration successful', {
                context: 'ServiceWorkerProvider',
                data: { scope: registration.scope }
              })

              // Check for updates every hour
              updateInterval = setInterval(() => {
                registration.update()
              }, 60 * 60 * 1000)

              // Handle updates
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing
                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      // New service worker available
                      logInfo('[SW] New version available', { context: 'ServiceWorkerProvider' })

                      // You could show a notification to the user here
                      if (window.confirm('New version available! Reload to update?')) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' })
                        window.location.reload()
                      }
                    }
                  })
                }
              })
            })
            .catch((error) => {
              logError('[SW] Registration failed', {
                context: 'ServiceWorkerProvider',
                data: error
              })
            })
        })

        // Handle controller change (when SW takes control)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          logInfo('[SW] Controller changed, reloading...', { context: 'ServiceWorkerProvider' })
          window.location.reload()
        })

        // Enable navigation preload if supported
        if ('navigationPreload' in navigator.serviceWorker) {
          navigator.serviceWorker.ready.then((registration) => {
            if (registration.navigationPreload) {
              registration.navigationPreload.enable()
            }
          })
        }

        // Cleanup function to prevent memory leak
        return () => {
          if (updateInterval) {
            clearInterval(updateInterval)
          }
        }
      } else {
        logInfo('[SW] Service Worker registration skipped (development mode)', {
          context: 'ServiceWorkerProvider'
        })
      }
    }
  }, [])

  return null
}