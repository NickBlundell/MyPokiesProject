'use client'

import { useState, useEffect } from 'react'
import { CacheStore } from '@/lib/hooks/cache-store'
import { Button } from '@mypokies/ui'
import { RefreshCw, Trash2, HardDrive, Database, Globe } from 'lucide-react'
import { logInfo } from '@/lib/utils/client-logger'

export function CacheManager() {
  const [stats, setStats] = useState({
    memorySize: 0,
    sessionSize: 0,
    localSize: 0
  })
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<string>('checking')

  useEffect(() => {
    // Update cache stats
    const updateStats = () => {
      setStats(CacheStore.getStats())
    }

    updateStats()
    const interval = setInterval(updateStats, 5000)

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerStatus('active')
      }).catch(() => {
        setServiceWorkerStatus('inactive')
      })
    } else {
      setServiceWorkerStatus('unsupported')
    }

    return () => clearInterval(interval)
  }, [])

  const clearCache = (type: 'memory' | 'session' | 'local' | 'all') => {
    CacheStore.clear(type)
    setStats(CacheStore.getStats())
  }

  const clearServiceWorkerCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      logInfo('Service worker caches cleared', { context: 'CacheManager' })
    }
  }

  const updateServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.update()
      logInfo('Service worker update triggered', { context: 'CacheManager' })
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="text-sm font-semibold mb-3">Cache Manager</h3>

      {/* Service Worker Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Service Worker</span>
          <span className={`text-xs font-medium ${
            serviceWorkerStatus === 'active' ? 'text-green-500' :
            serviceWorkerStatus === 'inactive' ? 'text-yellow-500' :
            'text-red-500'
          }`}>
            {serviceWorkerStatus}
          </span>
        </div>
        {serviceWorkerStatus === 'active' && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={updateServiceWorker}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Update SW
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearServiceWorkerCache}
              className="text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear SW Cache
            </Button>
          </div>
        )}
      </div>

      {/* Cache Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs">Memory Cache</span>
          </div>
          <span className="text-xs font-medium">{stats.memorySize} items</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs">Session Storage</span>
          </div>
          <span className="text-xs font-medium">
            {(stats.sessionSize / 1024).toFixed(1)} KB
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs">Local Storage</span>
          </div>
          <span className="text-xs font-medium">
            {(stats.localSize / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>

      {/* Clear Actions */}
      <div className="grid grid-cols-2 gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => clearCache('memory')}
          className="text-xs"
        >
          Clear Memory
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => clearCache('session')}
          className="text-xs"
        >
          Clear Session
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => clearCache('local')}
          className="text-xs"
        >
          Clear Local
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => clearCache('all')}
          className="text-xs"
        >
          Clear All
        </Button>
      </div>

      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-muted-foreground">
          Caching helps reduce load times and works offline
        </p>
      </div>
    </div>
  )
}