# @mypokies/edge-cache

Edge caching and CDN optimization for MyPokies platform. Provides intelligent caching at the edge (Vercel/Cloudflare) with SWR (stale-while-revalidate) support, cache control headers, and CDN integration.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/edge-cache": "workspace:*"
  }
}
```

## Usage

### Edge Cache

```typescript
import { EdgeCache, edgeCache } from '@mypokies/edge-cache'

// Create edge cache instance
const cache = new EdgeCache({
  ttl: 300,
  swr: 600,
  tags: ['user-data']
})

// Cache a value at the edge
await edgeCache.set('user:123', userData, {
  ttl: 300,
  swr: 600
})

// Get cached value
const user = await edgeCache.get('user:123')

// Purge cache
await edgeCache.purge(['user:123'])
```

### Cache Control Headers

```typescript
import { parseCacheControl, setCacheHeaders } from '@mypokies/edge-cache'

// Parse cache control header
const control = parseCacheControl('public, max-age=300, s-maxage=600')
console.log(control.maxAge) // 300
console.log(control.sMaxage) // 600

// Set cache headers on response
const response = new Response(data)
setCacheHeaders(response, {
  maxAge: 300,
  sMaxage: 600,
  public: true,
  staleWhileRevalidate: 900
})
```

### Next.js Middleware

```typescript
import { createEdgeCacheMiddleware } from '@mypokies/edge-cache'

// In middleware.ts
export const middleware = createEdgeCacheMiddleware({
  ttl: 300,
  swr: 600,
  paths: ['/api/games', '/api/user/*']
})
```

### API Response Caching

```typescript
import { cacheApiResponse } from '@mypokies/edge-cache'

// In API route
export async function GET(request: Request) {
  return cacheApiResponse(
    request,
    async () => {
      const data = await fetchData()
      return Response.json(data)
    },
    {
      ttl: 300,
      tags: ['games-list']
    }
  )
}
```

### Cache Invalidation

```typescript
import { invalidateCache } from '@mypokies/edge-cache'

// Invalidate specific cache tags
await invalidateCache({
  tags: ['user:123', 'user-list'],
  paths: ['/api/users/123']
})
```

### Stale-While-Revalidate (SWR)

```typescript
import { withSWR } from '@mypokies/edge-cache'

// Wrap data fetching with SWR
const data = await withSWR(
  'cache-key',
  async () => {
    return await fetchExpensiveData()
  },
  {
    ttl: 300,
    swr: 900 // Serve stale for 15 minutes while revalidating
  }
)
```

### Static Asset Caching

```typescript
import { cacheStaticAssets } from '@mypokies/edge-cache'

// In Next.js middleware
export const middleware = cacheStaticAssets({
  images: { maxAge: 86400 },
  scripts: { maxAge: 31536000, immutable: true },
  styles: { maxAge: 31536000, immutable: true }
})
```

### API Route Caching

```typescript
import { cacheApiRoutes } from '@mypokies/edge-cache'

// Configure caching for API routes
export const middleware = cacheApiRoutes({
  '/api/games': { ttl: 300, tags: ['games'] },
  '/api/bonuses': { ttl: 600, tags: ['bonuses'] },
  '/api/user/*': { ttl: 60, private: true }
})
```

### CDN Management

```typescript
import { CDNManager, CDN_CACHE_RULES } from '@mypokies/edge-cache'

const cdn = new CDNManager({
  provider: 'vercel',
  apiKey: process.env.CDN_API_KEY
})

// Purge CDN cache
await cdn.purge({
  tags: ['user:123'],
  urls: ['/api/users/123']
})

// Get CDN statistics
const stats = await cdn.getStats()

// Generate cache headers
const headers = generateCDNHeaders({
  maxAge: 300,
  sMaxage: 600,
  staleWhileRevalidate: 900
})
```

### Prefetch and Preload Hints

```typescript
import { generatePrefetchHints, generatePushHints } from '@mypokies/edge-cache'

// Generate prefetch headers
const prefetch = generatePrefetchHints([
  { url: '/api/games', as: 'fetch' },
  { url: '/images/logo.png', as: 'image' }
])

// Generate HTTP/2 push hints
const push = generatePushHints([
  '/styles/main.css',
  '/scripts/app.js'
])
```

## API Documentation

### EdgeCache

- `EdgeCache` - Edge cache class
- `edgeCache` - Singleton instance
- `set(key, value, options)` - Cache value at edge
- `get(key)` - Retrieve cached value
- `purge(keys)` - Invalidate cache keys

### Cache Headers

- `parseCacheControl(header: string)` - Parse Cache-Control header
- `setCacheHeaders(response, options)` - Set cache headers on response
- `CacheControl` - Cache control type definition

### Middleware

- `createEdgeCacheMiddleware(options)` - Create Next.js middleware
- `cacheApiResponse(request, handler, options)` - Cache API responses
- `invalidateCache(options)` - Invalidate cache by tags/paths
- `withSWR(key, fetcher, options)` - Stale-while-revalidate wrapper
- `cacheStaticAssets(config)` - Cache static assets
- `cacheApiRoutes(config)` - Configure API route caching

### CDN

- `CDNManager` - CDN management class
- `CDN_CACHE_RULES` - Default CDN cache rules
- `generateCDNHeaders(options)` - Generate CDN headers
- `generatePrefetchHints(resources)` - Generate prefetch hints
- `generatePushHints(paths)` - Generate HTTP/2 push hints

### Types

```typescript
interface EdgeCacheOptions {
  ttl: number
  swr?: number
  tags?: string[]
  private?: boolean
}

interface CacheControl {
  maxAge?: number
  sMaxage?: number
  staleWhileRevalidate?: number
  public?: boolean
  private?: boolean
  immutable?: boolean
}

interface CDNConfig {
  provider: 'vercel' | 'cloudflare'
  apiKey: string
}

interface PurgeOptions {
  tags?: string[]
  urls?: string[]
  purgeAll?: boolean
}
```

## Configuration

Set the following environment variables:

```bash
# Vercel
VERCEL_API_TOKEN=your-vercel-token
VERCEL_TEAM_ID=your-team-id

# Cloudflare
CLOUDFLARE_API_TOKEN=your-cloudflare-token
CLOUDFLARE_ZONE_ID=your-zone-id
```

## Development

### Build the package

```bash
npm run build
```

### Watch mode

```bash
npm run dev
```

### Type checking

```bash
npm run type-check
```

## Performance Benefits

This package provides:
- 90%+ reduction in response time with edge caching
- Reduced database load with intelligent caching
- Automatic cache revalidation with SWR
- Smart cache invalidation strategies
- CDN optimization for global distribution
- Efficient cache management across regions

## Caching Strategies

### Short TTL (60s)
- User-specific data
- Real-time balance updates
- Active game sessions

### Medium TTL (5-15min)
- Game catalog
- Bonus offers
- General content

### Long TTL (1hr+)
- Static assets
- Game thumbnails
- System configuration

## Best Practices

1. Use appropriate TTL based on data freshness requirements
2. Implement SWR for better UX
3. Tag caches for efficient invalidation
4. Set private cache for user-specific data
5. Use edge middleware for automatic caching
6. Monitor cache hit rates
7. Invalidate caches on data updates

## Dependencies

- `@mypokies/cache` - Core caching utilities
- `@vercel/edge` - Vercel Edge Runtime
- `@cloudflare/workers-types` - Cloudflare Workers types
- `next` - Next.js framework
