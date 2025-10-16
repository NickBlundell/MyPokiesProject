import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@mypokies/monitoring'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting - standard (5 requests per 10 seconds)
    const { success, limit, remaining, reset } = await checkRateLimit(request)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
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

    const supabase = await createAdminClient()
    const { id: playerId } = await params

    // Get behavioral analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from('player_behavioral_analytics')
      .select('*')
      .eq('player_id', playerId)
      .single()

    if (analyticsError && analyticsError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (player hasn't been analyzed yet)
      logger.error('Error fetching behavioral analytics', { playerId, error: analyticsError.message, code: analyticsError.code })
      return NextResponse.json({ error: analyticsError.message }, { status: 500 })
    }

    // If no analytics exist, calculate them now
    if (!analytics) {
      const { error: updateError } = await supabase.rpc(
        'update_player_behavioral_analytics',
        { p_player_id: playerId }
      )

      if (updateError) {
        logger.error('Error calculating analytics', { playerId, error: updateError.message })
        return NextResponse.json(
          { error: 'Could not calculate player analytics' },
          { status: 500 }
        )
      }

      // Fetch the newly calculated analytics
      const { data: newAnalytics, error: fetchError } = await supabase
        .from('player_behavioral_analytics')
        .select('*')
        .eq('player_id', playerId)
        .single()

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      return NextResponse.json({ analytics: newAnalytics })
    }

    // Get scheduled messages for this player
    const { data: scheduledMessages } = await supabase
      .from('scheduled_outreach_messages')
      .select('*')
      .eq('player_id', playerId)
      .in('status', ['proposed', 'scheduled', 'approved'])
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      analytics,
      scheduled_messages: scheduledMessages || []
    })

  } catch (error) {
    logger.error('Error in behavioral analytics API', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to trigger analytics recalculation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting - strict (2 requests per minute)
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

    const supabase = await createAdminClient()
    const { id: playerId } = await params

    // Trigger analytics calculation
    const { error } = await supabase.rpc(
      'update_player_behavioral_analytics',
      { p_player_id: playerId }
    )

    if (error) {
      logger.error('Error recalculating analytics', { playerId, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch updated analytics
    const { data: analytics, error: fetchError } = await supabase
      .from('player_behavioral_analytics')
      .select('*')
      .eq('player_id', playerId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Analytics recalculated successfully',
      analytics
    })

  } catch (error) {
    logger.error('Error in analytics recalculation API', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
