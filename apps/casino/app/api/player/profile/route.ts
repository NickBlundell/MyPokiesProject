import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'

/**
 * GET /api/player/profile
 * Returns the authenticated player's casino profile and statistics
 */
export async function GET(request: Request) {
  return withRateLimit(request, async () => {
    try {

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get casino profile
    const { data, error } = await supabase
      .rpc('get_my_casino_profile')
      .single()

    if (error) {
      console.error('Error fetching casino profile', { userId: user.id, error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    if (!data) {
      // User is authenticated but doesn't have a linked casino account yet
      return NextResponse.json(
        {
          linked: false,
          message: 'No casino account linked. Please contact support to link your account.'
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      linked: true,
      profile: data
    })

    } catch (error) {
      console.error('Error in /api/player/profile', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }, 'api')
}
