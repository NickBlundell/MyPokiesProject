import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TransactionResponse, ErrorResponse, OneWalletResponse } from '../utils/responses.ts'
import { logInfo, logError, logWarn, logDebug } from '../utils/logger.ts'

/**
 * Handles 'debit' action - withdraw funds for bet
 *
 * This handler uses the create_transaction_idempotent RPC function which provides:
 * - Full idempotency: duplicate TIDs return existing transaction without error
 * - Race condition handling: catches unique violations and returns existing data
 * - Row-level locking (SELECT FOR UPDATE) to prevent concurrent modifications
 * - Optimistic locking via version field for additional safety
 * - Atomic balance update with transaction record creation
 * - Safe for Fundist OneWallet retry scenarios
 *
 * Request fields:
 * - c_action: "debit"
 * - c_login: User ID
 * - c_currency: Currency code
 * - n_amount: Amount to debit
 * - c_tid: Unique transaction ID
 * - i_gameid: Game ID
 * - i_actionid: Action ID
 * - c_gameround: Game round ID
 * - c_gamedesc: Game description
 * - c_hashcode: HMAC signature
 *
 * Response:
 * - i_result: 0 (success), 2 (error), or 3 (insufficient funds)
 * - n_balance: New balance after debit
 * - c_tid: Transaction ID (echoed back)
 */
export async function handleDebit(
  requestBody: any,
  supabase: SupabaseClient
): Promise<OneWalletResponse> {
  const {
    c_login,
    c_currency,
    n_amount,
    c_tid,
    i_gameid,
    i_actionid,
    c_gameround,
    c_gamedesc
  } = requestBody

  logDebug('Handling debit request', {
    user: c_login,
    currency: c_currency,
    amount: n_amount,
    tid: c_tid,
    game_id: i_gameid
  })

  try {
    // Check for duplicate TID (idempotency)
    const { data: existingTx, error: txCheckError } = await supabase
      .from('transactions')
      .select('*, user_balances!inner(balance)')
      .eq('tid', c_tid)
      .single()

    if (existingTx && !txCheckError) {
      logDebug('Duplicate TID detected, returning previous response', { tid: c_tid })
      // Return the previous balance from that transaction
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
      logError('Error getting/creating user', userError, { user: c_login })
      return ErrorResponse('User lookup failed', 2)
    }

    // Check for duplicate game action
    const { data: existingAction, error: actionCheckError } = await supabase
      .from('round_actions')
      .select('transaction:transactions!inner(balance_after)')
      .eq('game_id', i_gameid)
      .eq('action_id', i_actionid)
      .single()

    if (existingAction && !actionCheckError) {
      logDebug('Duplicate action detected', { game_id: i_gameid, action_id: i_actionid })
      return TransactionResponse(
        parseFloat(existingAction.transaction.balance_after),
        c_tid,
        c_currency
      )
    }

    // Create or update game round first (before balance transaction)
    const { data: roundData, error: roundError } = await supabase
      .from('game_rounds')
      .upsert({
        game_round_id: c_gameround,
        user_id: userId,
        game_desc: c_gamedesc,
        currency: c_currency,
        total_bet: parseFloat(n_amount)
      }, {
        onConflict: 'user_id,game_round_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (roundError) {
      // Try to get existing round
      const { data: existingRound } = await supabase
        .from('game_rounds')
        .select('id')
        .eq('user_id', userId)
        .eq('game_round_id', c_gameround)
        .single()

      if (!existingRound) {
        logError('Error creating/updating game round', roundError, { game_round: c_gameround })
        return ErrorResponse('Failed to create game round', 2)
      }
    }

    const roundId = roundData?.id || roundData?.[0]?.id

    // Use idempotent transaction creation with race condition handling
    const { data: txResult, error: txError } = await supabase
      .rpc('create_transaction_idempotent', {
        p_user_id: userId,
        p_currency: c_currency,
        p_amount: -parseFloat(n_amount), // Negative for debit
        p_type: 'debit',
        p_subtype: 'bet',
        p_tid: c_tid,
        p_game_round_id: roundId,
        p_action_id: i_actionid,
        p_game_id: i_gameid,
        p_rollback_tid: null,
        p_promotion_id: null
      })

    if (txError || !txResult || txResult.length === 0) {
      logError('Error executing balance transaction', txError, { tid: c_tid })
      return ErrorResponse('Balance transaction failed', 2)
    }

    const result = txResult[0]

    // Check if transaction was successful
    if (!result.success) {
      // Handle specific error cases
      if (result.error_message?.includes('Insufficient funds')) {
        logWarn('Insufficient funds', {
          user: c_login,
          requested: n_amount
        })
        return ErrorResponse('Insufficient funds', 3)
      } else {
        logError('Balance transaction failed', { error: result.error_message, tid: c_tid })
        return ErrorResponse(result.error_message || 'Balance update failed', 2)
      }
    }

    const newBalance = result.new_balance
    const txData = { id: result.transaction_id }

    // Log if this was a duplicate (idempotent response)
    if (result.was_duplicate) {
      logInfo('Duplicate transaction detected (idempotent)', {
        tid: c_tid,
        transaction_id: result.transaction_id,
        balance: newBalance
      })
    } else {
      // Only create round action for new transactions
      await supabase
        .from('round_actions')
        .insert({
          round_id: roundId,
          transaction_id: txData.id,
          action_id: i_actionid,
          game_id: i_gameid,
          action_type: 'bet',
          amount: parseFloat(n_amount)
        })

      logInfo('Debit successful (new transaction)', {
        tid: c_tid,
        transaction_id: result.transaction_id,
        balance: newBalance,
        amount: n_amount
      })
    }

    return TransactionResponse(parseFloat(newBalance), c_tid, c_currency)

  } catch (error) {
    logError('Error in handleDebit', error, { tid: c_tid })
    return ErrorResponse('Internal error', 2)
  }
}
