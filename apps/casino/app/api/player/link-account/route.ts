import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { linkAccountSchema } from '@/lib/schemas/player'

/**
 * POST /api/player/link-account
 * Links the authenticated user's account to their Fundist casino account
 *
 * Body: { external_user_id: string }
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

    // Parse and validate request body
    const body = await request.json()
    const validation = linkAccountSchema.safeParse(body)

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

    const { external_user_id } = validation.data

    // Check if user already has a linked account
    const { data: existingLink } = await supabase
      .from('users')
      .select('id, external_user_id')
      .eq('auth_user_id', user.id)
      .single()

    if (existingLink) {
      return NextResponse.json(
        {
          error: 'Account already linked',
          linked_to: existingLink.external_user_id
        },
        { status: 400 }
      )
    }

    // Link the accounts
    const { error } = await supabase
      .rpc('link_auth_to_casino_user', {
        p_external_user_id: external_user_id,
        p_auth_user_id: user.id
      })

    if (error) {
      console.error('Error linking accounts', { userId: user.id, externalUserId: external_user_id, error: error.message })
      return NextResponse.json(
        { error: error.message || 'Failed to link account' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account successfully linked',
      external_user_id
    })

  } catch (error) {
    console.error('Error in /api/player/link-account', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
