// Supabase Edge Function: Twilio Inbound Webhook
// Receives inbound SMS messages from Twilio and queues AI auto-replies
// with random delays and message accumulation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'
import {
  checkRateLimit,
  logRateLimit,
  addRateLimitHeaders
} from '../_shared/rate-limit.ts'

const logger = createLogger('twilio-inbound-webhook')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    logger.info('Received Twilio webhook')

    // Parse Twilio webhook body (application/x-www-form-urlencoded)
    const formData = await req.formData()

    const twilioData = {
      messageSid: formData.get('MessageSid'),
      accountSid: formData.get('AccountSid'),
      from: formData.get('From'), // Player's phone number
      to: formData.get('To'), // Our Twilio number
      body: formData.get('Body'), // Message content
      numMedia: formData.get('NumMedia'),
      messagingServiceSid: formData.get('MessagingServiceSid'),
      smsStatus: formData.get('SmsStatus'),
    }

    logger.debug('Twilio message data', {
      from: twilioData.from,
      to: twilioData.to,
      body_length: twilioData.body?.length,
      sid: twilioData.messageSid
    })

    // Validate required fields
    if (!twilioData.from || !twilioData.body) {
      logger.error('Missing required fields from Twilio webhook')
      return new Response('Missing required fields', {
        status: 400,
        headers: corsHeaders
      })
    }

    // Normalize phone number
    const phoneNumber = twilioData.from as string

    // Rate limiting by phone number (10 SMS per minute to prevent spam)
    const rateLimitResult = await checkRateLimit(phoneNumber, {
      requests: 10,
      window: '1 m',
      prefix: 'ratelimit:sms',
      analytics: true
    })

    // Log rate limit check
    logRateLimit({
      identifier: phoneNumber,
      result: rateLimitResult,
      endpoint: 'twilio-inbound-webhook',
      allowed: rateLimitResult.success
    })

    // If rate limit exceeded, return TwiML response (not an error to prevent Twilio retries)
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for phone number', {
        phone: phoneNumber,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        reset: new Date(rateLimitResult.reset).toISOString()
      })

      // Return TwiML with auto-reply message informing user
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Rate limit exceeded. Please wait before sending more messages.</Message>
</Response>`

      const response = new Response(twiml, {
        status: 200, // Always 200 to prevent Twilio retries
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml',
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        }
      })

      return response
    }

    // Check if phone number is opted out
    const { data: optOutCheck } = await supabaseClient
      .from('sms_opt_outs')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('opted_back_in', false)
      .single()

    if (optOutCheck) {
      logger.info('Phone number is opted out, ignoring message', {
        phone: phoneNumber
      })
      // Still return 200 to Twilio
      return new Response('OK - opted out', {
        status: 200,
        headers: corsHeaders
      })
    }

    // Check if message contains STOP keyword (opt-out)
    const bodyLower = twilioData.body?.toLowerCase() || ''
    if (bodyLower.includes('stop') || bodyLower.includes('unsubscribe')) {
      logger.info('Opt-out keyword detected', { phone: phoneNumber })

      // Add to opt-out list
      await supabaseClient
        .from('sms_opt_outs')
        .insert({
          phone_number: phoneNumber,
          opt_out_method: 'sms_reply',
          reason: 'STOP keyword',
        })

      // Send confirmation (required by law)
      // In production, you'd send via Twilio here
      logger.info('Would send opt-out confirmation', { phone: phoneNumber })

      return new Response('OK - opted out', {
        status: 200,
        headers: corsHeaders
      })
    }

    // Look up player by phone number
    const { data: player } = await supabaseClient
      .from('users')
      .select('id, external_user_id, email, phone')
      .eq('phone', phoneNumber)
      .single()

    const playerId = player?.id || null

    // Get or create conversation
    const { data: conversationId, error: convError } = await supabaseClient
      .rpc('get_or_create_conversation', {
        p_phone_number: phoneNumber,
        p_player_id: playerId
      })

    if (convError) {
      logger.error('Error getting/creating conversation', convError)
      throw new Error('Failed to get conversation')
    }

    logger.debug('Conversation ID', { conversation_id: conversationId })

    // Store inbound message
    const { data: messageRecord, error: messageError } = await supabaseClient
      .from('sms_messages')
      .insert({
        phone_number: phoneNumber,
        message_content: twilioData.body,
        direction: 'inbound',
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        provider: 'twilio',
        provider_message_id: twilioData.messageSid,
        provider_status: twilioData.smsStatus,
        conversation_id: conversationId,
        ai_generated: false
      })
      .select()
      .single()

    if (messageError) {
      logger.error('Error storing message', messageError)
      throw new Error('Failed to store message')
    }

    logger.debug('Stored message', { message_id: messageRecord.id })

    // Update conversation's last message timestamp
    await supabaseClient
      .from('sms_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    // Create or update pending auto-reply
    const { data: pendingReplyId, error: replyError } = await supabaseClient
      .rpc('upsert_pending_auto_reply', {
        p_conversation_id: conversationId,
        p_player_id: playerId,
        p_phone_number: phoneNumber,
        p_message_id: messageRecord.id
      })

    if (replyError) {
      logger.error('Error creating/updating pending reply', replyError)
      throw new Error('Failed to queue auto-reply')
    }

    logger.debug('Pending auto-reply created', { pending_reply_id: pendingReplyId })

    // Get the pending reply details for logging
    const { data: pendingReply } = await supabaseClient
      .from('pending_ai_auto_replies')
      .select('*')
      .eq('id', pendingReplyId)
      .single()

    logger.info('Auto-reply scheduled', {
      id: pendingReplyId,
      scheduled_time: pendingReply?.scheduled_reply_time,
      delay_minutes: pendingReply?.delay_minutes,
      message_count: pendingReply?.message_count
    })

    // Return TwiML response (empty for now, just acknowledge)
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

    const successResponse = new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    })

    // Add rate limit headers to response
    return addRateLimitHeaders(successResponse, rateLimitResult)

  } catch (error) {
    logger.error('Error in twilio-inbound-webhook', error)

    // Still return 200 to Twilio to prevent retries
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    })
  }
})
