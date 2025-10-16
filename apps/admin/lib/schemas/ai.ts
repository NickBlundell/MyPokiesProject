import { z } from 'zod'

/**
 * Schema for AI message generation
 */
export const generateAiMessageSchema = z.object({
  conversationId: z.string()
    .uuid('Invalid conversation ID'),
  userMessage: z.string()
    .min(1, 'User message cannot be empty')
    .max(1600, 'User message too long'),
  goal: z.enum(['signup', 'deposit', 'reactivation', 'support', 'retention'])
    .describe('The goal of the AI-generated message'),
  persona: z.enum(['friendly_casino_host', 'professional_support', 'vip_concierge'])
    .default('friendly_casino_host')
    .optional(),
  context: z.record(z.unknown())
    .default({})
    .optional()
})

export type GenerateAiMessageInput = z.infer<typeof generateAiMessageSchema>
