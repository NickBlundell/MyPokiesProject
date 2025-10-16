import { z } from 'zod'

/**
 * Schema for bonus claiming (if we add this endpoint)
 */
export const claimBonusSchema = z.object({
  bonus_code: z.string()
    .min(3, 'Bonus code must be at least 3 characters')
    .max(50, 'Bonus code too long')
    .regex(/^[A-Z0-9_-]+$/i, 'Bonus code must contain only alphanumeric characters, hyphens, and underscores')
    .transform(val => val.toUpperCase()),
  deposit_amount: z.number()
    .positive('Deposit amount must be positive')
    .max(100000, 'Deposit amount exceeds maximum')
    .optional()
})

export type ClaimBonusInput = z.infer<typeof claimBonusSchema>
