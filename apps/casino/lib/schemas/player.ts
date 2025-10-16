import { z } from 'zod'

/**
 * Schema for linking casino account
 */
export const linkAccountSchema = z.object({
  external_user_id: z.string()
    .min(1, 'External user ID is required')
    .max(255, 'External user ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'External user ID must contain only alphanumeric characters, hyphens, and underscores')
})

export type LinkAccountInput = z.infer<typeof linkAccountSchema>
