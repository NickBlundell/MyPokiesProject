// Supabase Edge Function: Analyze Player Behavior
// Runs daily at 3 AM to calculate deposit patterns and behavioral analytics
// for all active players

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('analyze-player-behavior')

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

    logger.info('Starting player behavior analysis')

    // Get all active players (players with at least 1 transaction in last 6 months)
    const { data: activePlayers, error: playersError } = await supabaseClient
      .from('users')
      .select('id, external_user_id, email')
      .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())

    if (playersError) {
      throw playersError
    }

    logger.info('Found active players', { count: activePlayers?.length || 0 })

    const results = {
      total_players: activePlayers?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process players in batches of 50
    const batchSize = 50
    for (let i = 0; i < (activePlayers?.length || 0); i += batchSize) {
      const batch = activePlayers.slice(i, i + batchSize)

      const batchPromises = batch.map(async (player) => {
        try {
          // Call the database function to update analytics
          const { error } = await supabaseClient.rpc(
            'update_player_behavioral_analytics',
            { p_player_id: player.id }
          )

          if (error) {
            logger.error('Error analyzing player', error, {
              player_id: player.id,
              external_user_id: player.external_user_id
            })
            results.failed++
            results.errors.push(`${player.external_user_id}: ${error.message}`)
          } else {
            results.successful++
          }
        } catch (error) {
          logger.error('Exception analyzing player', error, {
            player_id: player.id,
            external_user_id: player.external_user_id
          })
          results.failed++
          results.errors.push(`${player.external_user_id}: ${error.message}`)
        }
      })

      // Wait for batch to complete
      await Promise.all(batchPromises)

      logger.info('Processed batch', {
        batch_number: Math.floor(i / batchSize) + 1,
        progress: `${Math.min(i + batchSize, activePlayers.length)}/${activePlayers.length}`
      })
    }

    logger.info('Player behavior analysis complete', results)

    return new Response(
      JSON.stringify({
        message: 'Player behavior analysis completed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    logger.error('Error in analyze-player-behavior function', error)
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
