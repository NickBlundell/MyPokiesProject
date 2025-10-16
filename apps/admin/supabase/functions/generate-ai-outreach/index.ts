// Supabase Edge Function: Generate AI Outreach
// Runs hourly to detect trigger conditions and generate AI-powered SMS messages
// Messages are proposed to admins for approval before sending

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('generate-ai-outreach')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlayerContext {
  player_id: string
  external_user_id: string
  email: string
  phone?: string
  trigger_type: string
  trigger_reason: string
  analytics: any
  loyalty: any
  recent_transactions: any[]
  active_bonuses: any[]
  available_offers: any[]
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

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    logger.info('Starting AI outreach generation')

    const results = {
      missed_pattern: 0,
      engaged_dropout: 0,
      jackpot_proximity: 0,
      loss_recovery: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Helper function to process players in batches
    const processPlayerBatch = async (
      players: any[],
      triggerType: string,
      getTriggerReason: (player: any) => string,
      resultKey: keyof typeof results
    ) => {
      const batchResults = await Promise.allSettled(
        players.map(async (player) => {
          const context = await gatherPlayerContext(
            supabaseClient,
            player.player_id,
            triggerType,
            getTriggerReason(player)
          )
          const message = await generateAIMessage(anthropic, context)
          await createOutreachMessage(supabaseClient, context, message)
          return player.player_id
        })
      )

      // Count results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results[resultKey]++
        } else {
          logger.error(`Error processing ${triggerType} player`, result.reason, {
            player_id: players[index].player_id
          })
          results.failed++
          results.errors.push(`${players[index].player_id}: ${result.reason.message || result.reason}`)
        }
      })
    }

    // 1. Detect players with missed deposit patterns
    const { data: missedPatternPlayers, error: mpError } = await supabaseClient
      .from('players_with_missed_patterns')
      .select('*')

    if (mpError) {
      logger.error('Error fetching missed pattern players', mpError)
    } else if (missedPatternPlayers && missedPatternPlayers.length > 0) {
      await processPlayerBatch(
        missedPatternPlayers,
        'missed_pattern',
        (player) => `Player missed expected deposit at ${player.expected_deposit_time}. Usually deposits on ${player.deposit_pattern}.`,
        'missed_pattern'
      )
    }

    // 2. Detect engaged players who dropped off
    const { data: dropoutPlayers, error: doError } = await supabaseClient
      .from('players_engaged_dropout')
      .select('*')

    if (doError) {
      logger.error('Error fetching dropout players', doError)
    } else if (dropoutPlayers && dropoutPlayers.length > 0) {
      // Filter out players who already received a message in last 7 days
      const filteredDropoutPlayers = await Promise.all(
        dropoutPlayers.map(async (player) => {
          const { data: existing } = await supabaseClient
            .from('scheduled_outreach_messages')
            .select('id')
            .eq('player_id', player.player_id)
            .eq('trigger_type', 'engaged_player_dropout')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .limit(1)

          if (existing && existing.length > 0) {
            logger.debug('Skipping player - recent dropout message exists', {
              player_id: player.player_id
            })
            return null
          }
          return player
        })
      )

      const playersToProcess = filteredDropoutPlayers.filter(p => p !== null)
      if (playersToProcess.length > 0) {
        await processPlayerBatch(
          playersToProcess,
          'engaged_player_dropout',
          (player) => `Player was active for ${player.weeks_active} weeks, now inactive for ${player.days_inactive} days.`,
          'engaged_dropout'
        )
      }
    }

    // 3. Detect players close to next jackpot ticket
    const { data: jackpotProximity, error: jpError } = await supabaseClient.rpc(
      'get_players_near_jackpot_threshold',
      { threshold_percentage: 0.85 } // 85% toward next ticket
    )

    if (jpError) {
      logger.error('Error fetching jackpot proximity players', jpError)
    } else if (jackpotProximity && jackpotProximity.length > 0) {
      // Filter out players who already received a message in last 3 days
      const filteredJackpotPlayers = await Promise.all(
        jackpotProximity.map(async (player) => {
          const { data: existing } = await supabaseClient
            .from('scheduled_outreach_messages')
            .select('id')
            .eq('player_id', player.player_id)
            .eq('trigger_type', 'jackpot_proximity')
            .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
            .limit(1)

          if (existing && existing.length > 0) {
            logger.debug('Skipping player - recent jackpot proximity message exists', {
              player_id: player.player_id
            })
            return null
          }
          return player
        })
      )

      const playersToProcess = filteredJackpotPlayers.filter(p => p !== null)
      if (playersToProcess.length > 0) {
        await processPlayerBatch(
          playersToProcess,
          'jackpot_proximity',
          (player) => `Player is ${Math.round(player.progress_percentage)}% toward their next jackpot ticket. Only $${player.amount_needed} to go!`,
          'jackpot_proximity'
        )
      }
    }

    // 4. Detect players with significant recent losses
    const { data: lossRecovery, error: lrError } = await supabaseClient.rpc(
      'get_players_with_significant_losses',
      {
        days_back: 3,
        min_loss_amount: 500
      }
    )

    if (lrError) {
      logger.error('Error fetching loss recovery players', lrError)
    } else if (lossRecovery && lossRecovery.length > 0) {
      // Filter out players who already received a message in last 5 days
      const filteredLossPlayers = await Promise.all(
        lossRecovery.map(async (player) => {
          const { data: existing } = await supabaseClient
            .from('scheduled_outreach_messages')
            .select('id')
            .eq('player_id', player.player_id)
            .eq('trigger_type', 'loss_recovery')
            .gte('created_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
            .limit(1)

          if (existing && existing.length > 0) {
            logger.debug('Skipping player - recent loss recovery message exists', {
              player_id: player.player_id
            })
            return null
          }
          return player
        })
      )

      const playersToProcess = filteredLossPlayers.filter(p => p !== null)
      if (playersToProcess.length > 0) {
        await processPlayerBatch(
          playersToProcess,
          'loss_recovery',
          (player) => `Player lost $${Math.abs(player.net_amount)} in the last ${player.days_back} days.`,
          'loss_recovery'
        )
      }
    }

    logger.info('AI outreach generation complete', results)

    return new Response(
      JSON.stringify({
        message: 'AI outreach generation completed',
        results,
        total_generated: results.missed_pattern + results.engaged_dropout + results.jackpot_proximity + results.loss_recovery
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    logger.error('Error in generate-ai-outreach function', error)
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

async function gatherPlayerContext(
  supabase: any,
  playerId: string,
  triggerType: string,
  triggerReason: string
): Promise<PlayerContext> {
  const startTime = performance.now()

  // Execute all database queries in parallel for better performance
  const [
    { data: user },
    { data: analytics },
    { data: loyalty },
    { data: transactions },
    { data: bonuses },
    { data: availableOffers }
  ] = await Promise.all([
    // Get player basic info
    supabase
      .from('users')
      .select('external_user_id, email, phone')
      .eq('id', playerId)
      .single(),

    // Get behavioral analytics
    supabase
      .from('player_behavioral_analytics')
      .select('*')
      .eq('player_id', playerId)
      .single(),

    // Get loyalty status
    supabase
      .from('player_loyalty')
      .select(`
        *,
        loyalty_tiers!player_loyalty(current_tier_id) (
          tier_name,
          point_redemption_rate,
          jackpot_ticket_rate
        )
      `)
      .eq('player_id', playerId)
      .single(),

    // Get recent transactions (last 10)
    supabase
      .from('transactions')
      .select('type, subtype, amount, created_at')
      .eq('user_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Get active bonuses
    supabase
      .from('player_bonuses')
      .select(`
        *,
        bonus_offers (
          bonus_name,
          bonus_code
        )
      `)
      .eq('player_id', playerId)
      .eq('status', 'active'),

    // Get available bonus offers (not claimed)
    supabase
      .from('bonus_offers')
      .select('bonus_name, bonus_code, bonus_type, match_percentage, max_bonus_amount')
      .eq('active', true)
  ])

  const queryTime = performance.now() - startTime
  logger.debug(`Player context gathered in ${queryTime.toFixed(2)}ms`, { player_id: playerId })

  return {
    player_id: playerId,
    external_user_id: user?.external_user_id || 'Unknown',
    email: user?.email || '',
    phone: user?.phone,
    trigger_type: triggerType,
    trigger_reason: triggerReason,
    analytics: analytics || {},
    loyalty: loyalty || {},
    recent_transactions: transactions || [],
    active_bonuses: bonuses || [],
    available_offers: availableOffers || [],
  }
}

async function generateAIMessage(anthropic: any, context: PlayerContext): Promise<string> {
  const systemPrompt = `You are an expert casino host crafting personalized SMS outreach messages for VIP players.
Your messages should:
- Be warm, friendly, and conversational (like a personal host)
- Reference specific player patterns and behaviors
- Suggest relevant bonuses or offers when appropriate
- Be concise (SMS length, max 160 characters preferred, 300 max)
- Create urgency or excitement where natural
- Never be pushy or desperate
- Use the player's name sparingly (we'll add it programmatically)
- Include a clear call-to-action

Tone: Professional but friendly, like a personal concierge at a high-end casino.`

  const userPrompt = buildPromptFromContext(context)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
    })

    return message.content[0].text
  } catch (error) {
    logger.error('Error calling Anthropic API', error)
    throw new Error('Failed to generate AI message')
  }
}

function buildPromptFromContext(context: PlayerContext): string {
  let prompt = `Generate a personalized SMS message for this player:\n\n`

  // Trigger information
  prompt += `**Trigger**: ${context.trigger_type}\n`
  prompt += `**Reason**: ${context.trigger_reason}\n\n`

  // Player behavior
  if (context.analytics) {
    prompt += `**Player Behavior**:\n`
    if (context.analytics.avg_deposit_per_active_week) {
      prompt += `- Average deposit per week: $${context.analytics.avg_deposit_per_active_week}\n`
    }
    if (context.analytics.has_established_pattern) {
      prompt += `- Has established deposit pattern: ${context.analytics.most_frequent_deposit_day}s around ${context.analytics.most_frequent_deposit_hour}:00\n`
    }
    if (context.analytics.total_deposits) {
      prompt += `- Total lifetime deposits: ${context.analytics.total_deposits}\n`
    }
    if (context.analytics.days_since_last_deposit !== null) {
      prompt += `- Days since last deposit: ${context.analytics.days_since_last_deposit}\n`
    }
    prompt += `\n`
  }

  // Loyalty status
  if (context.loyalty) {
    prompt += `**VIP Status**:\n`
    prompt += `- Tier: ${context.loyalty.loyalty_tiers?.[0]?.tier_name || 'Bronze'}\n`
    prompt += `- Points: ${context.loyalty.points_balance || 0}\n`
    if (context.loyalty.loyalty_tiers?.[0]?.point_redemption_rate) {
      prompt += `- Can redeem ${context.loyalty.points_balance || 0} points for $${((context.loyalty.points_balance || 0) * context.loyalty.loyalty_tiers[0].point_redemption_rate).toFixed(2)} bonus\n`
    }
    prompt += `\n`
  }

  // Recent activity
  if (context.recent_transactions && context.recent_transactions.length > 0) {
    prompt += `**Recent Activity**:\n`
    const recentDeposit = context.recent_transactions.find(t => t.subtype === 'deposit')
    if (recentDeposit) {
      prompt += `- Last deposit: $${recentDeposit.amount} (${new Date(recentDeposit.created_at).toLocaleDateString()})\n`
    }
    prompt += `\n`
  }

  // Available offers
  if (context.available_offers && context.available_offers.length > 0) {
    prompt += `**Available Offers**:\n`
    context.available_offers.slice(0, 3).forEach(offer => {
      if (offer.bonus_type === 'deposit_match') {
        prompt += `- ${offer.bonus_name}: ${offer.match_percentage}% match up to $${offer.max_bonus_amount}\n`
      } else {
        prompt += `- ${offer.bonus_name}\n`
      }
    })
    prompt += `\n`
  }

  prompt += `Generate a natural, conversational SMS message that addresses this specific situation and encourages the player to return and play.`

  return prompt
}

async function createOutreachMessage(
  supabase: any,
  context: PlayerContext,
  aiMessage: string
): Promise<void> {
  // Calculate optimal send time
  const { data: optimalTime } = await supabase.rpc(
    'get_optimal_send_time',
    { p_player_id: context.player_id }
  )

  // Store context snapshot
  const contextSnapshot = {
    avg_deposit_per_week: context.analytics?.avg_deposit_per_active_week,
    deposit_pattern: context.analytics?.has_established_pattern
      ? `${context.analytics.most_frequent_deposit_day}s at ${context.analytics.most_frequent_deposit_hour}:00`
      : null,
    vip_tier: context.loyalty?.loyalty_tiers?.[0]?.tier_name,
    points_balance: context.loyalty?.points_balance,
    days_since_last_deposit: context.analytics?.days_since_last_deposit,
    recent_deposits: context.recent_transactions?.filter(t => t.subtype === 'deposit').slice(0, 3),
    available_offers: context.available_offers?.slice(0, 3)
  }

  const { error } = await supabase
    .from('scheduled_outreach_messages')
    .insert({
      player_id: context.player_id,
      trigger_type: context.trigger_type,
      trigger_reason: context.trigger_reason,
      ai_generated_message: aiMessage,
      context_snapshot: contextSnapshot,
      scheduled_send_time: optimalTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Default 2 hours from now
      approval_status: 'pending_review',
      status: 'proposed',
      channel: 'sms'
    })

  if (error) {
    throw new Error(`Failed to create outreach message: ${error.message}`)
  }
}
