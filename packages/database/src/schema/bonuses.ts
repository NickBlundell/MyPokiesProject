import { pgTable, uuid, varchar, integer, decimal, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// Enums
export const bonusTypeEnum = pgEnum('bonus_type', ['deposit_match', 'no_deposit', 'cashback', 'free_spins', 'reload'])
export const bonusStatusEnum = pgEnum('bonus_status', ['pending', 'active', 'completed', 'forfeited', 'expired', 'cancelled'])
export const wageringAppliesEnum = pgEnum('wagering_applies', ['bonus_only', 'deposit_and_bonus'])

// Bonus offers table
export const bonusOffers = pgTable('bonus_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  bonusCode: varchar('bonus_code', { length: 50 }).unique(),
  bonusName: varchar('bonus_name', { length: 200 }).notNull(),
  bonusType: bonusTypeEnum('bonus_type').notNull(),
  matchPercentage: decimal('match_percentage', { precision: 5, scale: 2 }),
  maxBonusAmount: decimal('max_bonus_amount', { precision: 10, scale: 2 }),
  minDepositAmount: decimal('min_deposit_amount', { precision: 10, scale: 2 }),
  fixedBonusAmount: decimal('fixed_bonus_amount', { precision: 10, scale: 2 }),
  wageringRequirementMultiplier: decimal('wagering_requirement_multiplier', { precision: 5, scale: 2 }).notNull(),
  wageringAppliesTo: wageringAppliesEnum('wagering_applies_to').notNull().default('bonus_only'),
  maxCashout: decimal('max_cashout', { precision: 10, scale: 2 }),
  maxBetWithBonus: decimal('max_bet_with_bonus', { precision: 10, scale: 2 }),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until'),
  dayOfWeek: integer('day_of_week'),
  termsConditions: varchar('terms_conditions'),
  active: boolean('active').notNull().default(true),
  autoApply: boolean('auto_apply').notNull().default(false),
  oneTimePerUser: boolean('one_time_per_user').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Player bonuses table
export const playerBonuses = pgTable('player_bonuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  bonusOfferId: uuid('bonus_offer_id').references(() => bonusOffers.id),
  bonusCodeUsed: varchar('bonus_code_used', { length: 50 }),
  bonusAmount: decimal('bonus_amount', { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }),
  wageringRequirementTotal: decimal('wagering_requirement_total', { precision: 15, scale: 2 }).notNull(),
  wageringCompleted: decimal('wagering_completed', { precision: 15, scale: 2 }).notNull().default('0'),
  wageringPercentage: decimal('wagering_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  maxCashout: decimal('max_cashout', { precision: 10, scale: 2 }),
  status: bonusStatusEnum('status').notNull().default('pending'),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  activatedAt: timestamp('activated_at'),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at'),
  forfeitedReason: varchar('forfeited_reason', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Game wagering weights table
export const gameWageringWeights = pgTable('game_wagering_weights', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameType: varchar('game_type', { length: 100 }).notNull(),
  gameProvider: varchar('game_provider', { length: 100 }),
  gameId: integer('game_id'),
  wageringContribution: decimal('wagering_contribution', { precision: 5, scale: 2 }).notNull().default('100'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const bonusOffersRelations = relations(bonusOffers, ({ many }) => ({
  playerBonuses: many(playerBonuses),
}))

export const playerBonusesRelations = relations(playerBonuses, ({ one }) => ({
  user: one(users, {
    fields: [playerBonuses.userId],
    references: [users.id],
  }),
  bonusOffer: one(bonusOffers, {
    fields: [playerBonuses.bonusOfferId],
    references: [bonusOffers.id],
  }),
}))