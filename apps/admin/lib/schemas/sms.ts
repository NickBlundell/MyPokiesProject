import { z } from 'zod'

/**
 * Schema for sending SMS
 */
export const sendSmsSchema = z.object({
  phone: z.string()
    .regex(/^\+?1?\d{10,15}$/, 'Invalid phone number format')
    .transform(val => {
      // Normalize phone number
      let cleaned = val.replace(/\D/g, '')
      if (!cleaned.startsWith('1') && cleaned.length === 10) {
        cleaned = '1' + cleaned
      }
      return '+' + cleaned
    }),
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(1600, 'Message too long (max 1600 characters for concatenated SMS)'),
  leadId: z.string().uuid('Invalid lead ID').optional(),
  campaignId: z.string().uuid('Invalid campaign ID').optional()
})

export type SendSmsInput = z.infer<typeof sendSmsSchema>
