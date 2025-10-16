import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCasinoUser } from '@/lib/api/get-casino-user'

export async function POST(request: Request) {
  try {
    // PERFORMANCE FIX: Use shared helper to get casino user (eliminates redundant lookups)
    const result = await getCasinoUser()
    if ('error' in result) {
      return result.error
    }

    const { bonus_offer_id } = await request.json()

    if (!bonus_offer_id) {
      return NextResponse.json(
        { error: 'Bonus offer ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the bonus offer details
    const { data: bonusOffer, error: offerError } = await supabase
      .from('bonus_offers')
      .select('*')
      .eq('id', bonus_offer_id)
      .eq('active', true)
      .maybeSingle()

    if (offerError || !bonusOffer) {
      return NextResponse.json(
        { error: 'Bonus offer not found' },
        { status: 404 }
      )
    }

    // Verify it's a no-deposit bonus
    if (bonusOffer.bonus_type !== 'no_deposit') {
      return NextResponse.json(
        { error: 'This bonus requires a deposit' },
        { status: 400 }
      )
    }

    // Check if user already claimed this bonus
    const { data: existingBonus } = await supabase
      .from('player_bonuses')
      .select('id')
      .eq('user_id', result.userId)
      .eq('bonus_offer_id', bonus_offer_id)
      .maybeSingle()

    if (existingBonus) {
      return NextResponse.json(
        { error: 'You have already claimed this bonus' },
        { status: 400 }
      )
    }

    // Create the player bonus record
    const { data: playerBonus, error: bonusError } = await supabase
      .from('player_bonuses')
      .insert({
        user_id: result.userId,
        bonus_offer_id: bonus_offer_id,
        bonus_amount: bonusOffer.fixed_bonus_amount || bonusOffer.max_bonus_amount,
        wagering_requirement_total: (bonusOffer.fixed_bonus_amount || bonusOffer.max_bonus_amount || 0) * bonusOffer.wagering_requirement_multiplier,
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (bonusError) {
      console.error('Error creating player bonus', { userId: result.userId, bonusOfferId: bonus_offer_id, error: bonusError.message })
      return NextResponse.json(
        { error: 'Failed to claim bonus' },
        { status: 500 }
      )
    }

    // Update user's bonus balance
    const bonusAmount = bonusOffer.fixed_bonus_amount || bonusOffer.max_bonus_amount || 0

    // First get current balance
    const { data: currentBalance } = await supabase
      .from('user_balances')
      .select('bonus_balance')
      .eq('user_id', result.userId)
      .eq('currency', 'USD')
      .maybeSingle()

    const newBonusBalance = (currentBalance?.bonus_balance || 0) + bonusAmount

    const { error: balanceError } = await supabase
      .from('user_balances')
      .update({
        bonus_balance: newBonusBalance
      })
      .eq('user_id', result.userId)
      .eq('currency', 'USD')

    if (balanceError) {
      console.error('Error updating balance', { userId: result.userId, bonusAmount, error: balanceError.message })
      // Rollback player_bonus
      await supabase
        .from('player_bonuses')
        .delete()
        .eq('id', playerBonus.id)

      return NextResponse.json(
        { error: 'Failed to update balance' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bonus: playerBonus,
      amount: bonusAmount
    })

  } catch (error) {
    console.error('Error claiming no-deposit bonus', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
