/**
 * @mypokies/supabase-client
 *
 * Unified Supabase client package for MyPokies monorepo
 *
 * Provides browser and server clients with:
 * - Singleton pattern for browser clients (performance optimization)
 * - Configurable timeout and real-time settings
 * - Secure cookie handling for server clients
 * - Service role client for admin operations
 */

// Browser client
export {
  createClient as createBrowserClient,
  resetBrowserClient,
  type BrowserClientConfig,
} from './browser'

// Server clients
export {
  createServerClient,
  createServiceRoleClient,
  type ServerClientConfig,
  type ServiceClientConfig,
} from './server'

// Re-export commonly used types from Supabase
export type { SupabaseClient, User, Session } from '@supabase/supabase-js'
