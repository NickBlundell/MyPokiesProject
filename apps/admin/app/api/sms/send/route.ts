import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import twilio from 'twilio'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendSmsSchema } from '@/lib/schemas/sms'

// Initialize Twilio client (would use env vars in production)
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict (2 requests per minute)
    const { success, limit, remaining, reset } = await checkRateLimit(request, { strict: true })

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          limit,
          remaining,
          reset
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    const supabase = await createAdminClient()

    // Parse and validate request body
    const body = await request.json()
    const validation = sendSmsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    const { phone, message, leadId, campaignId } = validation.data

    // Check if phone is opted out
    const { data: optOutCheck } = await supabase
      .from('sms_opt_outs')
      .select('*')
      .eq('phone_number', phone)
      .eq('opted_back_in', false)
      .single()

    if (optOutCheck) {
      return NextResponse.json(
        { error: 'Phone number has opted out' },
        { status: 400 }
      )
    }

    // Create SMS record in database
    const { data: smsRecord, error: smsError } = await supabase
      .from('sms_messages')
      .insert({
        phone_number: phone,
        message_content: message,
        direction: 'outbound',
        campaign_id: campaignId,
        lead_id: leadId,
        status: 'pending'
      })
      .select()
      .single()

    if (smsError) {
      return NextResponse.json(
        { error: 'Failed to create SMS record' },
        { status: 500 }
      )
    }

    // In production, would actually send via Twilio
    if (accountSid && authToken) {
      const client = twilio(accountSid, authToken)

      try {
        const twilioMessage = await client.messages.create({
          body: message,
          from: fromNumber,
          to: phone
        })

        // Update SMS record with delivery status
        await supabase
          .from('sms_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: twilioMessage.sid
          })
          .eq('id', smsRecord.id)

        return NextResponse.json({
          success: true,
          messageId: smsRecord.id,
          twilioSid: twilioMessage.sid
        })
      } catch (twilioError: unknown) {
        // Update SMS record with failure
        await supabase
          .from('sms_messages')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_reason: twilioError instanceof Error ? twilioError.message : 'Unknown error'
          })
          .eq('id', smsRecord.id)

        return NextResponse.json(
          { error: 'Failed to send SMS', details: twilioError instanceof Error ? twilioError.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // Mock response for development
    return NextResponse.json({
      success: true,
      messageId: smsRecord.id,
      message: 'SMS queued for sending (dev mode)'
    })

  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}