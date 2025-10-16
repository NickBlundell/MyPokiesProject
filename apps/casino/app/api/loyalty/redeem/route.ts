import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { PointsRedemptionResponse } from '@/types/loyalty'
import { checkRateLimit } from '@/lib/rate-limit'
import { redeemPointsSchema } from '@/lib/schemas/loyalty'

/**
 * POST /api/loyalty/redeem
 * Redeem loyalty points for bonus credits
 */
export async function POST(request: Request) {
  try {
    // Rate limiting - strict (5 requests per minute)
    const { success, limit, remaining, reset } = await checkRateLimit(request, { strict: true })

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          limit,
          remaining,
          reset
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      .eq('auth_user_id', user.id)
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

  } catch (error) {
    console.error('Error in /api/loyalty/redeem', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
