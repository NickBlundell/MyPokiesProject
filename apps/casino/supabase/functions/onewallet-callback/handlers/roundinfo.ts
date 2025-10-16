import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SuccessResponse, ErrorResponse, OneWalletResponse } from '../utils/responses.ts'
import { logInfo, logError } from '../utils/logger.ts'

/**
 * Handles 'roundinfo' action - get game round information
 *
 * Request fields:
 * - c_action: "roundinfo"
 * - c_login: User ID
 * - c_gameround: Game round ID
 * - c_hashcode: HMAC signature
 *
 * Response:
 * - i_result: 0 (success) or error code
 * - n_totalbet: Total bet amount for the round
 * - n_totalwin: Total win amount for the round
 * - c_currency: Currency code
 */
export async function handleRoundInfo(
  requestBody: any,
  supabase: SupabaseClient
): Promise<OneWalletResponse> {
  const { c_login, c_gameround } = requestBody

  logInfo('Handling roundinfo request', { c_login, c_gameround })

  try {
    // Get or create user
    const { data: userId, error: userError } = await supabase
      .rpc('get_or_create_user', {
        p_external_user_id: c_login
      })

    if (userError) {
      logError('Error getting/creating user', userError)
      return ErrorResponse('User lookup failed', 2)
    }

    // Get round information
    const { data: roundData, error: roundError } = await supabase
      .from('game_rounds')
      .select('total_bet, total_win, currency, status')
      .eq('user_id', userId)
      .eq('game_round_id', c_gameround)
      .single()

    if (roundError || !roundData) {
      logError('Round not found', roundError)
      return ErrorResponse('Round not found', 2)
    }

    return SuccessResponse({
      n_totalbet: parseFloat(roundData.total_bet) || 0,
      n_totalwin: parseFloat(roundData.total_win) || 0,
      c_currency: roundData.currency,
      c_status: roundData.status
    })

  } catch (error) {
    logError('Error in handleRoundInfo', error)
    return ErrorResponse('Internal error', 2)
  }
}
