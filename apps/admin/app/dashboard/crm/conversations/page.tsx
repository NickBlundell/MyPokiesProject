import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import ConversationsClient from './ConversationsClient'

export interface Conversation {
  id: string
  phone_number: string
  lead_name?: string
  status: string
  ai_enabled: boolean
  message_count: number
  last_message?: string
  last_message_at?: string
  conversion_goal?: string
  converted: boolean
  conversion_value?: number
  engagement_score?: number
  sentiment_score?: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  content: string
  direction: string
  timestamp: string
  ai_generated: boolean
  edited?: boolean
  delivery_status?: string
  created_at: string
}

async function getConversationsData() {
  const supabase = await createAdminClient()

  // Fetch conversations
  const { data: conversations, error: convError } = await supabase
    .from('sms_conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (convError) {
    logger.error('Error fetching conversations', convError, {
      function: 'getConversationsData',
      table: 'sms_conversations',
    })
    // Try alternative table name
    const { data: altConversations } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    const conversationsData = altConversations || []

    // Fetch messages for the conversations
    const conversationIds = conversationsData.map(c => c.id)
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true })

    // Calculate stats
    const stats = calculateStats(conversationsData, messages || [])

    return {
      conversations: conversationsData,
      messages: messages || [],
      stats
    }
  }

  // Fetch messages
  const conversationIds = conversations?.map(c => c.id) || []
  const { data: messages, error: msgError } = await supabase
    .from('sms_messages')
    .select('*')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: true })

  if (msgError) {
    logger.error('Error fetching messages', msgError, {
      function: 'getConversationsData',
      table: 'sms_messages',
    })
    // Try alternative table name
    const { data: altMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true })

    const stats = calculateStats(conversations || [], altMessages || [])

    return {
      conversations: conversations || [],
      messages: altMessages || [],
      stats
    }
  }

  const stats = calculateStats(conversations || [], messages || [])

  return {
    conversations: conversations || [],
    messages: messages || [],
    stats
  }
}

function calculateStats(conversations: Array<Record<string, unknown>>, messages: Array<Record<string, unknown>>) {
  const activeCount = conversations.filter(c => c.status === 'active').length

  // Calculate AI response rate
  const totalMessages = messages.length
  const aiMessages = messages.filter(m => m.ai_generated).length
  const aiResponseRate = totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0

  // Calculate conversion rate
  const totalConversations = conversations.length
  const convertedConversations = conversations.filter(c => c.converted).length
  const conversionRate = totalConversations > 0
    ? (convertedConversations / totalConversations) * 100
    : 0

  // Calculate average messages to convert
  let avgMessagesToConvert = 0
  if (convertedConversations > 0) {
    const convertedConvIds = conversations
      .filter(c => c.converted)
      .map(c => c.id as string)

    const messageCounts = convertedConvIds.map(id =>
      messages.filter(m => m.conversation_id === id).length
    )

    const totalMessages = messageCounts.reduce((sum, count) => sum + count, 0)
    avgMessagesToConvert = totalMessages / convertedConversations
  }

  // Calculate total conversion value
  const totalConversionValue = conversations
    .filter(c => c.converted && c.conversion_value)
    .reduce((sum, c) => sum + ((c.conversion_value as number) || 0), 0)

  return {
    activeCount,
    aiResponseRate,
    conversionRate,
    avgMessagesToConvert,
    totalConversionValue
  }
}

export default async function ConversationsPage() {
  const { conversations, messages, stats } = await getConversationsData()

  return (
    <ConversationsClient
      conversations={conversations}
      messages={messages}
      stats={stats}
    />
  )
}