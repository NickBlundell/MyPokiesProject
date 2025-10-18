import { NextResponse } from 'next/server'
import { apiPost } from '@/lib/api/middleware'
import { linkAccountSchema } from '@/lib/schemas/player'

/**
 * POST /api/player/link-account
 * Links the authenticated user's account to their Fundist casino account
 *
 * Body: { external_user_id: string }
 */
export const POST = apiPost(async (request, { supabase, userId }) => {
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
    .eq('auth_user_id', userId)
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
      p_auth_user_id: userId
    })

  if (error) {
    console.error('Error linking accounts', { userId, externalUserId: external_user_id, error: error.message })
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
})
