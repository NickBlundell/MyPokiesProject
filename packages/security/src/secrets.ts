/**
 * Secrets Management Module
 * Provides secure storage and retrieval of secrets with caching
 */

interface Secret {
  value: string
  expires?: number
}

class SecretsManager {
  private cache: Map<string, Secret> = new Map()
  private readonly cacheTTL = 3600000 // 1 hour in milliseconds

  /**
   * Get a secret value
   */
  async getSecret(key: string): Promise<string | undefined> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached) {
      if (!cached.expires || cached.expires > Date.now()) {
        return cached.value
      }
      // Remove expired cache entry
      this.cache.delete(key)
    }

    // Try to get from environment variables
    const envValue = process.env[key]
    if (envValue) {
      // Cache the value
      this.cache.set(key, {
        value: envValue,
        expires: Date.now() + this.cacheTTL,
      })
      return envValue
    }

    // In production, you could fetch from external secret manager
    // like AWS Secrets Manager, HashiCorp Vault, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: const secret = await this.fetchFromVault(key)
      // return secret
    }

    return undefined
  }

  /**
   * Set a secret value (mainly for testing)
   */
  setSecret(key: string, value: string, ttl?: number): void {
    this.cache.set(key, {
      value,
      expires: ttl ? Date.now() + ttl : undefined,
    })
  }

  /**
   * Clear cached secrets
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get multiple secrets at once
   */
  async getSecrets(keys: string[]): Promise<Record<string, string | undefined>> {
    const secrets: Record<string, string | undefined> = {}

    await Promise.all(
      keys.map(async (key) => {
        secrets[key] = await this.getSecret(key)
      })
    )

    return secrets
  }

  /**
   * Validate that required secrets are present
   */
  async validateRequiredSecrets(requiredKeys: string[]): Promise<{
    valid: boolean
    missing: string[]
  }> {
    const missing: string[] = []

    for (const key of requiredKeys) {
      const value = await this.getSecret(key)
      if (!value) {
        missing.push(key)
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    }
  }
}

// Export singleton instance
export const secretsManager = new SecretsManager()

/**
 * Environment-specific configuration
 */
export const getConfig = async () => {
  const env = process.env.NODE_ENV || 'development'

  const config = {
    // Database
    database: {
      url: await secretsManager.getSecret('DATABASE_URL'),
      host: await secretsManager.getSecret('DB_HOST'),
      port: await secretsManager.getSecret('DB_PORT'),
      name: await secretsManager.getSecret('DB_NAME'),
      user: await secretsManager.getSecret('DB_USER'),
      password: await secretsManager.getSecret('DB_PASSWORD'),
    },

    // Supabase
    supabase: {
      url: await secretsManager.getSecret('NEXT_PUBLIC_SUPABASE_URL'),
      anonKey: await secretsManager.getSecret('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      serviceRoleKey: await secretsManager.getSecret('SUPABASE_SERVICE_ROLE_KEY'),
    },

    // Redis/Upstash
    redis: {
      url: await secretsManager.getSecret('UPSTASH_REDIS_REST_URL'),
      token: await secretsManager.getSecret('UPSTASH_REDIS_REST_TOKEN'),
    },

    // External APIs
    fundist: {
      systemId: await secretsManager.getSecret('FUNDIST_SYSTEM_ID'),
      secretKey: await secretsManager.getSecret('FUNDIST_SECRET_KEY'),
      apiUrl: await secretsManager.getSecret('FUNDIST_API_URL'),
    },

    twilio: {
      accountSid: await secretsManager.getSecret('TWILIO_ACCOUNT_SID'),
      authToken: await secretsManager.getSecret('TWILIO_AUTH_TOKEN'),
      phoneNumber: await secretsManager.getSecret('TWILIO_PHONE_NUMBER'),
    },

    anthropic: {
      apiKey: await secretsManager.getSecret('ANTHROPIC_API_KEY'),
    },

    // Security
    security: {
      jwtSecret: await secretsManager.getSecret('JWT_SECRET'),
      encryptionKey: await secretsManager.getSecret('ENCRYPTION_KEY'),
      adminIpWhitelist: await secretsManager.getSecret('ADMIN_IP_WHITELIST'),
    },

    // Environment
    env,
    isDevelopment: env === 'development',
    isProduction: env === 'production',
  }

  return config
}

/**
 * Required secrets for different environments
 */
export const REQUIRED_SECRETS = {
  common: [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ],
  production: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
  ],
  casino: [
    'FUNDIST_SYSTEM_ID',
    'FUNDIST_SECRET_KEY',
    'FUNDIST_API_URL',
  ],
  admin: [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'ANTHROPIC_API_KEY',
    'ADMIN_IP_WHITELIST',
  ],
}

/**
 * Validate environment configuration on startup
 */
export async function validateEnvironment(
  app: 'casino' | 'admin'
): Promise<void> {
  const requiredKeys = [
    ...REQUIRED_SECRETS.common,
    ...(process.env.NODE_ENV === 'production' ? REQUIRED_SECRETS.production : []),
    ...REQUIRED_SECRETS[app],
  ]

  const { valid, missing } = await secretsManager.validateRequiredSecrets(
    requiredKeys
  )

  if (!valid) {
    console.error('Missing required environment variables:', missing)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      )
    }
  }
}