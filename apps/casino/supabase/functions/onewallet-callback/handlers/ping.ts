import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SuccessResponse, OneWalletResponse } from '../utils/responses.ts'
import { logInfo } from '../utils/logger.ts'

/**
 * Handles 'ping' action - health check from Fundist
 *
 * Request fields:
 * - c_action: "ping"
 * - c_hashcode: HMAC signature
 *
 * Response:
 * - i_result: 0 (success)
 * - c_text: "pong"
 */
export async function handlePing(
  requestBody: any,
  supabase: SupabaseClient
): Promise<OneWalletResponse> {
  logInfo('Handling ping request')

  return SuccessResponse({
    c_text: 'pong'
  })
}
