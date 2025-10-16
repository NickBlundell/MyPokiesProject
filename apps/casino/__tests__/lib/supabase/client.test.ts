import { createClient } from '@supabase/supabase-js'

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Supabase Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create Supabase client with correct config', () => {
    const mockClient = {
      from: jest.fn(),
      auth: {
        getSession: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      },
    }

    mockCreateClient.mockReturnValue(mockClient as any)

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
    expect(client).toBeDefined()
  })

  describe('Database Queries', () => {
    let mockClient: any

    beforeEach(() => {
      mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      }
      mockCreateClient.mockReturnValue(mockClient)
    })

    it('should fetch user data successfully', async () => {
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        phone_number: '+1234567890',
      }

      mockClient.single.mockResolvedValue({
        data: mockUserData,
        error: null,
      })

      const client = createClient('url', 'key')
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', 'user-123')
        .single()

      expect(data).toEqual(mockUserData)
      expect(error).toBeNull()
      expect(mockClient.from).toHaveBeenCalledWith('users')
      expect(mockClient.select).toHaveBeenCalledWith('*')
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'user-123')
    })

    it('should handle database errors', async () => {
      const mockError = {
        message: 'Database error',
        code: '500',
      }

      mockClient.single.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const client = createClient('url', 'key')
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', 'invalid-id')
        .single()

      expect(data).toBeNull()
      expect(error).toEqual(mockError)
    })

    it('should insert bonus data correctly', async () => {
      const mockBonusData = {
        user_id: 'user-123',
        bonus_offer_id: 'bonus-456',
        bonus_amount: '100',
        status: 'active',
      }

      mockClient.single.mockResolvedValue({
        data: { id: 'player-bonus-789', ...mockBonusData },
        error: null,
      })

      const client = createClient('url', 'key')
      const { data, error } = await client
        .from('player_bonuses')
        .insert(mockBonusData)
        .single()

      expect(error).toBeNull()
      expect(data).toMatchObject(mockBonusData)
      expect(mockClient.from).toHaveBeenCalledWith('player_bonuses')
      expect(mockClient.insert).toHaveBeenCalledWith(mockBonusData)
    })

    it('should update user balance', async () => {
      const updateData = { balance: 150.50 }

      mockClient.single.mockResolvedValue({
        data: { user_id: 'user-123', currency: 'USD', ...updateData },
        error: null,
      })

      const client = createClient('url', 'key')
      const { data, error } = await client
        .from('user_balances')
        .update(updateData)
        .eq('user_id', 'user-123')
        .single()

      expect(error).toBeNull()
      expect((data as any)?.balance).toBe(150.50)
      expect(mockClient.update).toHaveBeenCalledWith(updateData)
      expect(mockClient.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })
  })

  describe('Authentication', () => {
    let mockClient: any

    beforeEach(() => {
      mockClient = {
        auth: {
          getSession: jest.fn(),
          signInWithPassword: jest.fn(),
          signOut: jest.fn(),
          signInWithOtp: jest.fn(),
        },
      }
      mockCreateClient.mockReturnValue(mockClient)
    })

    it('should get current session', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: 'user-123', email: 'test@example.com' },
      }

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const client = createClient('url', 'key')
      const { data, error } = await client.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toEqual(mockSession)
    })

    it('should sign in with password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      }

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: credentials.email },
          session: { access_token: 'token-123' },
        },
        error: null,
      })

      const client = createClient('url', 'key')
      const { data, error } = await client.auth.signInWithPassword(credentials)

      expect(error).toBeNull()
      expect(data.user?.email).toBe(credentials.email)
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith(credentials)
    })

    it('should handle authentication errors', async () => {
      const mockError = {
        message: 'Invalid credentials',
        status: 401,
      }

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      })

      const client = createClient('url', 'key')
      const { data, error } = await client.auth.signInWithPassword({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      })

      expect(error).toEqual(mockError)
      expect(data.user).toBeNull()
    })

    it('should sign out successfully', async () => {
      mockClient.auth.signOut.mockResolvedValue({ error: null })

      const client = createClient('url', 'key')
      const { error } = await client.auth.signOut()

      expect(error).toBeNull()
      expect(mockClient.auth.signOut).toHaveBeenCalled()
    })
  })
})
