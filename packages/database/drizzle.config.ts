import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '6543'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres.hupruyttzgeytlysobar',
    password: process.env.DB_PASSWORD || 'Msnrocks4u@',
  },
} satisfies Config