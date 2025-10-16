import { z } from 'zod'

/**
 * Schema for points redemption request
 */
export const redeemPointsSchema = z.object({
  points_to_redeem: z.number()
    .int('Points must be a whole number')
    .positive('Points must be positive')
    .max(1000000, 'Cannot redeem more than 1,000,000 points at once')
    .refine(val => val % 100 === 0, {
      message: 'Points must be in multiples of 100'
    })
})

export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>
