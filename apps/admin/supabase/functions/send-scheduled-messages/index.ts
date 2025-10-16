// Supabase Edge Function: Send Scheduled Messages
// Runs every 15 minutes to send approved outreach messages via Twilio SMS
// Messages must be approved by admins before sending

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('send-scheduled-messages')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

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

    logger.info('Starting scheduled message delivery')

    const results = {
      total_processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Get messages ready to send (approved, scheduled, within send window)
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

    const { data: messages, error: fetchError } = await supabaseClient
      .from('scheduled_outreach_messages')
      .select(`
        *,
        users:player_id (
          id,
          external_user_id,
          email,
          phone
        )
      `)
      .eq('status', 'scheduled')
      .eq('approval_status', 'approved')
      .lte('scheduled_send_time', now.toISOString())
      .is('sent_at', null)
      .limit(50) // Process max 50 messages per run

    if (fetchError) {
      throw new Error(`Failed to fetch messages: ${fetchError.message}`)
    }

    logger.info('Found messages ready to send', { count: messages?.length || 0 })

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No messages ready to send',
          results
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Process each message
    for (const message of messages) {
      results.total_processed++

      try {
        // Validate player has phone number
        if (!message.users?.phone) {
          logger.error('Player has no phone number', null, {
            player_id: message.player_id
          })
          await markMessageFailed(
            supabaseClient,
            message.id,
            'Player has no phone number'
          )
          results.failed++
          results.errors.push(`${message.users?.external_user_id}: No phone number`)
          continue
        }

        // Check if within send window
        const sendWindowStart = message.send_window_start || '09:00'
        const sendWindowEnd = message.send_window_end || '21:00'

        if (currentTime < sendWindowStart || currentTime > sendWindowEnd) {
          logger.debug('Skipping message - outside send window', {
            message_id: message.id,
            current_time: currentTime,
            window: `${sendWindowStart}-${sendWindowEnd}`
          })
          results.skipped++
          continue
        }

        // Get the message text (use edited version if exists)
        const messageText = message.edited_message || message.ai_generated_message

        // Send via Twilio
        const twilioResult = await sendTwilioSMS(
          message.users.phone,
          messageText,
          message.player_id
        )

        if (twilioResult.success) {
          // Mark as sent
          await markMessageSent(
            supabaseClient,
            message.id,
            twilioResult.sid,
            twilioResult.cost
          )
          results.sent++
          logger.info('Successfully sent message', {
            message_id: message.id,
            user_id: message.users.external_user_id
          })
        } else {
          // Mark as failed
          await markMessageFailed(
            supabaseClient,
            message.id,
            twilioResult.error || 'Unknown error'
          )
          results.failed++
          results.errors.push(`${message.users?.external_user_id}: ${twilioResult.error}`)
        }

      } catch (error) {
        logger.error('Error processing message', error, {
          message_id: message.id
        })
        await markMessageFailed(
          supabaseClient,
          message.id,
          error.message
        )
        results.failed++
        results.errors.push(`${message.users?.external_user_id}: ${error.message}`)
      }
    }

    logger.info('Scheduled message delivery complete', results)

    return new Response(
      JSON.stringify({
        message: 'Message delivery completed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    logger.error('Error in send-scheduled-messages function', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function sendTwilioSMS(
  toPhone: string,
  messageBody: string,
  playerId: string
): Promise<{ success: boolean; sid?: string; cost?: number; error?: string }> {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured')
    }

    // Format phone number (ensure E.164 format)
    const formattedPhone = toPhone.startsWith('+') ? toPhone : `+${toPhone}`

    // Create Twilio API request
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    const body = new URLSearchParams({
      To: formattedPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: messageBody,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Twilio API error')
    }

    return {
      success: true,
      sid: data.sid,
      cost: parseFloat(data.price) || 0,
    }

  } catch (error) {
    logger.error('Twilio SMS error', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

async function markMessageSent(
  supabase: any,
  messageId: string,
  twilioSid: string,
  cost: number
): Promise<void> {
  const { error } = await supabase
    .from('scheduled_outreach_messages')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      delivery_status: 'sent',
      sms_cost: cost,
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  if (error) {
    logger.error('Error marking message as sent', error, { message_id: messageId })
  }
}

async function markMessageFailed(
  supabase: any,
  messageId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('scheduled_outreach_messages')
    .update({
      status: 'failed',
      delivery_status: 'failed',
      delivery_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  if (error) {
    logger.error('Error marking message as failed', error, { message_id: messageId })
  }
}
