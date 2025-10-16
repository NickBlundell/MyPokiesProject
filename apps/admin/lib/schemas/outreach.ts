import { z } from 'zod'

/**
 * Schema for approving outreach message
 */
export const approveMessageSchema = z.object({
  edited_message: z.string()
    .max(1600, 'Message too long')
    .optional(),
  edit_notes: z.string()
    .max(500, 'Edit notes too long')
    .optional()
})

/**
 * Schema for rejecting outreach message
 */
export const rejectMessageSchema = z.object({
  rejection_reason: z.string()
    .min(1, 'Rejection reason is required')
    .max(500, 'Rejection reason too long')
})

export type ApproveMessageInput = z.infer<typeof approveMessageSchema>
export type RejectMessageInput = z.infer<typeof rejectMessageSchema>
