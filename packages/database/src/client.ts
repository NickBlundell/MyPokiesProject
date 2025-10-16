import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Get database URL from environment
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL
  if (!url) {
    // Fallback to constructing URL from individual env vars
    const host = process.env.DB_HOST || 'aws-1-ap-southeast-2.pooler.supabase.com'
    const port = process.env.DB_PORT || '6543'
    const database = process.env.DB_NAME || 'postgres'
    const username = process.env.DB_USER || 'postgres.hupruyttzgeytlysobar'
    const password = process.env.DB_PASSWORD || 'Msnrocks4u@'

    return `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`
  }
  return url
}

// Create postgres connection
const connectionString = getDatabaseUrl()
const sql = postgres(connectionString, {
  max: 10, // Max connections in pool
  idle_timeout: 20,
  connect_timeout: 10,
})

// Create drizzle instance
export const db = drizzle(sql, { schema })

// Export schema for use in queries
export { schema }

// Export types
export type Database = typeof db
export type Schema = typeof schema