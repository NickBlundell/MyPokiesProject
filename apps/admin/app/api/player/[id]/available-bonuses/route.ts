import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@mypokies/monitoring'

// GET /api/player/[id]/available-bonuses
// Returns all bonuses available to a player:
// - General bonuses from bonus_offers
// - Daily promotions (repeatable)
// - AI-offered personalized bonuses
export async function GET(
  request: NextRequest,
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

    // Get all available bonuses for the player
    const { data: bonuses, error } = await supabase
      .rpc('get_player_available_bonuses', { p_player_id: playerId })

    if (error) {
      logger.error('Error fetching available bonuses', { playerId, error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch available bonuses', details: error.message },
        { status: 500 }
      )
    }

    // Group bonuses by source for frontend
    const grouped = {
      ai_offered: bonuses?.filter((b: { source: string }) => b.source === 'ai_offered') || [],
      daily_promotions: bonuses?.filter((b: { source: string }) => b.source === 'daily_promotion') || [],
      general: bonuses?.filter((b: { source: string }) => b.source === 'general') || [],
      all: bonuses || []
    }

    return NextResponse.json({
      success: true,
      player_id: playerId,
      total_available: bonuses?.length || 0,
      bonuses: grouped
    })

  } catch (error) {
    logger.error('Error in available-bonuses API', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/player/[id]/available-bonuses/[bonusId]/claim
// Claim an available bonus
export async function POST(
  request: NextRequest,
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
    const { bonusId, bonusCode, source } = await request.json()

    // If it's an AI-offered bonus, mark it as claimed in ai_offered_bonuses
    if (source === 'ai_offered') {
      const { error: updateError } = await supabase
        .from('ai_offered_bonuses')
        .update({
          status: 'claimed',
          player_claimed: true,
          player_claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bonusId)
        .eq('player_id', playerId)

      if (updateError) {
        logger.error('Error updating AI-offered bonus', { bonusId, playerId, error: updateError.message })
      }
    }

    // Create player_bonuses record
    const { data: playerBonus, error: bonusError } = await supabase
      .from('player_bonuses')
      .insert({
        user_id: playerId,
        bonus_code_used: bonusCode,
        status: 'pending',
        activated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (bonusError) {
      return NextResponse.json(
        { error: 'Failed to claim bonus', details: bonusError.message },
        { status: 500 }
      )
    }

    // If AI-offered, link the player_bonus_id
    if (source === 'ai_offered') {
      await supabase
        .from('ai_offered_bonuses')
        .update({ player_bonus_id: playerBonus.id })
        .eq('id', bonusId)
    }

    return NextResponse.json({
      success: true,
      message: 'Bonus claimed successfully',
      bonus: playerBonus
    })

  } catch (error) {
    logger.error('Error claiming bonus', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
