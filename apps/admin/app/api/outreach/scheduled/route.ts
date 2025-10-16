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

    const limit = parseInt(searchParams.get('limit') || '50')
    const upcoming_only = searchParams.get('upcoming_only') === 'true'

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
      .eq('status', 'scheduled')
      .eq('approval_status', 'approved')
      .order('scheduled_send_time', { ascending: true })
      .limit(limit)

    if (upcoming_only) {
      query = query.gte('scheduled_send_time', new Date().toISOString())
    }

    const { data: messages, error } = await query

    if (error) {
      logger.error('Error fetching scheduled messages', { error: error.message, limit, upcoming_only })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data
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
    logger.error('Error in scheduled messages API', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
