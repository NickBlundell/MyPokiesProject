import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API route to track signup metadata (IP, user agent, country)
 * Called after successful signup to record additional security data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract IP address from request headers
    // Vercel provides these headers automatically
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const vercelIp = request.headers.get('x-vercel-forwarded-for')

    // Use the most reliable IP source
    const clientIp = vercelIp || forwardedFor?.split(',')[0].trim() || realIp || 'unknown'

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Get country from Vercel headers (if available)
    const country = request.headers.get('x-vercel-ip-country') || null

    console.log('[Track Signup] Recording metadata for user:', user.id)
    console.log('[Track Signup] IP:', clientIp)
    console.log('[Track Signup] Country:', country)
    console.log('[Track Signup] User Agent:', userAgent)

    // Update user record with signup metadata
    const { error: updateError } = await supabase
      .from('users')
      .update({
        signup_ip: clientIp !== 'unknown' ? clientIp : null,
        signup_country: country,
        signup_user_agent: userAgent !== 'unknown' ? userAgent : null,
      })
      .eq('auth_user_id', user.id)

    if (updateError) {
      console.error('[Track Signup] Failed to update user metadata:', updateError)
      return NextResponse.json(
        { error: 'Failed to track signup metadata' },
        { status: 500 }
      )
    }

    console.log('[Track Signup] ✅ Successfully tracked signup metadata')

    return NextResponse.json({
      success: true,
      metadata: {
        ip: clientIp,
        country,
        userAgent,
      },
    })
  } catch (error) {
    console.error('[Track Signup] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
