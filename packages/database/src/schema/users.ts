import { pgTable, uuid, varchar, boolean, timestamp, pgEnum, decimal, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended', 'closed', 'self_excluded'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalUserId: varchar('external_user_id', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }),
  authUserId: uuid('auth_user_id'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  phoneVerified: boolean('phone_verified').default(false),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  accountStatus: accountStatusEnum('account_status').default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// User balances table
export const userBalances = pgTable('user_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  balance: decimal('balance', { precision: 20, scale: 8 }).notNull().default('0'),
  bonusBalance: decimal('bonus_balance', { precision: 20, scale: 8 }).default('0'),
  lockedBonus: decimal('locked_bonus', { precision: 20, scale: 8 }).default('0'),
  version: integer('version').default(1).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  balances: many(userBalances),
}))

export const userBalancesRelations = relations(userBalances, ({ one }) => ({
  user: one(users, {
    fields: [userBalances.userId],
    references: [users.id],
  }),
}))