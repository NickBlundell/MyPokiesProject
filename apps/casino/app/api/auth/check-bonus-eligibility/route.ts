import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/auth/check-bonus-eligibility
 *
 * Checks if a phone number is eligible for a custom bonus from lead lists
 * This is called during signup to determine what bonus to display
 *
 * @param phone - Phone number to check (query parameter)
 * @returns Bonus details if eligible, or null if standard bonus applies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phone')

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Normalize phone number to international format
    let normalizedPhone = phoneNumber.replace(/[\s\-()]/g, '')

    // If starts with 04, convert to +614
    if (normalizedPhone.startsWith('04')) {
      normalizedPhone = '+61' + normalizedPhone.substring(1)
    }
    // If starts with 61 but no +, add it
    else if (normalizedPhone.startsWith('61') && !normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone
    }
    // If doesn't start with + or 0, assume it needs +
    else if (!normalizedPhone.startsWith('+') && !normalizedPhone.startsWith('0')) {
      normalizedPhone = '+' + normalizedPhone
    }

    console.log('[Check Bonus] Checking eligibility for phone:', normalizedPhone)

    // Check if this phone number has a lead with bonus
    const { data: lead, error: leadError } = await supabase
      .from('marketing_leads')
      .select(`
        id,
        lead_lists:list_id(
          id,
          name,
          bonus_enabled,
          bonus_type,
          bonus_amount,
          bonus_percentage,
          bonus_code
        )
      `)
      .eq('phone_number', normalizedPhone)
      .eq('status', 'new')
      .eq('lead_lists.bonus_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (leadError) {
      console.error('[Check Bonus] Error checking lead:', leadError)
      // Return null on error - will fall back to standard bonus
      return NextResponse.json({
        eligible: false,
        bonus: null
      })
    }

    if (!lead || !lead.lead_lists) {
      console.log('[Check Bonus] No custom bonus found for this number')
      return NextResponse.json({
        eligible: false,
        bonus: null
      })
    }

    // Type assertion since we know lead_lists is a single object, not array
    const leadList = lead.lead_lists as any

    console.log('[Check Bonus] ✅ Custom bonus found:', leadList.bonus_amount)

    return NextResponse.json({
      eligible: true,
      bonus: {
        type: leadList.bonus_type,
        amount: leadList.bonus_amount,
        percentage: leadList.bonus_percentage,
        code: leadList.bonus_code,
        listName: leadList.name,
        leadId: lead.id
      }
    })

  } catch (error: unknown) {
    console.error('[Check Bonus] Unexpected error:', error)
    // Return null on error - will fall back to standard bonus
    return NextResponse.json({
      eligible: false,
      bonus: null
    })
  }
}
