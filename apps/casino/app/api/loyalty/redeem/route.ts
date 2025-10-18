import { NextResponse } from 'next/server'
import type { PointsRedemptionResponse } from '@/types/loyalty'
import { redeemPointsSchema } from '@/lib/schemas/loyalty'
import { apiPost } from '@/lib/api/middleware'

/**
 * POST /api/loyalty/redeem
 * Redeem loyalty points for bonus credits
 */
export const POST = apiPost(async (request, { supabase, user, userId }) => {
  // Parse and validate request body
  const body = await request.json()
  const validation = redeemPointsSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid input',
        details: validation.error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      { status: 400 }
    )
  }

  const { points_to_redeem } = validation.data

  // Get user's casino account
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'No casino account linked' }, { status: 404 })
  }

  // Get player loyalty status
  const { data: loyalty } = await supabase
    .from('player_loyalty')
    .select('*, current_tier:loyalty_tiers(*)')
    .eq('user_id', userData.id)
    .single()

  if (!loyalty || loyalty.available_points < points_to_redeem) {
    return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
  }

  // Calculate credit amount based on tier
  const redemptionRate = loyalty.current_tier.points_per_dollar_redemption
  const creditAmount = points_to_redeem / redemptionRate

  // Deduct points
  const { error: updateError } = await supabase
    .from('player_loyalty')
    .update({
      available_points: loyalty.available_points - points_to_redeem
    })
    .eq('id', loyalty.id)

  if (updateError) {
    console.error('Error updating points', { userId: userData.id, pointsToRedeem: points_to_redeem, error: updateError.message })
    return NextResponse.json({ error: 'Failed to redeem points' }, { status: 500 })
  }

  // Log redemption
  await supabase
    .from('loyalty_points_transactions')
    .insert({
      user_id: userData.id,
      points: -points_to_redeem,
      transaction_type: 'redeemed',
      source: 'redemption',
      description: `Redeemed ${points_to_redeem} points for $${creditAmount.toFixed(2)}`
    })

  // Credit bonus balance (simplified - would need to update user_balances)
  // This is a placeholder - actual implementation depends on currency handling

  const response: PointsRedemptionResponse = {
    success: true,
    points_redeemed: points_to_redeem,
    credit_amount: creditAmount,
    remaining_points: loyalty.available_points - points_to_redeem,
    message: `Successfully redeemed ${points_to_redeem} points for $${creditAmount.toFixed(2)}`
  }

  return NextResponse.json(response)
}, { rateLimit: 'strict' })
