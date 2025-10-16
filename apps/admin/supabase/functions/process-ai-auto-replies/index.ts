// Supabase Edge Function: Process AI Auto-Replies
// Runs every minute to process pending AI auto-replies
// Generates contextual AI responses considering accumulated messages and promotions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('process-ai-auto-replies')

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

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    logger.info('Starting AI auto-reply processing')

    const results = {
      total_processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Get pending auto-replies that are ready to be sent
    const { data: pendingReplies, error: fetchError } = await supabaseClient
      .from('pending_ai_auto_replies')
      .select(`
        *,
        sms_conversations!inner (
          id,
          phone_number,
          player_id,
          ai_persona,
          conversation_goal,
          player_context
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_reply_time', new Date().toISOString())
      .limit(20) // Process max 20 at a time

    if (fetchError) {
      throw new Error(`Failed to fetch pending replies: ${fetchError.message}`)
    }

    logger.info('Found pending auto-replies ready to send', { count: pendingReplies?.length || 0 })

    if (!pendingReplies || pendingReplies.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No pending auto-replies ready to send',
          results
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Process each pending reply
    for (const pendingReply of pendingReplies) {
      results.total_processed++

      try {
        // Mark as processing
        await supabaseClient
          .from('pending_ai_auto_replies')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', pendingReply.id)

        // Get accumulated messages
        const { data: accumulatedMessages } = await supabaseClient
          .from('sms_messages')
          .select('*')
          .in('id', pendingReply.accumulated_message_ids)
          .eq('direction', 'inbound')
          .order('created_at', { ascending: true })

        if (!accumulatedMessages || accumulatedMessages.length === 0) {
          logger.error('No accumulated messages found for pending reply', null, {
            pending_reply_id: pendingReply.id
          })
          await markAsFailed(supabaseClient, pendingReply.id, 'No messages found')
          results.failed++
          continue
        }

        // Get conversation history (last 10 messages before these new ones)
        // SECURITY FIX: Use parameterized query instead of string interpolation to prevent SQL injection
        const { data: conversationHistory } = await supabaseClient
          .from('sms_messages')
          .select('*')
          .eq('conversation_id', pendingReply.conversation_id)
          .not('id', 'in', pendingReply.accumulated_message_ids)
          .order('created_at', { ascending: false })
          .limit(10)

        // Get player promotion context
        let promotionContext: any = { active_bonuses: [], available_offers: [] }
        if (pendingReply.player_id) {
          const { data: promoData } = await supabaseClient
            .rpc('get_player_promotion_context', { p_player_id: pendingReply.player_id })

          if (promoData) {
            promotionContext = promoData
          }
        }

        // Get AI persona configuration
        const { data: persona } = await supabaseClient
          .from('ai_personas')
          .select('*')
          .eq('name', pendingReply.sms_conversations.ai_persona || 'friendly_casino_host')
          .single()

        // Build AI prompt
        const systemPrompt = buildSystemPrompt(persona, promotionContext)
        const messageHistory = buildMessageHistory(conversationHistory?.reverse() || [], accumulatedMessages)

        // Generate AI response
        const aiMessage = await generateAIResponse(
          anthropic,
          systemPrompt,
          messageHistory,
          persona
        )

        logger.debug('Generated AI response', {
          message_length: aiMessage.length,
          pending_reply_id: pendingReply.id
        })

        // SECURITY FIX: Sanitize AI message before sending via SMS
        // Prevents control character injection and enforces length limits
        const sanitizedMessage = sanitizeForSMS(aiMessage)

        logger.debug('Sanitized AI message for SMS', {
          original_length: aiMessage.length,
          sanitized_length: sanitizedMessage.length,
          pending_reply_id: pendingReply.id
        })

        // Send SMS via Twilio
        const twilioResult = await sendTwilioSMS(
          pendingReply.phone_number,
          sanitizedMessage
        )

        if (twilioResult.success) {
          // Store outbound message (use sanitized version that was actually sent)
          const { data: sentMessage } = await supabaseClient
            .from('sms_messages')
            .insert({
              phone_number: pendingReply.phone_number,
              message_content: sanitizedMessage,
              direction: 'outbound',
              status: 'sent',
              sent_at: new Date().toISOString(),
              provider: 'twilio',
              provider_message_id: twilioResult.sid,
              provider_cost: twilioResult.cost || 0,
              conversation_id: pendingReply.conversation_id,
              ai_generated: true
            })
            .select()
            .single()

          // Log AI generation (store both original and sanitized for audit purposes)
          await supabaseClient
            .from('ai_message_logs')
            .insert({
              conversation_id: pendingReply.conversation_id,
              message_id: sentMessage?.id,
              prompt: systemPrompt,
              context: {
                accumulated_messages: accumulatedMessages.length,
                promotion_context: promotionContext,
                original_message: aiMessage,
                sanitized_message: sanitizedMessage,
                was_sanitized: aiMessage !== sanitizedMessage
              },
              model: persona?.display_name || 'claude-3-5-sonnet',
              generated_message: sanitizedMessage,
              message_sent: true,
              delivery_status: 'sent'
            })

          // Mark pending reply as completed
          await supabaseClient
            .from('pending_ai_auto_replies')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              ai_response_sent: true,
              ai_message_id: sentMessage?.id,
              player_context: pendingReply.sms_conversations.player_context || {},
              promotion_context: promotionContext,
              updated_at: new Date().toISOString()
            })
            .eq('id', pendingReply.id)

          // Update conversation
          await supabaseClient
            .from('sms_conversations')
            .update({
              last_ai_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', pendingReply.conversation_id)

          // Extract and log any bonus codes mentioned in AI message (use sanitized message)
          if (pendingReply.player_id) {
            await trackOfferedBonuses(
              supabaseClient,
              sanitizedMessage,
              pendingReply.player_id,
              pendingReply.conversation_id,
              sentMessage?.id,
              accumulatedMessages.map(m => m.message_content).join(' ')
            )
          }

          results.sent++
          logger.info('Successfully sent auto-reply', {
            phone: pendingReply.phone_number,
            pending_reply_id: pendingReply.id
          })
        } else {
          await markAsFailed(supabaseClient, pendingReply.id, twilioResult.error || 'Unknown Twilio error')
          results.failed++
          results.errors.push(`${pendingReply.phone_number}: ${twilioResult.error}`)
        }

      } catch (error) {
        logger.error('Error processing pending reply', error, {
          pending_reply_id: pendingReply.id
        })
        await markAsFailed(supabaseClient, pendingReply.id, error.message)
        results.failed++
        results.errors.push(`${pendingReply.phone_number}: ${error.message}`)
      }
    }

    logger.info('AI auto-reply processing complete', results)

    return new Response(
      JSON.stringify({
        message: 'Auto-reply processing completed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    logger.error('Error in process-ai-auto-replies function', error)
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

function buildSystemPrompt(persona: any, promotionContext: any): string {
  const basePrompt = persona?.system_prompt ||
    'You are a friendly casino host for MyPokies. Be conversational, helpful, and enthusiastic about gaming.'

  const promotionInfo = buildPromotionContextString(promotionContext)

  return `${basePrompt}

IMPORTANT CONTEXT:
${promotionInfo}

RESPONSE GUIDELINES:
- This is an SMS conversation - keep responses under 160 characters when possible, max 300
- Address ALL messages the player sent (they may have sent multiple)
- Be warm and personable, like texting a friend
- If relevant, mention specific bonuses or offers they have/can claim
- Always include a clear next step or call-to-action
- Never be pushy or desperate
- Use emojis sparingly (max 1-2 per message)

${persona?.do_rules ? `DO: ${persona.do_rules.join(', ')}` : ''}
${persona?.dont_rules ? `DON'T: ${persona.dont_rules.join(', ')}` : ''}`
}

function buildPromotionContextString(context: any): string {
  let str = ''

  if (context.has_active_bonuses && context.active_bonuses?.length > 0) {
    str += 'PLAYER\'S ACTIVE BONUSES:\n'
    for (const bonus of context.active_bonuses) {
      str += `- ${bonus.bonus_name}: $${bonus.bonus_amount}`
      if (bonus.wagering_required) {
        const progress = (bonus.wagering_completed / bonus.wagering_required * 100).toFixed(0)
        str += ` (${progress}% wagering complete)`
      }
      str += '\n'
    }
    str += '\n'
  }

  if (context.offers_available && context.available_offers?.length > 0) {
    str += 'AVAILABLE BONUSES YOU CAN OFFER:\n'
    for (const offer of context.available_offers.slice(0, 3)) {
      if (offer.bonus_type === 'deposit_match') {
        str += `- ${offer.bonus_name}: ${offer.match_percentage}% match up to $${offer.max_bonus_amount}`
      } else if (offer.bonus_type === 'no_deposit') {
        str += `- ${offer.bonus_name}: $${offer.max_bonus_amount} free (no deposit required)`
      } else {
        str += `- ${offer.bonus_name}`
      }
      str += ` [Code: ${offer.bonus_code}]\n`
    }
    str += '\n'
  }

  if (!context.has_active_bonuses && !context.offers_available) {
    str = 'No active bonuses or special offers at the moment.\n'
  }

  return str
}

function buildMessageHistory(history: any[], newMessages: any[]): any[] {
  const messages: any[] = []

  // Add conversation history
  for (const msg of history) {
    messages.push({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message_content
    })
  }

  // Add accumulated new messages as one user message
  const combinedNewMessages = newMessages
    .map(m => m.message_content)
    .join('\n\n')

  messages.push({
    role: 'user',
    content: `[Player sent ${newMessages.length} message(s)]:\n${combinedNewMessages}`
  })

  return messages
}

async function generateAIResponse(
  anthropic: any,
  systemPrompt: string,
  messageHistory: any[],
  persona: any
): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.8,
      system: systemPrompt,
      messages: messageHistory,
    })

    return message.content[0].text
  } catch (error) {
    logger.error('Error calling Anthropic API', error)
    throw new Error('Failed to generate AI message')
  }
}

/**
 * Sanitizes AI-generated messages for safe SMS delivery
 * SECURITY: Prevents XSS and control character injection via SMS
 * - Removes control characters that could be exploited
 * - Strips potentially harmful Unicode characters
 * - Enforces SMS length limits (160 single segment, 300 max for concatenated)
 * - Preserves safe emojis and standard punctuation
 */
function sanitizeForSMS(message: string): string {
  // Remove control characters (ASCII 0-31 except newline/tab, and ASCII 127)
  // This prevents injection of characters that could manipulate SMS display or behavior
  let sanitized = message.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')

  // Remove zero-width characters and other invisible Unicode that could be used for obfuscation
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '')

  // Remove bi-directional text override characters (could be used for phishing)
  sanitized = sanitized.replace(/[\u202A-\u202E]/g, '')

  // Normalize whitespace - replace multiple spaces/newlines with single space
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // Enforce SMS length limits
  // Standard SMS: 160 chars for single segment
  // Concatenated SMS: 153 chars per segment, up to ~300 chars practical limit
  const MAX_SMS_LENGTH = 300
  if (sanitized.length > MAX_SMS_LENGTH) {
    // Truncate and add ellipsis
    sanitized = sanitized.substring(0, MAX_SMS_LENGTH - 3) + '...'
  }

  return sanitized
}

async function sendTwilioSMS(
  toPhone: string,
  messageBody: string
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

async function markAsFailed(supabase: any, pendingReplyId: string, errorMessage: string): Promise<void> {
  await supabase
    .from('pending_ai_auto_replies')
    .update({
      status: 'failed',
      error_message: errorMessage,
      retry_count: supabase.raw('retry_count + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('id', pendingReplyId)
}

// Extract bonus codes from AI message and automatically credit them to player account
async function trackOfferedBonuses(
  supabase: any,
  aiMessage: string,
  playerId: string,
  conversationId: string,
  messageId: string,
  playerMessages: string
): Promise<void> {
  try {
    // Regex patterns to extract bonus codes
    // Matches patterns like: "code: SLOTS200", "use code SLOTS200", "[Code: WELCOME100]"
    const codePatterns = [
      /code:\s*([A-Z0-9]{4,20})/gi,
      /use code\s+([A-Z0-9]{4,20})/gi,
      /\[code:\s*([A-Z0-9]{4,20})\]/gi,
      /promo code\s+([A-Z0-9]{4,20})/gi
    ]

    const extractedCodes = new Set<string>()

    for (const pattern of codePatterns) {
      const matches = aiMessage.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          extractedCodes.add(match[1].toUpperCase())
        }
      }
    }

    logger.debug('Extracted bonus codes from AI message', {
      codes: Array.from(extractedCodes)
    })

    // Log and auto-credit each extracted bonus code
    for (const bonusCode of extractedCodes) {
      try {
        // Determine why this bonus was offered (from player messages)
        let offerReason = 'AI offered during conversation'
        if (playerMessages.toLowerCase().includes('bonus')) {
          offerReason = 'Player asked about bonuses'
        } else if (playerMessages.toLowerCase().includes('deposit')) {
          offerReason = 'Player mentioned deposits'
        } else if (playerMessages.toLowerCase().includes('slot')) {
          offerReason = 'Player interested in slots'
        }

        // Call function to log offer (player can claim later via frontend)
        const { data, error } = await supabase
          .rpc('log_ai_bonus_offer', {
            p_player_id: playerId,
            p_conversation_id: conversationId,
            p_message_id: messageId,
            p_bonus_code: bonusCode,
            p_offer_reason: offerReason,
            p_expires_hours: 48 // 48 hour expiry
          })

        if (error) {
          logger.error('Error logging bonus offer', error, { bonus_code: bonusCode })
        } else {
          logger.info('Logged AI bonus offer', {
            bonus_code: bonusCode,
            player_id: playerId
          })
        }
      } catch (err) {
        logger.error('Failed to log/credit bonus', err, { bonus_code: bonusCode })
      }
    }
  } catch (error) {
    logger.error('Error tracking offered bonuses', error)
    // Don't throw - this shouldn't fail the main SMS sending
  }
}
