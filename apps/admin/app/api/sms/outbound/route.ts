import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@mypokies/monitoring'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { success, limit: rateLimit, remaining, reset } = await checkRateLimit(request)

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          limit: rateLimit,
          remaining,
          reset
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    const supabase = await createAdminClient()
    const { method, leadListId, phoneNumbers, message } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    let recipients: string[] = []

    // Get phone numbers based on method
    if (method === 'list' && leadListId) {
      // Get leads from the selected list
      const { data: leads } = await supabase
        .from('marketing_leads')
        .select('phone_number')
        .eq('list_id', leadListId)
        .not('phone_number', 'is', null)

      recipients = leads?.map(lead => lead.phone_number).filter(Boolean) || []
    } else if (method === 'manual' && phoneNumbers) {
      recipients = phoneNumbers.filter((num: string) => num && num.trim())
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 400 }
      )
    }

    // Track sent messages
    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Send to each recipient
    for (const phoneNumber of recipients) {
      try {
        // Check if conversation exists
        let { data: conversation } = await supabase
          .from('sms_conversations')
          .select('id, message_count')
          .eq('phone_number', phoneNumber)
          .single()

        // Create conversation if doesn't exist
        if (!conversation) {
          const { data: newConversation, error: convError } = await supabase
            .from('sms_conversations')
            .insert({
              phone_number: phoneNumber,
              status: 'active',
              ai_enabled: true,
              conversion_goal: 'signup',
              message_count: 0
            })
            .select()
            .single()

          if (convError || !newConversation) {
            throw new Error(`Failed to create conversation: ${convError?.message || 'Unknown error'}`)
          }

          conversation = newConversation
        }

        if (!conversation) {
          throw new Error('Failed to get or create conversation')
        }

        // Create the outbound message record
        const { error: msgError } = await supabase
          .from('sms_messages')
          .insert({
            conversation_id: conversation.id,
            message_content: message.trim(),
            direction: 'outbound',
            ai_generated: false,
            delivery_status: 'pending'
          })

        if (msgError) {
          throw new Error(`Failed to create message: ${msgError.message}`)
        }

        // Update conversation
        await supabase
          .from('sms_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: (conversation.message_count || 0) + 1
          })
          .eq('id', conversation.id)

        // In production, you would call Twilio API here to actually send the SMS
        // For now, we're just creating the database records

        // If TWILIO_ACCOUNT_SID exists, we could send via Twilio
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
          try {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
            const twilioAuth = Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64')

            const twilioResponse = await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${twilioAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                From: process.env.TWILIO_PHONE_NUMBER,
                To: phoneNumber,
                Body: message.trim()
              })
            })

            if (twilioResponse.ok) {
              // Update delivery status
              await supabase
                .from('sms_messages')
                .update({ delivery_status: 'sent' })
                .eq('conversation_id', conversation.id)
                .order('created_at', { ascending: false })
                .limit(1)
            }
          } catch (twilioError) {
            logger.error('Twilio error', { phoneNumber, error: twilioError instanceof Error ? twilioError.message : 'Unknown error' })
            // Continue even if Twilio fails - message is saved in DB
          }
        }

        sentCount++
      } catch (err) {
        failedCount++
        errors.push(`${phoneNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        logger.error('Failed to send SMS to recipient', { phoneNumber, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    logger.error('Outbound SMS error', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Failed to send outbound messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
