import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RollbackResponse, ErrorResponse, OneWalletResponse } from '../utils/responses.ts'
import { logInfo, logError, logWarn } from '../utils/logger.ts'

/**
 * Handles 'rollback' action - reverse a previous transaction
 *
 * Note: According to Fundist API docs, rollbacks are implemented as credits
 * with the i_rollback field set to the original TID. This handler exists
 * for backward compatibility but typically credits with i_rollback are used.
 *
 * Request fields:
 * - c_action: "rollback"
 * - c_login: User ID
 * - c_currency: Currency code
 * - c_tid: Transaction ID to rollback
 * - c_hashcode: HMAC signature
 *
 * Response:
 * - i_result: 0 (success) or error code
 * - n_balance: New balance after rollback
 * - c_tid: Transaction ID
 */
export async function handleRollback(
  requestBody: any,
  supabase: SupabaseClient
): Promise<OneWalletResponse> {
  const { c_login, c_currency, c_tid } = requestBody

  logInfo('Handling rollback request', { c_login, c_currency, c_tid })

  try {
    // Find the original transaction to rollback
    const { data: originalTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('tid', c_tid)
      .single()

    if (txError || !originalTx) {
      logError('Original transaction not found', txError, { c_tid })
      return ErrorResponse('Transaction not found', 2)
    }

    // Check if already rolled back
    const { data: existingRollback } = await supabase
      .from('transactions')
      .select('balance_after')
      .eq('rollback_tid', c_tid)
      .single()

    if (existingRollback) {
      logInfo('Transaction already rolled back', { c_tid })
      return RollbackResponse(
        parseFloat(existingRollback.balance_after),
        c_tid
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

    // Get current balance and version
    const { data: balanceRecord, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance, version')
      .eq('user_id', userId)
      .eq('currency', c_currency)
      .single()

    if (balanceError) {
      logError('Error getting balance', balanceError)
      return ErrorResponse('Balance lookup failed', 2)
    }

    const currentBalance = parseFloat(balanceRecord.balance)
    const currentVersion = balanceRecord.version

    // Calculate rollback amount (reverse the original transaction)
    let rollbackAmount: number
    if (originalTx.type === 'debit') {
      // Rollback a debit = credit back the amount
      rollbackAmount = Math.abs(parseFloat(originalTx.amount))
    } else if (originalTx.type === 'credit') {
      // Rollback a credit = debit the amount
      rollbackAmount = -Math.abs(parseFloat(originalTx.amount))
    } else {
      logError('Cannot rollback transaction type', undefined, { type: originalTx.type })
      return ErrorResponse('Invalid transaction type for rollback', 2)
    }

    // Check sufficient funds for debit rollbacks
    if (rollbackAmount < 0 && currentBalance < Math.abs(rollbackAmount)) {
      logWarn('Insufficient funds for rollback', {
        c_login,
        balance: currentBalance,
        required: Math.abs(rollbackAmount)
      })
      return ErrorResponse('Insufficient funds', 3)
    }

    // Update balance
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_balance', {
        p_user_id: userId,
        p_currency: c_currency,
        p_amount: rollbackAmount,
        p_expected_version: currentVersion
      })

    if (updateError) {
      logError('Error updating balance', updateError)
      return ErrorResponse('Balance update failed', 2)
    }

    const newBalance = updateResult[0].new_balance

    // Create rollback transaction record
    const { error: rollbackError } = await supabase
      .from('transactions')
      .insert({
        tid: `rollback_${c_tid}_${Date.now()}`,
        user_id: userId,
        currency: c_currency,
        type: 'rollback',
        subtype: 'rollback',
        amount: rollbackAmount,
        balance_before: currentBalance,
        balance_after: newBalance,
        game_round_id: originalTx.game_round_id,
        rollback_tid: c_tid
      })

    if (rollbackError) {
      logError('Error creating rollback transaction', rollbackError)
      return ErrorResponse('Rollback transaction creation failed', 2)
    }

    // Update game round status
    if (originalTx.game_round_id) {
      await supabase
        .from('game_rounds')
        .update({ status: 'rolled_back' })
        .eq('id', originalTx.game_round_id)
    }

    logInfo('Rollback successful', {
      original_tid: c_tid,
      rollback_amount: rollbackAmount,
      balance_before: currentBalance,
      balance_after: newBalance
    })

    return RollbackResponse(parseFloat(newBalance), c_tid)

  } catch (error) {
    logError('Error in handleRollback', error)
    return ErrorResponse('Internal error', 2)
  }
}
