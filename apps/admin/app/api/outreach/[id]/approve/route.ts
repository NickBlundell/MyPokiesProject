import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@mypokies/monitoring'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { edited_message, edit_notes } = body
    const { id } = await params

    // Update message status
    const updateData: Record<string, string> = {
      approval_status: 'approved',
      status: 'scheduled',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // If message was edited, include edited content
    if (edited_message) {
      updateData.edited_message = edited_message
      updateData.edit_notes = edit_notes || 'Message edited by admin'
      updateData.edited_at = new Date().toISOString()
    }

    const { data: message, error } = await supabase
      .from('scheduled_outreach_messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error approving message', { messageId: id, error: error.message, userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Message approved successfully',
      data: message
    })

  } catch (error) {
    logger.error('Error in approve API', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
