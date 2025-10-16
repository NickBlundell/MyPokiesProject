/**
 * Performance monitoring utilities for Core Web Vitals
 */

import { logger } from '@mypokies/monitoring'

// Web Vitals types
interface Metric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

/**
 * Report web vitals to analytics
 */
export function reportWebVitals(metric: Metric) {
  // Log to console in development (client-side only)
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    logger.debug(`Web Vitals - ${metric.name}`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      metricId: metric.id,
    })
  }

  // Send to analytics in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Send to analytics service (e.g., Google Analytics, Vercel Analytics)
    if (window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_rating: metric.rating,
      })
    }

    // Send to Vercel Analytics if available
    if (window.va) {
      window.va('event', {
        name: metric.name,
        data: {
          value: metric.value,
          rating: metric.rating,
        },
      })
    }
  }
}

/**
 * Measure and log component render time
 */
export function measureComponentRender(componentName: string, callback: () => void) {
  if (typeof window === 'undefined') return callback()

  const startTime = performance.now()
  callback()
  const endTime = performance.now()
  const renderTime = endTime - startTime

  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Component render time - ${componentName}`, {
      renderTime: `${renderTime.toFixed(2)}ms`,
      renderTimeMs: renderTime,
    })
  }

  return renderTime
}

/**
 * Measure API call performance
 */
export async function measureApiCall<T>(
  endpoint: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()

  try {
    const result = await fetchFn()
    const endTime = performance.now()
    const duration = endTime - startTime

    if (process.env.NODE_ENV === 'development') {
      logger.debug(`API call performance - ${endpoint}`, {
        duration: `${duration.toFixed(2)}ms`,
        durationMs: duration,
      })
    }

    // Log slow API calls
    if (duration > 1000) {
      logger.warn(`Slow API call detected: ${endpoint}`, {
        duration: `${duration.toFixed(2)}ms`,
        durationMs: duration,
        endpoint,
      })
    }

    return result
  } catch (err) {
    const endTime = performance.now()
    const duration = endTime - startTime
    logger.error(`API call failed: ${endpoint}`, err, {
      duration: `${duration.toFixed(2)}ms`,
      durationMs: duration,
      endpoint,
    })
    throw err
  }
}

/**
 * Create a performance observer for long tasks
 */
export function observeLongTasks() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          logger.warn('Long task detected', {
            duration: entry.duration,
            startTime: entry.startTime,
            entryType: entry.entryType,
          })
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })
  } catch {
    // Long task API not supported
  }
}

/**
 * Prefetch critical resources
 */
export function prefetchResources(urls: string[]) {
  if (typeof window === 'undefined') return

  urls.forEach((url) => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  })
}

/**
 * Lazy load images with Intersection Observer
 */
export function setupLazyLoading(images: HTMLImageElement[]) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        if (img.dataset.src) {
          img.src = img.dataset.src
          img.removeAttribute('data-src')
          observer.unobserve(img)
        }
      }
    })
  })

  images.forEach((img) => imageObserver.observe(img))
}

/**
 * Monitor memory usage
 */
export function monitorMemoryUsage() {
  if (typeof window === 'undefined' || !('memory' in performance)) return

  const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  logger.info('Memory usage', {
    used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
    total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
    limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
    usedBytes: memory.usedJSHeapSize,
    totalBytes: memory.totalJSHeapSize,
    limitBytes: memory.jsHeapSizeLimit,
  })
}

// Global type declarations for analytics integrations
declare global {
  interface Window {
    // Google Analytics gtag function - uses dynamic arguments per Google's API spec
    gtag?: (command: string, ...args: unknown[]) => void
    // Vercel Analytics function - accepts any event data per Vercel's API spec
    va?: (command: string, data: Record<string, unknown>) => void
  }
}
