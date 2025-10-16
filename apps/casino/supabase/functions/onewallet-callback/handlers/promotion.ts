import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TransactionResponse, ErrorResponse, OneWalletResponse } from '../utils/responses.ts'
import { logInfo, logError } from '../utils/logger.ts'

/**
 * Handles 'promotion' action - award promotion/bonus win
 *
 * Request fields:
 * - c_action: "promotion"
 * - c_login: User ID
 * - c_currency: Currency code
 * - n_amount: Promotion amount
 * - c_tid: Unique transaction ID
 * - i_bonusid: Bonus/promotion ID
 * - c_bonusdesc: Bonus description
 * - c_hashcode: HMAC signature
 *
 * Response:
 * - i_result: 0 (success) or error code
 * - n_balance: New balance after promotion credit
 * - c_tid: Transaction ID (echoed back)
 */
export async function handlePromotion(
  requestBody: any,
  supabase: SupabaseClient
): Promise<OneWalletResponse> {
  const {
    c_login,
    c_currency,
    n_amount,
    c_tid,
    i_bonusid,
    c_bonusdesc
  } = requestBody

  logInfo('Handling promotion request', {
    c_login,
    c_currency,
    n_amount,
    c_tid,
    i_bonusid
  })

  try {
    // Check for duplicate TID (idempotency)
    const { data: existingTx, error: txCheckError } = await supabase
      .from('transactions')
      .select('balance_after')
      .eq('tid', c_tid)
      .single()

    if (existingTx && !txCheckError) {
      logInfo('Duplicate TID detected, returning previous response', { c_tid })
      return TransactionResponse(
        parseFloat(existingTx.balance_after),
        c_tid,
        c_currency
      )
    }

    // Get or create user
    const { data: userId, error: userError } = await supabase
      .rpc('get_or_create_user', {
        p_external_user_id: c_login
      })

    if (userError) {
      logError('Error getting/creating user', userError)
      return ErrorResponse('User lookup failed', 2)
    }

    // Get or create promotion
    const { data: promotionData, error: promotionError } = await supabase
      .from('promotions')
      .upsert({
        bonus_id: i_bonusid,
        bonus_desc: c_bonusdesc,
        promotion_type: 'bonus',
        active: true
      }, {
        onConflict: 'bonus_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (promotionError) {
      // Try to get existing promotion
      const { data: existingPromo } = await supabase
        .from('promotions')
        .select('id')
        .eq('bonus_id', i_bonusid)
        .single()

      if (!existingPromo) {
        logError('Error creating/updating promotion', promotionError)
        return ErrorResponse('Failed to create promotion', 2)
      }
    }

    const promotionId = promotionData?.id

    // Get current balance and version
    const { data: balanceRecord, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance, version')
      .eq('user_id', userId)
      .eq('currency', c_currency)
      .single()

    if (balanceError && balanceError.code !== 'PGRST116') {
      logError('Error getting balance', balanceError)
      return ErrorResponse('Balance lookup failed', 2)
    }

    const currentBalance = balanceRecord ? parseFloat(balanceRecord.balance) : 0
    const currentVersion = balanceRecord?.version || 0

    // Update balance
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_balance', {
        p_user_id: userId,
        p_currency: c_currency,
        p_amount: parseFloat(n_amount),
        p_expected_version: currentVersion
      })

    if (updateError) {
      logError('Error updating balance', updateError)
      return ErrorResponse('Balance update failed', 2)
    }

    const newBalance = updateResult[0].new_balance

    // Create transaction record
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert({
        tid: c_tid,
        user_id: userId,
        currency: c_currency,
        type: 'promotion_win',
        subtype: 'promotion',
        amount: parseFloat(n_amount),
        balance_before: currentBalance,
        balance_after: newBalance,
        promotion_id: promotionId
      })
      .select()
      .single()

    if (txError) {
      logError('Error creating transaction', txError)
      return ErrorResponse('Transaction creation failed', 2)
    }

    // Record promotion win
    await supabase
      .from('promotion_wins')
      .insert({
        promotion_id: promotionId,
        transaction_id: txData.id,
        user_id: userId,
        amount: parseFloat(n_amount)
      })

    logInfo('Promotion successful', {
      c_tid,
      i_bonusid,
      balance_before: currentBalance,
      balance_after: newBalance
    })

    return TransactionResponse(parseFloat(newBalance), c_tid, c_currency)

  } catch (error) {
    logError('Error in handlePromotion', error)
    return ErrorResponse('Internal error', 2)
  }
}
