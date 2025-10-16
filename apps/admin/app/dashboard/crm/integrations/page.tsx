'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Bot,
  DollarSign,
  Save,
  TestTube,
  Shield,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Zap
} from 'lucide-react'

export default function IntegrationsPage() {
  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    webhookUrl: '',
    active: false
  })

  const [anthropicConfig, setAnthropicConfig] = useState({
    apiKey: '',
    model: 'claude-3-opus-20240229',
    temperature: 0.7,
    maxTokens: 150,
    active: false
  })

  const [showTwilioToken, setShowTwilioToken] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [testingTwilio, setTestingTwilio] = useState(false)
  const [testingAnthropic, setTestingAnthropic] = useState(false)

  const handleTestTwilio = async () => {
    setTestingTwilio(true)
    // Simulate API test
    setTimeout(() => {
      setTestingTwilio(false)
    }, 2000)
  }

  const handleTestAnthropic = async () => {
    setTestingAnthropic(true)
    // Simulate API test
    setTimeout(() => {
      setTestingAnthropic(false)
    }, 2000)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">CRM Integrations</h1>
        <p className="text-gray-600 mt-2">Configure Twilio for SMS and Anthropic AI for automated messaging</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-8 h-8 text-indigo-600" />
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
              twilioConfig.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${twilioConfig.active ? 'bg-green-500' : 'bg-gray-400'}`} />
              {twilioConfig.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">Twilio SMS</p>
          <p className="text-xs text-gray-500">Send & receive SMS messages</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Bot className="w-8 h-8 text-purple-600" />
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
              anthropicConfig.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${anthropicConfig.active ? 'bg-green-500' : 'bg-gray-400'}`} />
              {anthropicConfig.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">Anthropic AI</p>
          <p className="text-xs text-gray-500">Automated AI responses</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">$0.00</p>
          <p className="text-xs text-gray-500">Month-to-date cost</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">0</p>
          <p className="text-xs text-gray-500">Messages today</p>
        </div>
      </div>

      {/* Twilio Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Twilio Configuration</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${
              twilioConfig.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${twilioConfig.active ? 'bg-green-500' : 'bg-gray-400'}`} />
              {twilioConfig.active ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account SID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account SID
              </label>
              <input
                type="text"
                value={twilioConfig.accountSid}
                onChange={(e) => setTwilioConfig({...twilioConfig, accountSid: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-gray-500 mt-1">Found in your Twilio Console</p>
            </div>

            {/* Auth Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Token
              </label>
              <div className="relative">
                <input
                  type={showTwilioToken ? 'text' : 'password'}
                  value={twilioConfig.authToken}
                  onChange={(e) => setTwilioConfig({...twilioConfig, authToken: e.target.value})}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••••••••••"
                />
                <button
                  onClick={() => setShowTwilioToken(!showTwilioToken)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showTwilioToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Keep this secret and secure</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twilio Phone Number
              </label>
              <input
                type="text"
                value={twilioConfig.phoneNumber}
                onChange={(e) => setTwilioConfig({...twilioConfig, phoneNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+1234567890"
              />
              <p className="text-xs text-gray-500 mt-1">Your Twilio phone number for sending SMS</p>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="https://yourapp.com/api/webhooks/twilio"
                  disabled
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
                />
                <button className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Configure this in your Twilio phone number settings</p>
            </div>
          </div>

          {/* Cost Settings */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Cost Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cost per SMS
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.0001"
                    defaultValue="0.0075"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Monthly Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    defaultValue="500"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Current Spend
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value="0.00"
                    disabled
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleTestTwilio}
              disabled={testingTwilio}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              {testingTwilio ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Anthropic Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Anthropic AI Configuration</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${
              anthropicConfig.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${anthropicConfig.active ? 'bg-green-500' : 'bg-gray-400'}`} />
              {anthropicConfig.active ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Key */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showAnthropicKey ? 'text' : 'password'}
                  value={anthropicConfig.apiKey}
                  onChange={(e) => setAnthropicConfig({...anthropicConfig, apiKey: e.target.value})}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="sk-ant-api03-••••••••••••••••"
                />
                <button
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Get your API key from console.anthropic.com</p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={anthropicConfig.model}
                onChange={(e) => setAnthropicConfig({...anthropicConfig, model: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="claude-3-opus-20240229">Claude 3 Opus (Most Capable)</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Balanced)</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Opus recommended for best conversions</p>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={anthropicConfig.temperature}
                  onChange={(e) => setAnthropicConfig({...anthropicConfig, temperature: parseFloat(e.target.value)})}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-12">{anthropicConfig.temperature}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Higher = more creative, Lower = more focused</p>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens (SMS Length)
              </label>
              <input
                type="number"
                value={anthropicConfig.maxTokens}
                onChange={(e) => setAnthropicConfig({...anthropicConfig, maxTokens: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">~150 tokens = 1 SMS message (160 chars)</p>
            </div>

            {/* Rate Limiting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Requests/Minute
              </label>
              <input
                type="number"
                defaultValue="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Prevent rate limit errors</p>
            </div>
          </div>

          {/* AI Personas */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">AI Personas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <input type="radio" name="persona" defaultChecked className="text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Friendly Host</p>
                <p className="text-xs text-gray-500">Warm, enthusiastic, uses emojis</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <input type="radio" name="persona" className="text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">VIP Concierge</p>
                <p className="text-xs text-gray-500">Professional, exclusive, sophisticated</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <input type="radio" name="persona" className="text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Win-Back Specialist</p>
                <p className="text-xs text-gray-500">Understanding, motivating, generous</p>
              </div>
            </div>
          </div>

          {/* Cost Settings */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Cost Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cost per 1K Tokens
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.001"
                    defaultValue="0.015"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Monthly Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    defaultValue="100"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Current Spend
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value="0.00"
                    disabled
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleTestAnthropic}
              disabled={testingAnthropic}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              {testingAnthropic ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  Test AI Generation
                </>
              )}
            </button>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Playground */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Test Playground</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Send Test SMS */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Send Test SMS</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <textarea
                  placeholder="Message content..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Send Test SMS
                </button>
              </div>
            </div>

            {/* Generate AI Response */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Generate AI Response</h3>
              <div className="space-y-3">
                <textarea
                  placeholder="User message to respond to..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Select goal...</option>
                  <option>Get signup</option>
                  <option>Encourage deposit</option>
                  <option>Re-engage player</option>
                </select>
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Generate Response
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}