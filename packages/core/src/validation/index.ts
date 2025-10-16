import { z } from 'zod'

// ============================================================================
// Common Validators
// ============================================================================

export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email()
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
export const currencySchema = z.string().length(3).toUpperCase()
export const amountSchema = z.number().positive()
export const percentageSchema = z.number().min(0).max(100)

// ============================================================================
// User Schemas
// ============================================================================

export const createUserSchema = z.object({
  email: emailSchema.optional(),
  phone_number: phoneSchema.optional(),
  external_user_id: z.string().optional(),
})

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  phone_number: phoneSchema.optional(),
  phone_verified: z.boolean().optional(),
})

// ============================================================================
// Transaction Schemas
// ============================================================================

export const transactionTypeSchema = z.enum(['debit', 'credit', 'rollback', 'promotion_win'])

export const createTransactionSchema = z.object({
  user_id: uuidSchema,
  tid: z.string(),
  currency: currencySchema,
  type: transactionTypeSchema,
  amount: amountSchema,
  game_round_id: z.string().optional(),
  action_id: z.number().optional(),
  game_id: z.number().optional(),
})

// ============================================================================
// Bonus Schemas
// ============================================================================

export const bonusTypeSchema = z.enum(['deposit_match', 'no_deposit', 'cashback', 'free_spins', 'reload'])
export const bonusStatusSchema = z.enum(['pending', 'active', 'completed', 'forfeited', 'expired', 'cancelled'])

export const claimBonusSchema = z.object({
  bonus_code: z.string().optional(),
  deposit_amount: amountSchema.optional(),
})

export const createBonusOfferSchema = z.object({
  bonus_name: z.string().min(1).max(200),
  bonus_type: bonusTypeSchema,
  bonus_code: z.string().max(50).optional(),
  match_percentage: percentageSchema.optional(),
  max_bonus_amount: amountSchema.optional(),
  min_deposit_amount: amountSchema.optional(),
  fixed_bonus_amount: amountSchema.optional(),
  wagering_requirement_multiplier: z.number().positive(),
  wagering_applies_to: z.enum(['bonus_only', 'deposit_and_bonus']).default('bonus_only'),
  max_cashout: amountSchema.optional(),
  max_bet_with_bonus: amountSchema.optional(),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime().optional(),
  day_of_week: z.number().min(0).max(6).optional(),
  terms_conditions: z.string().optional(),
  active: z.boolean().default(true),
  auto_apply: z.boolean().default(false),
  one_time_per_user: z.boolean().default(false),
})

// ============================================================================
// Loyalty Schemas
// ============================================================================

export const redeemPointsSchema = z.object({
  points: z.number().int().positive(),
})

export const loyaltyTransactionTypeSchema = z.enum(['earned', 'redeemed', 'expired', 'bonus', 'manual'])

// ============================================================================
// SMS Schemas
// ============================================================================

export const sendSMSSchema = z.object({
  phone_numbers: z.array(phoneSchema).min(1),
  message: z.string().min(1).max(1600),
  campaign_id: uuidSchema.optional(),
  template_id: uuidSchema.optional(),
})

export const smsDirectionSchema = z.enum(['inbound', 'outbound'])
export const smsStatusSchema = z.enum(['pending', 'sent', 'delivered', 'failed', 'bounced'])

// ============================================================================
// Support Schemas
// ============================================================================

export const ticketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed'])
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().optional(),
  priority: ticketPrioritySchema.default('medium'),
})

export const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigned_to: uuidSchema.optional(),
  category: z.string().optional(),
})

// ============================================================================
// Admin Schemas
// ============================================================================

export const adminRoleSchema = z.enum(['super_admin', 'admin', 'support', 'marketing', 'finance'])

export const createAdminUserSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(1).max(100),
  role: adminRoleSchema,
  permissions: z.array(z.string()).default([]),
})

export const playerNoteSchema = z.object({
  player_id: uuidSchema,
  note: z.string().min(1).max(5000),
  category: z.enum(['general', 'support', 'compliance', 'vip', 'marketing']),
  is_internal: z.boolean().default(false),
})

// ============================================================================
// Marketing Schemas
// ============================================================================

export const leadStatusSchema = z.enum(['new', 'contacted', 'registered', 'converted', 'invalid', 'opted_out'])

export const createLeadSchema = z.object({
  phone_number: phoneSchema,
  phone_country_code: z.string().max(5),
  email: emailSchema.optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  custom_data: z.record(z.any()).optional(),
})

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  email: emailSchema.optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  custom_data: z.record(z.any()).optional(),
})

// ============================================================================
// Pagination Schema
// ============================================================================

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

// ============================================================================
// Export Types
// ============================================================================

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type ClaimBonusInput = z.infer<typeof claimBonusSchema>
export type CreateBonusOfferInput = z.infer<typeof createBonusOfferSchema>
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>
export type SendSMSInput = z.infer<typeof sendSMSSchema>
export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>
export type PlayerNoteInput = z.infer<typeof playerNoteSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type PaginationInput = z.infer<typeof paginationSchema>