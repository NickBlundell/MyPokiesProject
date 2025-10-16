import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@mypokies/monitoring'

export async function GET(request: Request) {
  try {
    // Rate limiting - standard (5 requests per 10 seconds)
    const { success, limit: rateLimit, remaining, reset } = await checkRateLimit(request)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') || 'proposed'
    const message_type = searchParams.get('message_type')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('scheduled_outreach_messages')
      .select(`
        *,
        users:player_id (
          email,
          external_user_id
        )
      `)
      .eq('approval_status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (message_type) {
      query = query.eq('message_type', message_type)
    }

    const { data: messages, error } = await query

    if (error) {
      logger.error('Error fetching proposed messages', { error: error.message, status, message_type, limit })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to include player details
    const transformedMessages = messages?.map(msg => ({
      ...msg,
      player_name: msg.users?.external_user_id || 'Unknown Player',
      player_email: msg.users?.email || '',
      player_tier: 'Bronze' // Simplified for now - tier info requires additional query
    })) || []

    return NextResponse.json({
      messages: transformedMessages,
      total: transformedMessages.length
    })

  } catch (error) {
    logger.error('Error in proposed messages API', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
