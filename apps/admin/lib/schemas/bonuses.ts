import { z } from 'zod'

/**
 * Schema for claiming bonus on behalf of player
 */
export const claimPlayerBonusSchema = z.object({
  bonusId: z.string()
    .uuid('Invalid bonus ID'),
  bonusCode: z.string()
    .min(3, 'Bonus code must be at least 3 characters')
    .max(50, 'Bonus code too long')
    .regex(/^[A-Z0-9_-]+$/i, 'Bonus code must contain only alphanumeric characters, hyphens, and underscores'),
  source: z.enum(['ai_offered', 'daily_promotion', 'general', 'manual'])
})

export type ClaimPlayerBonusInput = z.infer<typeof claimPlayerBonusSchema>
