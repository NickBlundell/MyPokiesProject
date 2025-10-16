# @mypokies/database

Database layer for MyPokies platform using Drizzle ORM with Supabase/PostgreSQL. Provides type-safe database access and schema definitions.

## Installation

This package is part of the MyPokies monorepo. Add it to your app's dependencies:

```json
{
  "dependencies": {
    "@mypokies/database": "workspace:*"
  }
}
```

## Usage

### Basic Database Access

```typescript
import { db, schema, eq } from '@mypokies/database'

// Query users
const users = await db.select().from(schema.users)

// Find user by ID
const user = await db
  .select()
  .from(schema.users)
  .where(eq(schema.users.id, 'user-123'))

// Insert a new user
await db.insert(schema.users).values({
  externalUserId: 'ext-123',
  email: 'user@example.com',
  accountStatus: 'active'
})

// Update user
await db
  .update(schema.users)
  .set({ accountStatus: 'suspended' })
  .where(eq(schema.users.id, 'user-123'))
```

### Working with Transactions

```typescript
import { db, schema } from '@mypokies/database'

await db.transaction(async (tx) => {
  // Deduct balance
  await tx
    .update(schema.userBalances)
    .set({ balance: sql`balance - ${amount}` })
    .where(eq(schema.userBalances.userId, userId))

  // Record transaction
  await tx.insert(schema.transactions).values({
    userId,
    type: 'debit',
    amount,
    currency: 'AUD'
  })
})
```

### Using Query Helpers

```typescript
import { db, eq, and, or, inArray, between, desc } from '@mypokies/database'

// Complex query with multiple conditions
const recentHighRollers = await db
  .select()
  .from(schema.transactions)
  .where(
    and(
      eq(schema.transactions.type, 'debit'),
      between(schema.transactions.amount, 100, 1000),
      inArray(schema.transactions.currency, ['AUD', 'USD'])
    )
  )
  .orderBy(desc(schema.transactions.createdAt))
  .limit(50)
```

### Schema Access

```typescript
import { schema } from '@mypokies/database'

// Access all table schemas
const { users, transactions, bonuses, games } = schema

// Use in queries
const userTransactions = await db
  .select()
  .from(schema.transactions)
  .where(eq(schema.transactions.userId, userId))
```

## API Documentation

### Database Client

- `db` - Drizzle ORM database instance
- `schema` - All table schemas

### Schema Tables

Available schema tables:
- `users` - User accounts
- `userBalances` - User balance tracking
- `transactions` - Financial transactions
- `gameRounds` - Game round tracking
- `roundActions` - Individual game actions
- `bonuses` - Bonus offers
- `playerBonuses` - Player bonus instances
- `loyaltyTiers` - VIP tier definitions
- `playerLoyalty` - Player loyalty status
- `loyaltyPointsTransactions` - Points history
- `jackpotPools` - Jackpot pool definitions
- `jackpotTickets` - Jackpot ticket allocations
- `jackpotWinners` - Jackpot draw results
- `games` - Game catalog
- `adminUsers` - Admin accounts
- `adminAuditLog` - Admin action audit trail
- `supportTickets` - Customer support tickets
- `marketingLeads` - CRM leads
- `smsMessages` - SMS communications

### Query Operators

Exported from Drizzle ORM:
- `eq(column, value)` - Equality
- `and(...conditions)` - Logical AND
- `or(...conditions)` - Logical OR
- `not(condition)` - Logical NOT
- `isNull(column)` - IS NULL check
- `isNotNull(column)` - IS NOT NULL check
- `inArray(column, values)` - IN array
- `notInArray(column, values)` - NOT IN array
- `between(column, min, max)` - BETWEEN range
- `like(column, pattern)` - LIKE pattern
- `ilike(column, pattern)` - Case-insensitive LIKE
- `desc(column)` - Descending order
- `asc(column)` - Ascending order
- `sql` - Raw SQL template tag

## Configuration

Set the following environment variables:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
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

### Database Migrations

Generate migrations from schema changes:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Open Drizzle Studio (database browser):

```bash
npm run db:studio
```

### Type checking

```bash
npm run type-check
```

## Migration Workflow

1. Modify schema definitions in `src/schema/`
2. Generate migration: `npm run db:generate`
3. Review generated SQL in `migrations/`
4. Apply migration: `npm run db:migrate`
5. Commit both schema and migration files

## Architecture

This package provides:
- Type-safe database access with Drizzle ORM
- Comprehensive schema definitions
- Migration management
- Query builders and helpers
- Transaction support
- Supabase integration

## Best Practices

1. Always use transactions for multi-step operations
2. Use prepared statements for repeated queries
3. Leverage TypeScript types from schema
4. Use query builders instead of raw SQL when possible
5. Keep migrations sequential and never modify existing ones
6. Use indexes for frequently queried columns

## Dependencies

- `drizzle-orm` - Type-safe ORM
- `@supabase/supabase-js` - Supabase client
- `postgres` - PostgreSQL driver
- `drizzle-kit` - Migration toolkit (dev)
