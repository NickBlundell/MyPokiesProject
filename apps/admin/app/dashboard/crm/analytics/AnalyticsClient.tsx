'use client'

import { useState } from 'react'
import {
  TrendingUp,
  Users,
  MessageSquare,
  Bot,
  DollarSign,
  Activity,
  CheckCircle,
  Calendar,
  Download
} from 'lucide-react'

interface ConversionFunnel {
  stage: string
  count: number
  percentage: number
}

interface CampaignMetric {
  name: string
  sent: number
  delivered: number
  responded: number
  converted: number
  revenue: number
  roi: number
}

interface AnalyticsStats {
  sms_sent: number
  delivery_rate: number
  response_rate: number
  conversion_rate: number
  revenue: number
  ai_success_rate: number
}

interface AnalyticsClientProps {
  funnelData: ConversionFunnel[]
  campaignMetrics: CampaignMetric[]
  stats: AnalyticsStats
}

export default function AnalyticsClient({ funnelData, campaignMetrics, stats }: AnalyticsClientProps) {
  const [dateRange, setDateRange] = useState('7d')

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SMS Conversion Analytics</h1>
          <p className="text-gray-600 mt-2">Track SMS campaign performance and conversion metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex bg-white border border-gray-300 rounded-lg">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 text-sm font-medium ${
                  dateRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                } first:rounded-l-lg last:rounded-r-lg`}
              >
                {range === '24h' ? 'Today' :
                 range === '7d' ? '7 Days' :
                 range === '30d' ? '30 Days' :
                 '90 Days'}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Custom Range</span>
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.sms_sent.toLocaleString()}</p>
          <p className="text-sm text-gray-600">SMS Sent</p>
          <p className="text-xs text-green-600 mt-1">+12% vs last period</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.delivery_rate.toFixed(0)}%</p>
          <p className="text-sm text-gray-600">Delivery Rate</p>
          <p className="text-xs text-green-600 mt-1">+2% vs last period</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.response_rate.toFixed(0)}%</p>
          <p className="text-sm text-gray-600">Response Rate</p>
          <p className="text-xs text-green-600 mt-1">+5% vs last period</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.conversion_rate.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Conversion Rate</p>
          <p className="text-xs text-green-600 mt-1">+1.2% vs last period</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${(stats.revenue / 1000).toFixed(1)}K</p>
          <p className="text-sm text-gray-600">Revenue</p>
          <p className="text-xs text-green-600 mt-1">+28% vs last period</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Bot className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.ai_success_rate.toFixed(0)}%</p>
          <p className="text-sm text-gray-600">AI Success</p>
          <p className="text-xs text-green-600 mt-1">+8% vs last period</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">SMS Conversion Funnel</h2>
        <div className="space-y-4">
          {funnelData.map((stage, index) => (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{stage.stage}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">{stage.count.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-2">({stage.percentage}%)</span>
                </div>
              </div>
              <div className="ml-11 mr-24">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
              {index < funnelData.length - 1 && (
                <div className="ml-11 mt-2 mb-4">
                  <div className="w-0.5 h-6 bg-gray-300 ml-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Conversion Metrics */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Avg. Messages to Convert</p>
            <p className="text-2xl font-semibold text-gray-900">3.8</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg. Time to Convert</p>
            <p className="text-2xl font-semibold text-gray-900">2.4 hrs</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Cost per Conversion</p>
            <p className="text-2xl font-semibold text-gray-900">$0.42</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* AI Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">AI Performance Metrics</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">AI vs Human Conversion Rate</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-gray-500">AI Generated</span>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-3">
                    <p className="text-xl font-semibold text-purple-900">9.2%</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-gray-500">Human Written</span>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <p className="text-xl font-semibold text-blue-900">7.1%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">AI Response Quality</p>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Engagement Score</span>
                    <span className="text-xs text-gray-900">82%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '82%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Sentiment Score</span>
                    <span className="text-xs text-gray-900">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Response Relevance</span>
                    <span className="text-xs text-gray-900">91%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '91%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Cost Analysis</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">AI Cost/Message</p>
                  <p className="text-lg font-semibold text-gray-900">$0.002</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Human Cost/Message</p>
                  <p className="text-lg font-semibold text-gray-900">$0.15</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Source Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Lead Source Performance</h2>
          <div className="space-y-4">
            {[
              { source: 'Facebook', leads: 2100, converted: 189, rate: 9.0, color: 'bg-blue-600' },
              { source: 'Google Ads', leads: 1500, converted: 142, rate: 9.5, color: 'bg-red-600' },
              { source: 'Instagram', leads: 800, converted: 56, rate: 7.0, color: 'bg-pink-600' },
              { source: 'Direct', leads: 600, converted: 38, rate: 6.3, color: 'bg-green-600' }
            ].map((source) => (
              <div key={source.source}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{source.source}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{source.converted}</span>
                    <span className="text-xs text-gray-500"> / {source.leads}</span>
                    <span className="text-xs text-green-600 ml-2">({source.rate}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${source.color} h-2 rounded-full`}
                    style={{ width: `${(source.converted / source.leads) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Best Performing Segments</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <span className="text-xs text-green-900">VIP Reactivation</span>
                <span className="text-xs font-semibold text-green-900">15.2% conversion</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="text-xs text-blue-900">New Players - Weekend</span>
                <span className="text-xs font-semibold text-blue-900">12.8% conversion</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                <span className="text-xs text-purple-900">High-Value Leads</span>
                <span className="text-xs font-semibold text-purple-900">11.5% conversion</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Converted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaignMetrics.map((campaign) => (
                <tr key={campaign.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.sent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span>{campaign.delivered.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({((campaign.delivered / campaign.sent) * 100).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span>{campaign.responded.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({((campaign.responded / campaign.sent) * 100).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span>{campaign.converted.toLocaleString()}</span>
                    <span className="text-xs text-green-600 ml-1">
                      ({((campaign.converted / campaign.sent) * 100).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${campaign.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">{campaign.roi}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
