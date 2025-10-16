'use client'

import { useState } from 'react'
import { Send, Phone, AlertCircle, CheckCircle2, Loader2, MessageSquare } from 'lucide-react'

interface LeadList {
  id: string
  name: string
  total_leads: number
  source: string
}

interface RecentOutbound {
  id: string
  phone_number: string
  message_content: string
  created_at: string
  delivery_status?: string
}

interface Props {
  leadLists: LeadList[]
  recentOutbound: RecentOutbound[]
}

export default function OutboundClient({ leadLists, recentOutbound }: Props) {
  const [selectedMethod, setSelectedMethod] = useState<'list' | 'manual'>('list')
  const [selectedLeadList, setSelectedLeadList] = useState<string>('')
  const [manualNumbers, setManualNumbers] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const characterCount = message.length
  const smsCount = Math.ceil(characterCount / 160)

  const handleSendMessage = async () => {
    setSuccess(null)
    setError(null)

    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    if (selectedMethod === 'list' && !selectedLeadList) {
      setError('Please select a lead list')
      return
    }

    if (selectedMethod === 'manual' && !manualNumbers.trim()) {
      setError('Please enter at least one phone number')
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/sms/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          leadListId: selectedMethod === 'list' ? selectedLeadList : undefined,
          phoneNumbers: selectedMethod === 'manual'
            ? manualNumbers.split('\n').map(n => n.trim()).filter(Boolean)
            : undefined,
          message: message.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send messages')
      }

      setSuccess(`Successfully sent ${data.sentCount} messages!`)
      setMessage('')
      setManualNumbers('')
      setSelectedLeadList('')

      // Reload the page to show new messages
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send messages')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Compose Message */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Compose Outbound Message</h2>

        {/* Alert Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Responses to outbound messages are automatically handled by the AI assistant.
              The AI will reply within 1-3 minutes with a randomized delay.
            </p>
          </div>
        </div>

        {/* Selection Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedMethod('list')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                selectedMethod === 'list'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              Lead List
            </button>
            <button
              onClick={() => setSelectedMethod('manual')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                selectedMethod === 'manual'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              Manual Numbers
            </button>
          </div>
        </div>

        {/* Lead List Selection */}
        {selectedMethod === 'list' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Lead List
            </label>
            <select
              value={selectedLeadList}
              onChange={(e) => setSelectedLeadList(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose a lead list...</option>
              {leadLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.total_leads} leads) - {list.source}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Manual Phone Numbers */}
        {selectedMethod === 'manual' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Numbers (one per line)
            </label>
            <textarea
              value={manualNumbers}
              onChange={(e) => setManualNumbers(e.target.value)}
              placeholder="+1234567890&#10;+0987654321&#10;+1122334455"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {manualNumbers.split('\n').filter(n => n.trim()).length} numbers entered
            </p>
          </div>
        )}

        {/* Message Compose */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey! 🎰 Welcome to MyPokies! Sign up now and claim your $50 bonus - no deposit needed! Join: mypokies.com/signup"
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              {characterCount} characters • {smsCount} SMS {smsCount > 1 ? 'segments' : 'segment'}
            </p>
            {characterCount > 160 && (
              <p className="text-xs text-orange-600">
                Message will be split into {smsCount} parts
              </p>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          disabled={sending}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Outbound Messages
            </>
          )}
        </button>
      </div>

      {/* Recent Outbound Messages */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Outbound Messages</h2>

        {recentOutbound.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No outbound messages sent yet</p>
            <p className="text-sm text-gray-400 mt-1">Send your first message to get started</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {recentOutbound.map((msg) => (
              <div key={msg.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {msg.phone_number}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      msg.delivery_status === 'delivered'
                        ? 'bg-green-100 text-green-700'
                        : msg.delivery_status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {msg.delivery_status || 'pending'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{msg.message_content}</p>
                <p className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
