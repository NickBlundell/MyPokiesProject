// Scheduled Data Archival Edge Function
// This function archives old data from high-volume tables to archive tables
// Schedule: Weekly (recommended: Sunday 2:00 AM)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('scheduled-archival')

interface ArchivalResult {
  table: string
  archived_count: number
  deleted_count: number
  duration_ms: number
  status: 'success' | 'error'
  error?: string
}

interface ArchivalConfig {
  table: string
  archiveTable: string
  retentionDays: number
  batchSize: number
}

const ARCHIVAL_CONFIGS: ArchivalConfig[] = [
  {
    table: 'callback_logs',
    archiveTable: 'callback_logs_archive',
    retentionDays: 90,
    batchSize: 10000
  },
  {
    table: 'sms_messages',
    archiveTable: 'sms_messages_archive',
    retentionDays: 180,
    batchSize: 5000
  },
  {
    table: 'game_rounds',
    archiveTable: 'game_rounds_archive',
    retentionDays: 365,
    batchSize: 10000
  }
]

async function archiveTable(
  supabase: any,
  config: ArchivalConfig
): Promise<ArchivalResult> {
  const startTime = Date.now()

  try {
    logger.info('Starting archival for table', { table: config.table })

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays)
    const cutoffISO = cutoffDate.toISOString()

    logger.debug('Archiving records older than cutoff date', {
      table: config.table,
      cutoff_date: cutoffISO
    })

    // Check if archive table exists
    const { data: archiveTableExists, error: checkError } = await supabase
      .from(config.archiveTable)
      .select('id')
      .limit(1)

    if (checkError && checkError.message.includes('does not exist')) {
      logger.warn('Archive table does not exist, skipping', {
        archive_table: config.archiveTable
      })
      return {
        table: config.table,
        archived_count: 0,
        deleted_count: 0,
        duration_ms: Date.now() - startTime,
        status: 'error',
        error: 'Archive table does not exist'
      }
    }

    // Use PostgreSQL function for better performance
    const { data, error } = await supabase.rpc('archive_table_data', {
      p_table_name: config.table,
      p_archive_table_name: config.archiveTable,
      p_cutoff_date: cutoffISO,
      p_batch_size: config.batchSize
    })

    if (error) {
      logger.error('Error archiving table', error, { table: config.table })

      // Fallback to manual archival if RPC function doesn't exist
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        logger.info('Attempting manual archival', { table: config.table })
        return await manualArchival(supabase, config, cutoffISO)
      }

      return {
        table: config.table,
        archived_count: 0,
        deleted_count: 0,
        duration_ms: Date.now() - startTime,
        status: 'error',
        error: error.message
      }
    }

    logger.info('Successfully archived records', {
      table: config.table,
      archived_count: data.archived_count
    })

    return {
      table: config.table,
      archived_count: data.archived_count || 0,
      deleted_count: data.deleted_count || 0,
      duration_ms: Date.now() - startTime,
      status: 'success'
    }

  } catch (err) {
    logger.error('Unexpected error archiving table', err, { table: config.table })
    return {
      table: config.table,
      archived_count: 0,
      deleted_count: 0,
      duration_ms: Date.now() - startTime,
      status: 'error',
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

async function manualArchival(
  supabase: any,
  config: ArchivalConfig,
  cutoffISO: string
): Promise<ArchivalResult> {
  const startTime = Date.now()
  let archivedCount = 0
  let deletedCount = 0

  try {
    // Fetch old records in batches
    const { data: oldRecords, error: fetchError } = await supabase
      .from(config.table)
      .select('*')
      .lt('created_at', cutoffISO)
      .limit(config.batchSize)

    if (fetchError) throw fetchError

    if (!oldRecords || oldRecords.length === 0) {
      logger.debug('No records to archive', { table: config.table })
      return {
        table: config.table,
        archived_count: 0,
        deleted_count: 0,
        duration_ms: Date.now() - startTime,
        status: 'success'
      }
    }

    // Insert into archive table
    const { error: insertError } = await supabase
      .from(config.archiveTable)
      .insert(oldRecords)

    if (insertError) throw insertError

    archivedCount = oldRecords.length

    // Delete from original table
    const ids = oldRecords.map((r: any) => r.id)
    const { error: deleteError } = await supabase
      .from(config.table)
      .delete()
      .in('id', ids)

    if (deleteError) throw deleteError

    deletedCount = oldRecords.length

    logger.info('Manually archived records', {
      table: config.table,
      archived_count: archivedCount
    })

    return {
      table: config.table,
      archived_count: archivedCount,
      deleted_count: deletedCount,
      duration_ms: Date.now() - startTime,
      status: 'success'
    }

  } catch (err) {
    logger.error('Manual archival error', err, { table: config.table })
    return {
      table: config.table,
      archived_count: archivedCount,
      deleted_count: deletedCount,
      duration_ms: Date.now() - startTime,
      status: 'error',
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

Deno.serve(async (req) => {
  try {
    // Verify this is a cron job or authorized request
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized archival attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    logger.info('Starting scheduled data archival')
    const startTime = Date.now()

    // Run archival for each configured table
    const results: ArchivalResult[] = []

    for (const config of ARCHIVAL_CONFIGS) {
      const result = await archiveTable(supabase, config)
      results.push(result)

      // Small delay between tables to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const totalDuration = Date.now() - startTime
    const totalArchived = results.reduce((sum, r) => sum + r.archived_count, 0)
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted_count, 0)
    const errors = results.filter(r => r.status === 'error')

    logger.info('Archival completed', {
      duration_ms: totalDuration,
      total_archived: totalArchived,
      total_deleted: totalDeleted,
      errors: errors.length
    })

    const response = {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      duration_ms: totalDuration,
      summary: {
        total_archived: totalArchived,
        total_deleted: totalDeleted,
        total_errors: errors.length
      },
      results
    }

    // Log to archival_runs table if it exists
    try {
      await supabase.from('archival_runs').insert({
        run_at: new Date().toISOString(),
        duration_ms: totalDuration,
        tables_processed: results.length,
        total_archived: totalArchived,
        total_deleted: totalDeleted,
        errors: errors.length,
        details: response
      })
    } catch (logError) {
      logger.warn('Could not log to archival_runs table', { error: logError })
    }

    return new Response(
      JSON.stringify(response, null, 2),
      {
        status: errors.length > 0 ? 207 : 200, // 207 Multi-Status if partial success
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    logger.error('Fatal error in archival function', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
