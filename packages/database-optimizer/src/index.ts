/**
 * Database optimization utilities
 */

// Export index management
export {
  CRITICAL_INDEXES,
  PERFORMANCE_INDEXES,
  createIndex,
  dropIndex,
  indexExists,
  getIndexStats,
  applyCriticalIndexes,
  applyPerformanceIndexes,
  type IndexDefinition,
} from './indexes'

// Export query optimizer
export {
  QueryOptimizer,
  queryOptimizer,
  OPTIMIZED_PATTERNS,
  type QueryMetrics,
  type OptimizationHint,
} from './query-optimizer'

// Export connection pooling
export {
  ConnectionPoolManager,
  QueryBatcher,
  PreparedStatementCache,
  createOptimizedPool,
  type PoolOptions,
} from './connection-pool'

// Export migration scripts
export { databaseMigrations } from './migrations'