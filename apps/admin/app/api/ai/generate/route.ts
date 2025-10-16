import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict (2 requests per minute) - AI generation is expensive
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
    const {
      conversationId,
      userMessage,
      goal,
      persona = 'friendly_casino_host',
      context = {}
    } = await request.json()

    // Get AI configuration from database
    const { data: aiConfig } = await supabase
      .from('ai_provider_config')
      .select('*')
      .eq('active', true)
      .single()

    // Get persona configuration
    const { data: personaConfig } = await supabase
      .from('ai_personas')
      .select('*')
      .eq('name', persona)
      .single()

    // Get conversation history
    const { data: conversation } = await supabase
      .from('sms_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Build conversation history for AI
    const messageHistory = recentMessages?.reverse().map(msg => ({
      role: (msg.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.message_content
    })) || []

    // Get player promotion context if player_id exists
    let promotionContext: Record<string, unknown> | null = null
    if (conversation?.player_id) {
      const { data: promoData } = await supabase
        .rpc('get_player_promotion_context', { p_player_id: conversation.player_id })

      if (promoData) {
        promotionContext = promoData
      }
    }

    // Build promotion context string for prompt
    const buildPromotionInfo = () => {
      if (!promotionContext) return 'No promotion context available (player not identified).'

      let info = ''

      if (promotionContext.has_active_bonuses && (promotionContext.active_bonuses as Array<Record<string, unknown>>)?.length > 0) {
        info += 'PLAYER\'S ACTIVE BONUSES:\n'
        for (const bonus of (promotionContext.active_bonuses as Array<Record<string, unknown>>)) {
          info += `- ${bonus.bonus_name as string}: $${bonus.bonus_amount as number}`
          if (bonus.wagering_required) {
            const progress = ((bonus.wagering_completed as number) / (bonus.wagering_required as number) * 100).toFixed(0)
            info += ` (${progress}% wagering complete)`
          }
          info += '\n'
        }
        info += '\n'
      }

      if (promotionContext.offers_available && (promotionContext.available_offers as Array<Record<string, unknown>>)?.length > 0) {
        info += 'AVAILABLE BONUSES YOU CAN OFFER:\n'
        for (const offer of (promotionContext.available_offers as Array<Record<string, unknown>>).slice(0, 3)) {
          if (offer.bonus_type === 'deposit_match') {
            info += `- ${offer.bonus_name as string}: ${offer.match_percentage as number}% match up to $${offer.max_bonus_amount as number}`
          } else if (offer.bonus_type === 'no_deposit') {
            info += `- ${offer.bonus_name as string}: $${offer.max_bonus_amount as number} free (no deposit required)`
          } else {
            info += `- ${offer.bonus_name as string}`
          }
          info += ` [Code: ${offer.bonus_code as string}]\n`
        }
        info += '\n'
      }

      if (!promotionContext.has_active_bonuses && !promotionContext.offers_available) {
        info = 'No active bonuses or special offers at the moment.\n'
      }

      return info
    }

    // Construct the system prompt
    const systemPrompt = `${personaConfig?.system_prompt || 'You are a friendly casino host for MyPokies.'}

Context:
- Goal: ${goal}
- Player Context: ${JSON.stringify(context)}

${buildPromotionInfo()}

RESPONSE GUIDELINES:
- Keep messages under 160 characters for SMS
- Be ${personaConfig?.tone || 'friendly and engaging'}
- Include a clear call-to-action
- Never pressure or be pushy
- If relevant, mention specific bonuses or offers
- Use emojis sparingly (max 1-2)

${personaConfig?.do_rules ? `Do: ${personaConfig.do_rules.join(', ')}` : ''}
${personaConfig?.dont_rules ? `Don't: ${personaConfig.dont_rules.join(', ')}` : ''}`

    if (process.env.ANTHROPIC_API_KEY) {
      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })

      const startTime = Date.now()

      // Generate AI response
      const completion = await anthropic.messages.create({
        model: aiConfig?.default_model || 'claude-3-opus-20240229',
        max_tokens: aiConfig?.default_max_tokens || 150,
        temperature: aiConfig?.default_temperature || 0.7,
        system: systemPrompt,
        messages: [
          ...messageHistory,
          { role: 'user', content: userMessage }
        ]
      })

      const generationTime = Date.now() - startTime
      const generatedMessage = completion.content[0].type === 'text'
        ? completion.content[0].text
        : ''

      // Log the AI generation
      const totalTokens = (completion.usage.input_tokens || 0) + (completion.usage.output_tokens || 0)
      const { data: aiLog } = await supabase
        .from('ai_message_logs')
        .insert({
          conversation_id: conversationId,
          prompt: systemPrompt,
          context: { messageHistory, userMessage, goal },
          model: aiConfig?.default_model,
          generated_message: generatedMessage,
          generation_time_ms: generationTime,
          tokens_used: totalTokens
        })
        .select()
        .single()

      return NextResponse.json({
        success: true,
        message: generatedMessage,
        logId: aiLog?.id,
        confidence: 0.85, // Mock confidence score
        generationTime
      })
    }

    // Mock response for development
    const mockResponses = {
      signup: `Hey there! 🎰 Your $20 bonus is waiting at MyPokies! Sign up with this number & it's instantly yours. Ready? mypokies.com/welcome`,
      deposit: `Welcome back! 💰 Deposit now & get 100% match up to $500! Plus 50 free spins. Don't miss out: mypokies.com/deposit`,
      reactivation: `We miss you at MyPokies! 🎁 Come back for an exclusive $50 bonus - no deposit needed! Claim: mypokies.com/vip`,
      support: `I'm here to help! What can I assist you with today? Reply with your question or call our VIP line: 1-800-MYPOKIES`
    }

    const mockMessage = mockResponses[goal as keyof typeof mockResponses] ||
      `Thanks for your message! Visit MyPokies for exclusive bonuses: mypokies.com`

    // Log mock generation
    await supabase
      .from('ai_message_logs')
      .insert({
        conversation_id: conversationId,
        prompt: systemPrompt,
        context: { userMessage, goal },
        model: 'mock',
        generated_message: mockMessage,
        generation_time_ms: 100
      })

    return NextResponse.json({
      success: true,
      message: mockMessage,
      confidence: 0.85,
      generationTime: 100,
      isDevelopment: true
    })

  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to generate AI message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}