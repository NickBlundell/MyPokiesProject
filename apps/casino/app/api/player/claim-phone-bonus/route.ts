import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/player/claim-phone-bonus
 *
 * Claims the $20 no-deposit bonus after phone verification
 * Requires: User must have verified phone via Supabase Auth
 *
 * @returns Bonus details if successful
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

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call the database function to award bonus
    const { data, error } = await supabase.rpc(
      'award_phone_verification_bonus',
      { p_auth_user_id: user.id }
    )

    if (error) {
      console.error('Error claiming phone bonus', { userId: user.id, error: error.message })
      return NextResponse.json(
        { error: 'Failed to claim bonus' },
        { status: 500 }
      )
    }

    // Check if the function returned an error
    if (data && !data.success) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      bonus: {
        amount: data.bonus_amount,
        wageringRequired: data.wagering_required,
        expiresAt: data.expires_at
      }
    })

  } catch (error) {
    console.error('Unexpected error claiming phone bonus', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
