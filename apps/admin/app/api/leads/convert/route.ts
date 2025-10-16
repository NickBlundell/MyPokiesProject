import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@mypokies/monitoring'

// This endpoint is called when a user registers with a phone number from a lead list
export async function POST(request: NextRequest) {
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
    const { phoneNumber, playerId } = await request.json()

    if (!phoneNumber || !playerId) {
      return NextResponse.json(
        { error: 'Phone number and player ID are required' },
        { status: 400 }
      )
    }

    // Clean phone number for matching
    let cleanedPhone = phoneNumber.replace(/\D/g, '')
    if (!cleanedPhone.startsWith('1') && cleanedPhone.length === 10) {
      cleanedPhone = '1' + cleanedPhone
    }
    cleanedPhone = '+' + cleanedPhone

    // Find matching lead
    const { data: lead, error: leadError } = await supabase
      .from('marketing_leads')
      .select(`
        *,
        lead_lists!inner(
          id,
          name,
          bonus_enabled,
          bonus_type,
          bonus_amount,
          bonus_percentage,
          bonus_code,
          bonus_expiry_days
        )
      `)
      .eq('phone_number', cleanedPhone)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (leadError || !lead) {
      // No matching lead found - this is OK, not all users come from leads
      return NextResponse.json({
        success: true,
        message: 'No matching lead found',
        bonusAssigned: false
      })
    }

    // Update lead status to converted
    const { error: updateError } = await supabase
      .from('marketing_leads')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        player_id: playerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id)

    if (updateError) {
      logger.error('Failed to update lead status', { leadId: lead.id, playerId, error: updateError.message })
    }

    // Check if bonus is enabled for this lead list
    if (!lead.lead_lists?.bonus_enabled) {
      return NextResponse.json({
        success: true,
        message: 'Lead converted, no bonus configured',
        bonusAssigned: false,
        leadId: lead.id
      })
    }

    // Create bonus assignment record
    const expiryDays = lead.lead_lists.bonus_expiry_days || 7
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    const { data: bonusAssignment, error: bonusError } = await supabase
      .from('lead_bonus_assignments')
      .insert({
        lead_id: lead.id,
        player_id: playerId,
        list_id: lead.lead_lists.id,
        bonus_type: lead.lead_lists.bonus_type,
        bonus_amount: lead.lead_lists.bonus_amount,
        bonus_percentage: lead.lead_lists.bonus_percentage,
        bonus_code: lead.lead_lists.bonus_code,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (bonusError) {
      return NextResponse.json(
        { error: 'Failed to assign bonus', details: bonusError.message },
        { status: 500 }
      )
    }

    // Create actual player bonus (this would integrate with MyPokies main system)
    // In production, this would call the main MyPokies API to add bonus to player account
    // const bonusData = {
    //   user_id: playerId,
    //   bonus_code: lead.lead_lists.bonus_code || 'LEAD_CONVERSION',
    //   bonus_type: lead.lead_lists.bonus_type,
    //   bonus_amount: lead.lead_lists.bonus_amount,
    //   match_percentage: lead.lead_lists.bonus_percentage,
    //   status: 'active',
    //   activated_at: new Date().toISOString(),
    //   expires_at: expiresAt.toISOString(),
    //   source: 'lead_conversion',
    //   source_id: lead.id
    // }

    // TODO (tracked in TODO.md): Integrate with MyPokies bonus assignment API
    //   Implementation:
    //     1. Create bonus assignment endpoint in casino app
    //     2. Add MYPOKIES_API_KEY to admin app environment variables
    //     3. Implement retry logic and error handling
    //   Uncomment when API is ready:
    // try {
    //   const bonusResponse = await fetch(`${process.env.NEXT_PUBLIC_CASINO_URL}/api/bonuses/assign`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${process.env.MYPOKIES_API_KEY}`
    //     },
    //     body: JSON.stringify(bonusData)
    //   })
    //   if (!bonusResponse.ok) {
    //     throw new Error(`Bonus assignment failed: ${bonusResponse.statusText}`)
    //   }
    // } catch (error) {
    //   logger.error('Failed to assign bonus to converted lead', error, { leadId: lead.id, bonusId })
    //   // Continue with lead conversion even if bonus assignment fails
    // }

    // Update bonus assignment status
    await supabase
      .from('lead_bonus_assignments')
      .update({
        status: 'active',
        activated: true,
        activated_at: new Date().toISOString()
      })
      .eq('id', bonusAssignment.id)

    // Track conversion event
    const { data: conversation } = await supabase
      .from('sms_conversations')
      .select('id')
      .eq('phone_number', cleanedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (conversation) {
      // Update conversation as converted
      await supabase
        .from('sms_conversations')
        .update({
          status: 'converted',
          converted: true,
          converted_at: new Date().toISOString(),
          player_id: playerId
        })
        .eq('id', conversation.id)

      // Track conversion event
      await supabase
        .from('conversion_events')
        .insert({
          conversation_id: conversation.id,
          lead_id: lead.id,
          player_id: playerId,
          event_type: 'signup',
          event_value: lead.lead_lists.bonus_amount || 0,
          attributed_to: 'ai_conversation',
          occurred_at: new Date().toISOString()
        })
    }

    return NextResponse.json({
      success: true,
      message: 'Lead converted and bonus assigned',
      bonusAssigned: true,
      leadId: lead.id,
      listName: lead.lead_lists.name,
      bonus: {
        type: lead.lead_lists.bonus_type,
        amount: lead.lead_lists.bonus_amount,
        percentage: lead.lead_lists.bonus_percentage,
        code: lead.lead_lists.bonus_code,
        expiresAt: expiresAt.toISOString()
      }
    })

  } catch (error: unknown) {
    logger.error('Lead conversion error', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Failed to process lead conversion', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if a phone number has a pending bonus
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phone')

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Clean phone number
    let cleanedPhone = phoneNumber.replace(/\D/g, '')
    if (!cleanedPhone.startsWith('1') && cleanedPhone.length === 10) {
      cleanedPhone = '1' + cleanedPhone
    }
    cleanedPhone = '+' + cleanedPhone

    // Check if this phone number has a lead with bonus
    const { data: lead } = await supabase
      .from('marketing_leads')
      .select(`
        *,
        lead_lists!inner(
          bonus_enabled,
          bonus_type,
          bonus_amount,
          bonus_percentage,
          bonus_code
        )
      `)
      .eq('phone_number', cleanedPhone)
      .eq('status', 'new')
      .eq('lead_lists.bonus_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!lead) {
      return NextResponse.json({
        hasBonus: false,
        message: 'No bonus available for this phone number'
      })
    }

    return NextResponse.json({
      hasBonus: true,
      bonus: {
        type: lead.lead_lists.bonus_type,
        amount: lead.lead_lists.bonus_amount,
        percentage: lead.lead_lists.bonus_percentage,
        code: lead.lead_lists.bonus_code
      },
      message: `${lead.lead_lists.bonus_type === 'no_deposit' ? 'No deposit' : 'Deposit match'} bonus available!`
    })

  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to check bonus eligibility', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}