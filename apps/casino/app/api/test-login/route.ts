import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    console.log('[TEST-LOGIN] Starting test for:', email)

    // Test with service client
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user exists
    const { data: users } = await serviceClient.auth.admin.listUsers()
    const user = users?.users.find(u => u.email === email)

    console.log('[TEST-LOGIN] User exists:', !!user)
    console.log('[TEST-LOGIN] Email confirmed:', user?.email_confirmed_at ? 'Yes' : 'No')

    // Try anon client login
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password
    })

    console.log('[TEST-LOGIN] Login attempt result:', {
      success: !error,
      hasSession: !!data?.session,
      error: error?.message
    })

    return NextResponse.json({
      success: !error,
      userExists: !!user,
      emailConfirmed: !!user?.email_confirmed_at,
      hasSession: !!data?.session,
      error: error?.message,
      user: data?.user ? {
        id: data.user.id,
        email: data.user.email
      } : null
    })
  } catch (e) {
    console.error('[TEST-LOGIN] Exception:', e)
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 })
  }
}
