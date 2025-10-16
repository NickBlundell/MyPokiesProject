import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

export interface CallbackLog {
  request_type: string
  user_id?: string | null
  tid?: string | null
  request_body: any
  response_body: any
  response_code: number
  hmac_valid: boolean
  ip_address: string
  processing_time_ms: number
  error_message?: string
}

/**
 * Logs API callback to the database for audit trail
 */
export async function logCallback(log: CallbackLog): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from('callback_logs')
      .insert({
        request_type: log.request_type,
        user_id: log.user_id,
        tid: log.tid,
        request_body: log.request_body,
        response_body: log.response_body,
        response_code: log.response_code,
        hmac_valid: log.hmac_valid,
        ip_address: log.ip_address,
        processing_time_ms: log.processing_time_ms,
        error_message: log.error_message
      })

    if (error) {
      console.error(JSON.stringify({
        level: 'ERROR',
        function: 'onewallet-callback',
        message: 'Failed to log callback to database',
        error: { message: error.message }
      }))
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      function: 'onewallet-callback',
      message: 'Error in logCallback',
      error: error instanceof Error ? { message: error.message } : error
    }))
  }
}

/**
 * Structured logging helper for onewallet-callback
 */
export function logInfo(message: string, context?: Record<string, any>): void {
  console.log(JSON.stringify({
    level: 'INFO',
    function: 'onewallet-callback',
    message,
    ...context
  }))
}

export function logError(message: string, error?: Error | unknown, context?: Record<string, any>): void {
  console.error(JSON.stringify({
    level: 'ERROR',
    function: 'onewallet-callback',
    message,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error,
    ...context
  }))
}

export function logWarn(message: string, context?: Record<string, any>): void {
  console.warn(JSON.stringify({
    level: 'WARN',
    function: 'onewallet-callback',
    message,
    ...context
  }))
}

export function logDebug(message: string, context?: Record<string, any>): void {
  console.log(JSON.stringify({
    level: 'DEBUG',
    function: 'onewallet-callback',
    message,
    ...context
  }))
}
