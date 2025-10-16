'use client'

import { useState } from 'react'
import {
  Mail,
  MessageSquare,
  Shield,
  Database,
  Bell,
  CheckCircle,
  XCircle,
  TestTube,
  Save,
  AlertCircle
} from 'lucide-react'

type TabType = 'email' | 'sms' | 'database' | 'security' | 'notifications'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('email')
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Email settings state
  const [emailProvider, setEmailProvider] = useState('sendgrid')
  const [emailApiKey, setEmailApiKey] = useState('')
  const [emailFromAddress, setEmailFromAddress] = useState('noreply@mypokies.com')
  const [emailFromName, setEmailFromName] = useState('MyPokies Casino')

  // SMS settings state
  const [smsProvider, setSmsProvider] = useState('twilio')
  const [smsAccountSid, setSmsAccountSid] = useState('')
  const [smsAuthToken, setSmsAuthToken] = useState('')
  const [smsFromNumber, setSmsFromNumber] = useState('')

  const handleTestEmail = async () => {
    setLoading(true)
    setTestResult(null)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (emailApiKey && emailFromAddress) {
      setTestResult({
        type: 'success',
        message: 'Test email sent successfully! Check your inbox.'
      })
    } else {
      setTestResult({
        type: 'error',
        message: 'Please fill in all required email configuration fields.'
      })
    }
    setLoading(false)
  }

  const handleTestSms = async () => {
    setLoading(true)
    setTestResult(null)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (smsAccountSid && smsAuthToken && smsFromNumber) {
      setTestResult({
        type: 'success',
        message: 'Test SMS sent successfully! Check your phone.'
      })
    } else {
      setTestResult({
        type: 'error',
        message: 'Please fill in all required SMS configuration fields.'
      })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setLoading(true)
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1500))
    setTestResult({
      type: 'success',
      message: 'Settings saved successfully!'
    })
    setLoading(false)
  }

  const tabs = [
    { id: 'email' as TabType, label: 'Email Configuration', icon: Mail },
    { id: 'sms' as TabType, label: 'SMS Configuration', icon: MessageSquare },
    { id: 'database' as TabType, label: 'Database', icon: Database },
    { id: 'security' as TabType, label: 'Security', icon: Shield },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure admin panel settings and integrations</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Alert Messages */}
      {testResult && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          testResult.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {testResult.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 mt-0.5" />
          )}
          <p className="text-sm">{testResult.message}</p>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Email Configuration */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Service Provider</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={emailProvider}
                    onChange={(e) => setEmailProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="sendgrid">SendGrid</option>
                    <option value="resend">Resend</option>
                    <option value="mailgun">Mailgun</option>
                    <option value="ses">Amazon SES</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={emailApiKey}
                    onChange={(e) => setEmailApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={emailFromAddress}
                    onChange={(e) => setEmailFromAddress(e.target.value)}
                    placeholder="noreply@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailFromName}
                    onChange={(e) => setEmailFromName(e.target.value)}
                    placeholder="Your Casino Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Test Configuration</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Send a test email to verify your configuration is working correctly.
                </p>
                <button
                  onClick={handleTestEmail}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMS Configuration */}
        {activeTab === 'sms' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">SMS Service Provider</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={smsProvider}
                    onChange={(e) => setSmsProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="twilio">Twilio</option>
                    <option value="messagebird">MessageBird</option>
                    <option value="vonage">Vonage (Nexmo)</option>
                    <option value="sns">Amazon SNS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account SID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={smsAccountSid}
                    onChange={(e) => setSmsAccountSid(e.target.value)}
                    placeholder="Enter your Account SID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auth Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={smsAuthToken}
                    onChange={(e) => setSmsAuthToken(e.target.value)}
                    placeholder="Enter your Auth Token..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={smsFromNumber}
                    onChange={(e) => setSmsFromNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Test Configuration</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Send a test SMS to verify your configuration is working correctly.
                </p>
                <button
                  onClick={handleTestSms}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send Test SMS'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Database Settings */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Configuration</h2>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Supabase PostgreSQL</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Connected to: hupruyttzgeytlysobar.supabase.co
                    </p>
                    <div className="mt-3 space-y-2 text-xs text-gray-500">
                      <p>• Database Version: PostgreSQL 15.1</p>
                      <p>• Connection Pool: 25 connections</p>
                      <p>• Storage Used: 124 MB / 500 MB</p>
                      <p>• Last Backup: 2 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Two-Factor Authentication</h3>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-gray-700">Require 2FA for all admin accounts</span>
                  </label>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">IP Whitelisting</h3>
                  <label className="flex items-center gap-3 mb-3">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-gray-700">Enable IP whitelist for admin access</span>
                  </label>
                  <textarea
                    placeholder="Enter IP addresses, one per line..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Session Management</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <span className="text-sm text-gray-700">Session timeout (minutes):</span>
                      <input
                        type="number"
                        defaultValue="30"
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Admin Alerts</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm text-gray-700">Large deposits ({'>'}$5,000)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm text-gray-700">Large withdrawals ({'>'}$5,000)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm text-gray-700">New VIP player registrations</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm text-gray-700">Failed KYC verifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm text-gray-700">System errors and downtime</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Report Schedule</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm text-gray-700">Daily revenue report (9:00 AM)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm text-gray-700">Weekly performance summary (Monday)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-sm text-gray-700">Monthly compliance report</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="w-4 h-4" />
            <span>Changes will take effect immediately</span>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}