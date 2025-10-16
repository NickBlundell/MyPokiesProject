import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateHMAC } from './utils/hmac.ts'
import { logCallback, logWarn, logError } from './utils/logger.ts'
import { ErrorResponse, SuccessResponse } from './utils/responses.ts'
import { handlePing } from './handlers/ping.ts'
import { handleBalance } from './handlers/balance.ts'
import { handleDebit } from './handlers/debit.ts'
import { handleCredit } from './handlers/credit.ts'
import { handleRollback } from './handlers/rollback.ts'
import { handleRoundInfo } from './handlers/roundinfo.ts'
import { handlePromotion } from './handlers/promotion.ts'
import {
  checkRateLimit,
  getClientIP,
  createRateLimitResponse,
  logRateLimit,
  addRateLimitHeaders
} from '../_shared/rate-limit.ts'

const ALLOWED_IPS = Deno.env.get('FUNDIST_ALLOWED_IPS')?.split(',') || []
const HMAC_SECRET = Deno.env.get('FUNDIST_HMAC_SECRET') || ''

serve(async (req: Request) => {
  const startTime = Date.now()

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify(ErrorResponse('Method not allowed', 2)), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get client IP
    const clientIP = getClientIP(req)

    // Rate limiting (100 requests per minute per IP)
    const rateLimitResult = await checkRateLimit(clientIP, {
      requests: 100,
      window: '1 m',
      prefix: 'ratelimit:onewallet',
      analytics: true
    })

    // Log rate limit check
    logRateLimit({
      identifier: clientIP,
      result: rateLimitResult,
      endpoint: 'onewallet-callback',
      allowed: rateLimitResult.success
    })

    // If rate limit exceeded, return error response
    if (!rateLimitResult.success) {
      logWarn('Rate limit exceeded', {
        client_ip: clientIP,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        reset: new Date(rateLimitResult.reset).toISOString()
      })

      // Return JSON error instead of TwiML (this is for game callbacks, not SMS)
      return createRateLimitResponse(
        rateLimitResult,
        'Rate limit exceeded. Too many requests.',
        {
          status: 200, // Return 200 to prevent Fundist retries
          contentType: 'application/json',
          body: JSON.stringify(ErrorResponse('Rate limit exceeded', 2))
        }
      )
    }

    // IP whitelist validation (if configured)
    if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(clientIP)) {
      logWarn('Blocked request from unauthorized IP', { client_ip: clientIP })
      return new Response(JSON.stringify(ErrorResponse('Unauthorized IP', 3)), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const requestBody = await req.json()
    const { c_action } = requestBody

    // Validate HMAC signature
    const isHMACValid = validateHMAC(requestBody, HMAC_SECRET)

    if (!isHMACValid) {
      logError('HMAC validation failed', null, { action: c_action })
      await logCallback({
        request_type: c_action || 'unknown',
        request_body: requestBody,
        response_body: ErrorResponse('Invalid HMAC signature', 1),
        response_code: 401,
        hmac_valid: false,
        ip_address: clientIP,
        processing_time_ms: Date.now() - startTime
      })

      return new Response(JSON.stringify(ErrorResponse('Invalid HMAC signature', 1)), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Route to appropriate handler based on action
    let response

    switch (c_action) {
      case 'ping':
        response = await handlePing(requestBody, supabase)
        break
      case 'balance':
        response = await handleBalance(requestBody, supabase)
        break
      case 'debit':
        response = await handleDebit(requestBody, supabase)
        break
      case 'credit':
        response = await handleCredit(requestBody, supabase)
        break
      case 'rollback':
        response = await handleRollback(requestBody, supabase)
        break
      case 'roundinfo':
        response = await handleRoundInfo(requestBody, supabase)
        break
      case 'promotion':
        response = await handlePromotion(requestBody, supabase)
        break
      default:
        response = ErrorResponse(`Unknown action: ${c_action}`, 2)
    }

    // Log the callback
    await logCallback({
      request_type: c_action || 'unknown',
      user_id: requestBody.c_login || null,
      tid: requestBody.c_tid || null,
      request_body: requestBody,
      response_body: response,
      response_code: response.i_result === 0 ? 200 : 400,
      hmac_valid: true,
      ip_address: clientIP,
      processing_time_ms: Date.now() - startTime
    })

    // Return response with rate limit headers
    // CRITICAL: Only HTTP 200 indicates success to Fundist
    const httpStatus = response.i_result === 0 ? 200 : 200 // Always return 200, error in body

    const successResponse = new Response(JSON.stringify(response), {
      status: httpStatus,
      headers: { 'Content-Type': 'application/json' }
    })

    // Add rate limit headers to response
    return addRateLimitHeaders(successResponse, rateLimitResult)

  } catch (error) {
    logError('Unhandled error in OneWallet callback', error)

    // Log error
    try {
      await logCallback({
        request_type: 'error',
        request_body: {},
        response_body: ErrorResponse('Internal server error', 2),
        response_code: 500,
        hmac_valid: false,
        ip_address: 'unknown',
        processing_time_ms: Date.now() - startTime,
        error_message: error.message
      })
    } catch (loggingError) {
      logError('Failed to log error to database', loggingError)
    }

    return new Response(JSON.stringify(ErrorResponse('Internal server error', 2)), {
      status: 200, // Still return 200 to prevent retries
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
