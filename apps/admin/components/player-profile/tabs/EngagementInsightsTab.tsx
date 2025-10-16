import React from 'react'
import Link from 'next/link'
import {
  Brain,
  Target,
  BarChart3,
  Calendar,
  Clock,
  AlertCircle,
  TrendingDown,
  Gift,
  MessageSquare,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import type { TabProps } from '../types'

export function EngagementInsightsTab({ player }: TabProps) {
  return (
    <div className="space-y-6">
      {/* Behavioral Analytics Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Behavioral Analytics
          </h3>
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Recalculate
          </button>
        </div>

        <div className="p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Last 10 Active Weeks</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">$0</p>
              <p className="text-sm text-gray-600">Avg Deposit/Week</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="text-xs font-medium text-green-600">Pattern Detected</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">—</p>
              <p className="text-sm text-gray-600">Most Frequent Deposit</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-xs font-medium text-orange-600">Activity Status</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">—</p>
              <p className="text-sm text-gray-600">Since Last Deposit</p>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Deposit Patterns</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Active Weeks (Last 20)</span>
                  <span className="font-medium text-gray-900">0 weeks</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Avg Per Transaction</span>
                  <span className="font-medium text-gray-900">$0</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Deposits Analyzed</span>
                  <span className="font-medium text-gray-900">0</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Deposit Frequency</span>
                  <span className="font-medium text-gray-900">—</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Engagement Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Consistent Play Weeks</span>
                  <span className="font-medium text-gray-900">0 weeks</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Activity Pattern</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    No Pattern
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Data Quality Score</span>
                  <span className="font-medium text-gray-900">—</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Analysis</span>
                  <span className="font-medium text-gray-900">Never</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Conditions */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" />
            Engagement Triggers
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Missed Pattern Trigger */}
            <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-orange-300 transition-colors">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Missed Deposit Pattern</h4>
                  <p className="text-xs text-gray-600 mb-2">
                    No pattern detected
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Not Active
                  </span>
                </div>
              </div>
            </div>

            {/* Jackpot Proximity */}
            <div className="p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Jackpot Ticket Proximity</h4>
                  <p className="text-xs text-gray-600 mb-2">
                    No jackpot data available
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Not Active
                  </span>
                </div>
              </div>
            </div>

            {/* Engaged Dropout */}
            <div className="p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-3">
                <TrendingDown className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Engaged Player Dropout</h4>
                  <p className="text-xs text-gray-600 mb-2">
                    No activity data available
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Not Active
                  </span>
                </div>
              </div>
            </div>

            {/* Loss Recovery */}
            <div className="p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Loss Recovery Opportunity</h4>
                  <p className="text-xs text-gray-600 mb-2">
                    No loss data available
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Not Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Outreach Messages */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            Scheduled Outreach Messages
          </h3>
          <Link href={`/dashboard/crm/scheduled-messages?player=${player.id}`}>
            <button className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1">
              View All
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {/* Empty state when no messages */}
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No scheduled messages for this player</p>
          </div>
        </div>
      </div>
    </div>
  )
}