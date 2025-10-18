/**
 * @jest-environment node
 */

import { createServerClient, createServiceRoleClient } from '../src/server'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.NODE_ENV = 'test'

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  })),
}))

// Mock @supabase/supabase-js for service role client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  })),
}))

describe('@mypokies/supabase-client - Server Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createServerClient', () => {
    const mockCookies = {
      getAll: jest.fn(() => []),
      get: jest.fn(),
      set: jest.fn(),
    }

    it('should create a server client with minimal config', () => {
      const client = createServerClient({
        clientInfo: 'test-server',
        cookies: mockCookies,
      })

      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })

    it('should create a server client with full config', () => {
      const client = createServerClient({
        clientInfo: 'test-server',
        cookies: mockCookies,
        timeout: 5000,
        schema: 'custom_schema',
      })

      expect(client).toBeDefined()
    })

    it('should throw error when environment variables are missing', () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => {
        createServerClient({
          clientInfo: 'test-server',
          cookies: mockCookies,
        })
      }).toThrow('Missing required environment variables')

      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    })

    it('should handle cookie setting errors gracefully', () => {
      const failingCookies = {
        getAll: jest.fn(() => []),
        get: jest.fn(),
        set: jest.fn(() => {
          throw new Error('Cookie error')
        }),
      }

      // Should not throw
      expect(() => {
        createServerClient({
          clientInfo: 'test-server',
          cookies: failingCookies,
        })
      }).not.toThrow()
    })
  })

  describe('createServiceRoleClient', () => {
    it('should create a service role client with minimal config', async () => {
      const client = await createServiceRoleClient({
        clientInfo: 'test-service',
      })

      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
    })

    it('should create a service role client with full config', async () => {
      const client = await createServiceRoleClient({
        clientInfo: 'test-service',
        timeout: 5000,
        schema: 'custom_schema',
      })

      expect(client).toBeDefined()
    })

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      await expect(
        createServiceRoleClient({
          clientInfo: 'test-service',
        })
      ).rejects.toThrow('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')

      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
    })

    it('should throw error when called in browser context', async () => {
      // Simulate browser environment
      // @ts-ignore
      globalThis.window = {}

      await expect(
        createServiceRoleClient({
          clientInfo: 'test-service',
        })
      ).rejects.toThrow('SECURITY VIOLATION')

      // Clean up
      // @ts-ignore
      delete globalThis.window
    })
  })
})
