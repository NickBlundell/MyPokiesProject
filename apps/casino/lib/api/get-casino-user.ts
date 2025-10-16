import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Shared helper to get authenticated casino user from request.
 *
 * This helper consolidates the auth check + user lookup that was
 * being repeated in every API route, reducing redundant database queries.
 *
 * @returns Casino user ID or NextResponse with error
 */
export async function getCasinoUser() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  // Get casino user ID (cached by Supabase client for request duration)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (userError) {
    return {
      error: NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }
  }

  if (!userData) {
    return {
      error: NextResponse.json(
        { error: 'No casino account linked' },
        { status: 404 }
      )
    }
  }

  return {
    userId: userData.id,
    authUserId: user.id
  }
}
