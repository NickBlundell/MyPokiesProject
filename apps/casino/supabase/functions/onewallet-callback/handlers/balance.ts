import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { BalanceResponse, ErrorResponse, OneWalletResponse } from '../utils/responses.ts'
import { logError, logDebug } from '../utils/logger.ts'

/**
 * Handles 'balance' action - get user balance
 *
 * Request fields:
 * - c_action: "balance"
 * - c_login: User ID
 * - c_currency: Currency code (ISO 4217)
 * - c_hashcode: HMAC signature
 *
 * Response:
 * - i_result: 0 (success) or error code
 * - n_balance: Current balance
 * - c_currency: Currency code
 */
export async function handleBalance(
  requestBody: any,
  supabase: SupabaseClient
): Promise<OneWalletResponse> {
  const { c_login, c_currency } = requestBody

  logDebug('Handling balance request', { user: c_login, currency: c_currency })

  try {
    // Get or create user
    const { data: userData, error: userError } = await supabase
      .rpc('get_or_create_user', {
        p_external_user_id: c_login
      })

    if (userError) {
      logError('Error getting/creating user', userError, { user: c_login })
      return ErrorResponse('User lookup failed', 2)
    }

    const userId = userData

    // Get balance
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('get_user_balance', {
        p_user_id: userId,
        p_currency: c_currency
      })

    if (balanceError) {
      logError('Error getting balance', balanceError, { user_id: userId })
      return ErrorResponse('Balance lookup failed', 2)
    }

    const balance = balanceData || 0

    return BalanceResponse(parseFloat(balance), c_currency)

  } catch (error) {
    logError('Error in handleBalance', error, { user: c_login })
    return ErrorResponse('Internal error', 2)
  }
}
