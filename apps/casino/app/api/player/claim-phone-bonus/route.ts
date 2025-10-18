import { NextResponse } from 'next/server'
import { apiPost } from '@/lib/api/middleware'

/**
 * POST /api/player/claim-phone-bonus
 *
 * Claims the no-deposit bonus after phone verification
 * Checks for custom lead-based bonuses first, falls back to standard $20
 * Requires: User must have verified phone via Supabase Auth
 *
 * @returns Bonus details if successful
 */
export const POST = apiPost(async (request, { supabase, userId }) => {
  console.log('[Claim Bonus] Starting bonus claim for user:', userId)

  // Get user's phone number and casino user ID
  const { data: authUser } = await supabase.auth.getUser()
  const userPhone = authUser?.user?.phone

  if (!userPhone) {
    console.error('[Claim Bonus] No phone found for user')
    return NextResponse.json(
      { error: 'Phone number not found' },
      { status: 400 }
    )
  }

  // Get casino user record
  const { data: casinoUser } = await supabase
    .from('users')
    .select('id, phone_bonus_claimed')
    .eq('auth_user_id', userId)
    .single()

  if (!casinoUser) {
    console.error('[Claim Bonus] Casino user not found')
    return NextResponse.json(
      { error: 'User account not found' },
      { status: 404 }
    )
  }

  // Check if bonus already claimed
  if (casinoUser.phone_bonus_claimed) {
    console.log('[Claim Bonus] Bonus already claimed')
    return NextResponse.json(
      { error: 'Phone verification bonus already claimed' },
      { status: 400 }
    )
  }

  // Check for custom lead-based bonus
  console.log('[Claim Bonus] Checking for lead-based bonus...')
  const { data: leadBonus } = await supabase
    .from('lead_bonus_assignments')
    .select(`
      id,
      bonus_type,
      bonus_amount,
      bonus_code,
      expires_at,
      status
    `)
    .eq('player_id', casinoUser.id)
    .eq('status', 'pending')
    .eq('bonus_type', 'no_deposit')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (leadBonus) {
    console.log('[Claim Bonus] ✅ Lead-based bonus found:', leadBonus.bonus_amount)

    // Award the custom lead bonus
    // Get or create bonus offer for this custom amount
    const { data: bonusOffer } = await supabase
      .from('bonus_offers')
      .select('*')
      .eq('bonus_code', leadBonus.bonus_code || 'LEAD_BONUS')
      .eq('bonus_type', 'no_deposit')
      .single()

    if (!bonusOffer) {
      console.error('[Claim Bonus] Custom bonus offer not found')
      // Fall back to standard bonus
    } else {
      // Create player bonus with custom amount
      const expiryDate = new Date(leadBonus.expires_at)

      await supabase.from('player_bonuses').insert({
        user_id: casinoUser.id,
        bonus_offer_id: bonusOffer.id,
        bonus_amount: leadBonus.bonus_amount,
        wagering_requirement_total: leadBonus.bonus_amount * bonusOffer.wagering_requirement_multiplier,
        wagering_requirement_remaining: leadBonus.bonus_amount * bonusOffer.wagering_requirement_multiplier,
        max_cashout: bonusOffer.max_cashout,
        status: 'active',
        activated_at: new Date().toISOString(),
        expires_at: expiryDate.toISOString()
      })

      // Add to user's balance - check if record exists first
      const { data: existingBalance } = await supabase
        .from('user_balances')
        .select('bonus_balance')
        .eq('user_id', casinoUser.id)
        .eq('currency', 'USD')
        .single()

      if (existingBalance) {
        // Update existing balance
        await supabase
          .from('user_balances')
          .update({
            bonus_balance: existingBalance.bonus_balance + leadBonus.bonus_amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', casinoUser.id)
          .eq('currency', 'USD')
      } else {
        // Insert new balance
        await supabase
          .from('user_balances')
          .insert({
            user_id: casinoUser.id,
            currency: 'USD',
            bonus_balance: leadBonus.bonus_amount,
            balance: 0.00
          })
      }

      // Mark lead bonus as claimed
      await supabase
        .from('lead_bonus_assignments')
        .update({
          status: 'active',
          activated: true,
          activated_at: new Date().toISOString()
        })
        .eq('id', leadBonus.id)

      // Mark user's phone bonus as claimed
      await supabase
        .from('users')
        .update({ phone_bonus_claimed: true })
        .eq('id', casinoUser.id)

      console.log('[Claim Bonus] ✅ Custom lead bonus awarded')

      return NextResponse.json({
        success: true,
        bonus: {
          amount: leadBonus.bonus_amount,
          wageringRequired: leadBonus.bonus_amount * bonusOffer.wagering_requirement_multiplier,
          expiresAt: expiryDate.toISOString(),
          isCustomBonus: true
        }
      })
    }
  }

  // Fall back to standard $20 bonus
  console.log('[Claim Bonus] No custom bonus found, awarding standard bonus')
  const { data, error } = await supabase.rpc(
    'award_phone_verification_bonus',
    { p_auth_user_id: userId }
  )

  if (error) {
    console.error('[Claim Bonus] Error claiming standard bonus', { userId, error: error.message })
    return NextResponse.json(
      { error: 'Failed to claim bonus' },
      { status: 500 }
    )
  }

  // Check if the function returned an error
  if (data && !data.success) {
    return NextResponse.json(
      { error: data.error },
      { status: 400 }
    )
  }

  console.log('[Claim Bonus] ✅ Standard bonus awarded')

  return NextResponse.json({
    success: true,
    bonus: {
      amount: data.bonus_amount,
      wageringRequired: data.wagering_required,
      expiresAt: data.expires_at,
      isCustomBonus: false
    }
  })
})
