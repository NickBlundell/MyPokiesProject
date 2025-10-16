import { pgTable, uuid, varchar, timestamp, pgEnum, decimal, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', ['debit', 'credit', 'rollback', 'promotion_win'])
export const gameRoundStatusEnum = pgEnum('game_round_status', ['active', 'completed', 'rolled_back'])

// Transactions table
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tid: varchar('tid', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  subtype: varchar('subtype', { length: 50 }),
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 20, scale: 8 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 20, scale: 8 }).notNull(),
  gameRoundId: varchar('game_round_id', { length: 255 }),
  actionId: integer('action_id'),
  gameId: integer('game_id'),
  rollbackTid: varchar('rollback_tid', { length: 255 }),
  promotionId: varchar('promotion_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
})

// Game rounds table
export const gameRounds = pgTable('game_rounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameRoundId: varchar('game_round_id', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  gameDesc: varchar('game_desc', { length: 255 }),
  currency: varchar('currency', { length: 3 }).notNull(),
  totalBet: decimal('total_bet', { precision: 20, scale: 8 }).notNull().default('0'),
  totalWin: decimal('total_win', { precision: 20, scale: 8 }).notNull().default('0'),
  status: gameRoundStatusEnum('status').notNull().default('active'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

// Round actions table
export const roundActions = pgTable('round_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id').references(() => gameRounds.id).notNull(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  actionId: integer('action_id').notNull(),
  gameId: integer('game_id').notNull(),
  actionType: varchar('action_type', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})

// Relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}))

export const gameRoundsRelations = relations(gameRounds, ({ one, many }) => ({
  user: one(users, {
    fields: [gameRounds.userId],
    references: [users.id],
  }),
  actions: many(roundActions),
}))

export const roundActionsRelations = relations(roundActions, ({ one }) => ({
  round: one(gameRounds, {
    fields: [roundActions.roundId],
    references: [gameRounds.id],
  }),
  transaction: one(transactions, {
    fields: [roundActions.transactionId],
    references: [transactions.id],
  }),
}))