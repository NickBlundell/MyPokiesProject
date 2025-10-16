# @mypokies/database-optimizer

Database query optimization, indexing strategies, and connection pooling for high-performance database operations in MyPokies platform.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/database-optimizer": "workspace:*"
  }
}
```

## Usage

### Apply Critical Indexes

Automatically create critical indexes for optimal performance:

```typescript
import { applyCriticalIndexes, applyPerformanceIndexes } from '@mypokies/database-optimizer'

// Apply critical indexes (required for production)
await applyCriticalIndexes()

// Apply performance indexes (optional but recommended)
await applyPerformanceIndexes()
```

### Manual Index Management

```typescript
import { createIndex, dropIndex, indexExists, getIndexStats } from '@mypokies/database-optimizer'

// Check if index exists
const exists = await indexExists('idx_users_email')

// Create a new index
await createIndex({
  name: 'idx_custom_index',
  table: 'transactions',
  columns: ['user_id', 'created_at'],
  unique: false
})

// Get index statistics
const stats = await getIndexStats('idx_users_email')
console.log(`Index size: ${stats.size}, Scans: ${stats.scans}`)

// Drop an index
await dropIndex('idx_custom_index')
```

### Query Optimization

```typescript
import { QueryOptimizer, queryOptimizer } from '@mypokies/database-optimizer'

// Create optimizer instance
const optimizer = new QueryOptimizer()

// Optimize a query
const result = await optimizer.optimizeQuery(
  'SELECT * FROM users WHERE email = $1',
  ['user@example.com']
)

// Use singleton instance
const metrics = await queryOptimizer.analyze(
  'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
  ['user-123']
)

console.log(`Query time: ${metrics.executionTime}ms`)
console.log(`Rows returned: ${metrics.rowCount}`)
```

### Connection Pool Management

```typescript
import { ConnectionPoolManager, createOptimizedPool } from '@mypokies/database-optimizer'

// Create optimized connection pool
const pool = createOptimizedPool({
  min: 2,
  max: 10,
  idleTimeout: 30000,
  connectionTimeout: 3000
})

// Use connection pool manager
const poolManager = new ConnectionPoolManager({
  maxConnections: 20,
  minConnections: 5
})

const connection = await poolManager.acquire()
try {
  // Use connection
  const result = await connection.query('SELECT * FROM users')
} finally {
  poolManager.release(connection)
}
```

### Query Batching

```typescript
import { QueryBatcher } from '@mypokies/database-optimizer'

const batcher = new QueryBatcher()

// Batch multiple queries for execution
batcher.add('SELECT * FROM users WHERE id = $1', ['user-1'])
batcher.add('SELECT * FROM users WHERE id = $1', ['user-2'])
batcher.add('SELECT * FROM users WHERE id = $1', ['user-3'])

// Execute all batched queries efficiently
const results = await batcher.execute()
```

### Prepared Statement Cache

```typescript
import { PreparedStatementCache } from '@mypokies/database-optimizer'

const cache = new PreparedStatementCache()

// Prepare and cache statements
const statement = await cache.prepare(
  'get-user-by-id',
  'SELECT * FROM users WHERE id = $1'
)

// Execute prepared statement (uses cache)
const result = await cache.execute('get-user-by-id', ['user-123'])
```

### Database Migrations

```typescript
import { databaseMigrations } from '@mypokies/database-optimizer'

// Run optimization migrations
await databaseMigrations.createIndexes()
await databaseMigrations.optimizeSchema()
```

## API Documentation

### Index Management

- `CRITICAL_INDEXES` - Array of critical index definitions
- `PERFORMANCE_INDEXES` - Array of performance optimization indexes
- `createIndex(definition: IndexDefinition)` - Create a database index
- `dropIndex(name: string)` - Remove an index
- `indexExists(name: string)` - Check if index exists
- `getIndexStats(name: string)` - Get index usage statistics
- `applyCriticalIndexes()` - Apply all critical indexes
- `applyPerformanceIndexes()` - Apply performance indexes

### Query Optimizer

- `QueryOptimizer` - Class for query optimization and analysis
- `queryOptimizer` - Singleton instance
- `optimizeQuery(sql, params)` - Optimize and execute query
- `analyze(sql, params)` - Analyze query performance
- `OPTIMIZED_PATTERNS` - Common query optimization patterns

### Connection Pool

- `ConnectionPoolManager` - Advanced connection pool manager
- `createOptimizedPool(options: PoolOptions)` - Create optimized pool
- `QueryBatcher` - Batch query execution
- `PreparedStatementCache` - Cache prepared statements

### Types

```typescript
interface IndexDefinition {
  name: string
  table: string
  columns: string[]
  unique?: boolean
  where?: string
}

interface QueryMetrics {
  executionTime: number
  rowCount: number
  planningTime: number
  bufferHits: number
}

interface PoolOptions {
  min: number
  max: number
  idleTimeout?: number
  connectionTimeout?: number
}
```

## Configuration

Set the following environment variables:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_STATEMENT_TIMEOUT=30000
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
- 40-60% faster query execution with proper indexes
- Reduced connection overhead with pooling
- Query plan caching for repeated queries
- Batch query execution for multiple operations
- Automatic query optimization hints
- Index usage analytics and recommendations

## Critical Indexes

The package automatically creates indexes for:
- User lookups by email and external ID
- Transaction queries by user and date
- Game round tracking
- Bonus and loyalty point queries
- Jackpot ticket lookups
- Admin audit log searches

## Best Practices

1. Always apply critical indexes in production
2. Monitor index usage with `getIndexStats()`
3. Use connection pooling for high-traffic apps
4. Batch similar queries when possible
5. Cache prepared statements for repeated queries
6. Review query plans for slow queries
7. Set appropriate pool size based on load

## Dependencies

- `@mypokies/database` - Database access layer
- `drizzle-orm` - ORM integration
- `postgres` - PostgreSQL driver
- `pg` - PostgreSQL client
- `@supabase/supabase-js` - Supabase client
