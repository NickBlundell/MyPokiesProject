import { pgTable, uuid, varchar, integer, decimal, timestamp, pgEnum, boolean, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// Enums
export const withdrawalPriorityEnum = pgEnum('withdrawal_priority', ['standard', 'fast', 'priority', 'instant'])
export const loyaltyTransactionTypeEnum = pgEnum('loyalty_transaction_type', ['earned', 'redeemed', 'expired', 'bonus', 'manual'])

// Loyalty tiers table
export const loyaltyTiers = pgTable('loyalty_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tierName: varchar('tier_name', { length: 100 }).notNull().unique(),
  tierLevel: integer('tier_level').notNull().unique(),
  pointsRequired: integer('points_required').notNull(),
  cashbackRate: decimal('cashback_rate', { precision: 5, scale: 2 }).notNull(),
  pointsPerDollarRedemption: integer('points_per_dollar_redemption').notNull(),
  withdrawalPriority: withdrawalPriorityEnum('withdrawal_priority').notNull(),
  birthdayBonus: decimal('birthday_bonus', { precision: 10, scale: 2 }).notNull(),
  hasPersonalManager: boolean('has_personal_manager').notNull().default(false),
  jackpotTicketRate: decimal('jackpot_ticket_rate', { precision: 5, scale: 2 }).notNull(),
  benefits: jsonb('benefits'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Player loyalty table
export const playerLoyalty = pgTable('player_loyalty', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  currentTierId: uuid('current_tier_id').references(() => loyaltyTiers.id),
  totalPointsEarned: integer('total_points_earned').notNull().default(0),
  availablePoints: integer('available_points').notNull().default(0),
  lifetimeWagered: decimal('lifetime_wagered', { precision: 20, scale: 2 }).notNull().default('0'),
  tierStartedAt: timestamp('tier_started_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Loyalty points transactions table
export const loyaltyPointsTransactions = pgTable('loyalty_points_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  points: integer('points').notNull(),
  transactionType: loyaltyTransactionTypeEnum('transaction_type').notNull(),
  source: varchar('source', { length: 100 }),
  relatedTransactionId: uuid('related_transaction_id'),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const loyaltyTiersRelations = relations(loyaltyTiers, ({ many }) => ({
  players: many(playerLoyalty),
}))

export const playerLoyaltyRelations = relations(playerLoyalty, ({ one, many }) => ({
  user: one(users, {
    fields: [playerLoyalty.userId],
    references: [users.id],
  }),
  tier: one(loyaltyTiers, {
    fields: [playerLoyalty.currentTierId],
    references: [loyaltyTiers.id],
  }),
  pointsTransactions: many(loyaltyPointsTransactions),
}))

export const loyaltyPointsTransactionsRelations = relations(loyaltyPointsTransactions, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyPointsTransactions.userId],
    references: [users.id],
  }),
}))