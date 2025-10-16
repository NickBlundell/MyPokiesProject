import { z } from 'zod'

/**
 * Schema for lead conversion
 */
export const convertLeadSchema = z.object({
  phoneNumber: z.string()
    .regex(/^\+?1?\d{10,15}$/, 'Invalid phone number format'),
  playerId: z.string()
    .uuid('Invalid player ID format')
})

/**
 * Schema for CSV upload metadata
 */
export const uploadLeadsMetadataSchema = z.object({
  listName: z.string()
    .min(1, 'List name is required')
    .max(255, 'List name too long'),
  description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  source: z.string()
    .max(100, 'Source too long')
    .optional(),
  bonusEnabled: z.enum(['true', 'false']).transform(val => val === 'true'),
  bonusType: z.enum(['deposit_match', 'no_deposit', 'free_spins']).optional(),
  bonusAmount: z.coerce.number()
    .nonnegative('Bonus amount must be non-negative')
    .max(10000, 'Bonus amount too large')
    .default(0),
  bonusPercentage: z.coerce.number()
    .min(0, 'Bonus percentage must be non-negative')
    .max(500, 'Bonus percentage too large')
    .default(0),
  bonusCode: z.string()
    .max(50, 'Bonus code too long')
    .regex(/^[A-Z0-9_-]*$/i, 'Bonus code must contain only alphanumeric characters, hyphens, and underscores')
    .optional()
})

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>
export type UploadLeadsMetadata = z.infer<typeof uploadLeadsMetadataSchema>
