# @mypokies/cache

Redis-based caching layer with advanced caching strategies including cache-aside, batch caching, singleflight, and cache warming. Built on Upstash Redis for serverless environments.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/cache": "workspace:*"
  }
}
```

## Usage

### Basic Cache Operations

```typescript
import { cacheManager, CACHE_TTL } from '@mypokies/cache'

// Set a value with default TTL
await cacheManager.set('user:123', userData, CACHE_TTL.SHORT)

// Get a value
const user = await cacheManager.get('user:123')

// Delete a value
await cacheManager.delete('user:123')
```

### Cache Decorator Pattern

```typescript
import { Cacheable, CacheInvalidate, CacheConfig } from '@mypokies/cache'

@CacheConfig({ ttl: 300, prefix: 'user' })
class UserService {
  @Cacheable({ key: (id) => `user:${id}` })
  async getUser(id: string) {
    // This result will be cached
    return await db.users.findById(id)
  }

  @CacheInvalidate({ keys: [(id) => `user:${id}`] })
  async updateUser(id: string, data: any) {
    // This will invalidate the cache
    return await db.users.update(id, data)
  }
}
```

### Cache-Aside Pattern

```typescript
import { cacheAside } from '@mypokies/cache'

const user = await cacheAside({
  key: 'user:123',
  ttl: 300,
  fetchFn: async () => {
    return await db.users.findById('123')
  }
})
```

### Batch Caching

```typescript
import { batchCache } from '@mypokies/cache'

const users = await batchCache({
  keys: ['user:1', 'user:2', 'user:3'],
  ttl: 300,
  fetchFn: async (ids) => {
    return await db.users.findByIds(ids)
  }
})
```

### Singleflight

Prevents thundering herd by deduplicating concurrent requests:

```typescript
import { singleflight } from '@mypokies/cache'

const result = await singleflight('expensive-operation', async () => {
  // Multiple concurrent calls will only execute this once
  return await expensiveOperation()
})
```

### Cache Warming

Preload cache with data:

```typescript
import { warmCache } from '@mypokies/cache'

await warmCache({
  'user:popular:1': popularUserData,
  'game:trending:slots': trendingSlots
}, 600)
```

## API Documentation

### Cache Manager

- `cacheManager.get<T>(key: string): Promise<T | null>` - Retrieve cached value
- `cacheManager.set(key: string, value: any, ttl?: number): Promise<void>` - Store value in cache
- `cacheManager.delete(key: string): Promise<void>` - Remove value from cache
- `cacheManager.deletePattern(pattern: string): Promise<void>` - Remove all keys matching pattern
- `cacheManager.exists(key: string): Promise<boolean>` - Check if key exists

### Cache TTL Constants

```typescript
CACHE_TTL = {
  SHORT: 60,      // 1 minute
  MEDIUM: 300,    // 5 minutes
  LONG: 1800,     // 30 minutes
  HOUR: 3600,     // 1 hour
  DAY: 86400      // 24 hours
}
```

### Decorators

- `@Cacheable(options: CacheOptions)` - Cache method results
- `@CacheInvalidate(options: { keys: Function[] })` - Invalidate cache on method execution
- `@CacheConfig(config: { ttl?: number, prefix?: string })` - Configure class-level cache settings

### Utilities

- `cacheAside(options: CacheOptions)` - Implement cache-aside pattern
- `batchCache(options: BatchCacheOptions)` - Batch cache operations
- `singleflight(key: string, fn: Function)` - Deduplicate concurrent requests
- `warmCache(data: Record<string, any>, ttl: number)` - Preload cache

## Configuration

Set the following environment variables:

```bash
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
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

## Architecture

This package provides:
- Redis-based caching with Upstash
- Multiple caching strategies
- TypeScript decorators for declarative caching
- TTL management
- Cache invalidation utilities
- Batch operations support
- Singleflight protection

## Dependencies

- `@upstash/redis` - Serverless Redis client
- `@mypokies/types` - Shared TypeScript types
