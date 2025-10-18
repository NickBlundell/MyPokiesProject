import React, { useState } from 'react'
import { MessageSquare, Bot, Send } from 'lucide-react'
import type { TabProps, Conversation } from '../types'

export function SMSConversationsTab({ player: _player }: TabProps) {
  const [messageInput, setMessageInput] = useState('')

  // Mock conversations - will be replaced with real data
  const mockConversations: Conversation[] = []

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // Handle sending message
      console.log('Sending message:', messageInput)
      setMessageInput('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Conversation History</h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                <Bot className="w-3 h-3" />
                AI Enabled
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {mockConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No conversations yet</p>
            </div>
          ) : (
            mockConversations.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${msg.type === 'outbound' ? 'order-2' : ''}`}>
                  {msg.aiGenerated && (
                    <p className="text-xs text-purple-600 mb-1 flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      AI Generated
                    </p>
                  )}
                  <div className={`px-4 py-2 rounded-lg ${
                    msg.type === 'outbound'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{msg.time}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}