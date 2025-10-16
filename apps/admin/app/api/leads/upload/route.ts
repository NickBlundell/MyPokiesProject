import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parse } from 'csv-parse/sync'
import { checkRateLimit } from '@/lib/rate-limit'

interface CSVRecord {
  phone_number?: string
  phone?: string
  email?: string
  first_name?: string
  firstname?: string
  last_name?: string
  lastname?: string
  tags?: string
  [key: string]: string | undefined
}

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
    const formData = await request.formData()

    const file = formData.get('file') as File
    const listName = formData.get('listName') as string
    const description = formData.get('description') as string
    const source = formData.get('source') as string
    const bonusEnabled = formData.get('bonusEnabled') === 'true'
    const bonusType = formData.get('bonusType') as string
    const bonusAmount = parseFloat(formData.get('bonusAmount') as string || '0')
    const bonusPercentage = parseFloat(formData.get('bonusPercentage') as string || '0')
    const bonusCode = formData.get('bonusCode') as string

    if (!file || !listName) {
      return NextResponse.json(
        { error: 'File and list name are required' },
        { status: 400 }
      )
    }

    // Read and parse CSV file
    const fileContent = await file.text()
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CSVRecord[]

    // Create lead list
    const { data: leadList, error: listError } = await supabase
      .from('lead_lists')
      .insert({
        name: listName,
        description,
        source,
        total_leads: records.length,
        bonus_enabled: bonusEnabled,
        bonus_type: bonusType,
        bonus_amount: bonusAmount,
        bonus_percentage: bonusPercentage,
        bonus_code: bonusCode,
        campaign_type: 'sms'
      })
      .select()
      .single()

    if (listError) {
      return NextResponse.json(
        { error: 'Failed to create lead list', details: listError.message },
        { status: 500 }
      )
    }

    // Process and insert leads
    const leads = []
    const errors = []

    for (const [index, record] of records.entries()) {
      // Validate required fields
      if (!record.phone_number && !record.phone) {
        errors.push(`Row ${index + 2}: Missing phone number`)
        continue
      }

      const phoneNumber = record.phone_number || record.phone

      if (!phoneNumber) {
        errors.push(`Row ${index + 2}: Missing phone number after validation`)
        continue
      }

      // Clean phone number (remove non-digits, add country code if needed)
      let cleanedPhone = phoneNumber.replace(/\D/g, '')
      if (!cleanedPhone.startsWith('1') && cleanedPhone.length === 10) {
        cleanedPhone = '1' + cleanedPhone // Add US country code
      }
      cleanedPhone = '+' + cleanedPhone

      leads.push({
        list_id: leadList.id,
        phone_number: cleanedPhone,
        email: record.email || null,
        first_name: record.first_name || record.firstname || null,
        last_name: record.last_name || record.lastname || null,
        status: 'new',
        contact_count: 0,
        tags: record.tags ? record.tags.split(',').map((t) => t.trim()) : [],
        custom_data: {
          original_row: index + 2,
          ...record
        }
      })
    }

    // Bulk insert leads
    if (leads.length > 0) {
      const { error: leadsError } = await supabase
        .from('marketing_leads')
        .insert(leads)

      if (leadsError) {
        // Rollback - delete the lead list
        await supabase
          .from('lead_lists')
          .delete()
          .eq('id', leadList.id)

        return NextResponse.json(
          { error: 'Failed to insert leads', details: leadsError.message },
          { status: 500 }
        )
      }
    }

    // Update lead list with actual count
    await supabase
      .from('lead_lists')
      .update({ total_leads: leads.length })
      .eq('id', leadList.id)

    return NextResponse.json({
      success: true,
      listId: leadList.id,
      listName: leadList.name,
      totalRecords: records.length,
      successfulImports: leads.length,
      errors: errors,
      bonusConfiguration: bonusEnabled ? {
        type: bonusType,
        amount: bonusAmount,
        percentage: bonusPercentage,
        code: bonusCode
      } : null
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process CSV upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve lead lists
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - standard (5 requests per 10 seconds)
    const { success, limit, remaining, reset } = await checkRateLimit(request)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
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

    const { data: lists, error } = await supabase
      .from('lead_lists')
      .select(`
        *,
        marketing_leads(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch lead lists', details: error.message },
        { status: 500 }
      )
    }

    // Calculate conversion metrics
    const listsWithMetrics = await Promise.all(
      lists.map(async (list) => {
        const { data: conversionData } = await supabase
          .from('marketing_leads')
          .select('status')
          .eq('list_id', list.id)
          .in('status', ['registered', 'converted'])

        const convertedCount = conversionData?.filter(l => l.status === 'converted').length || 0
        const registeredCount = conversionData?.filter(l => l.status === 'registered').length || 0

        return {
          ...list,
          converted: convertedCount,
          registered: registeredCount,
          conversionRate: list.total_leads > 0
            ? ((convertedCount / list.total_leads) * 100).toFixed(2)
            : 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      lists: listsWithMetrics
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch lead lists', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}