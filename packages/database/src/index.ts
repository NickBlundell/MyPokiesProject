// Export database client
export { db, schema } from './client'
export type { Database, Schema } from './client'

// Export all schema tables
export * from './schema'

// Export Drizzle utilities
export { eq, and, or, not, isNull, isNotNull, inArray, notInArray, between, like, ilike, sql } from 'drizzle-orm'
export { desc, asc } from 'drizzle-orm'