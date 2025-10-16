'use client'

import { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Users,
  Gamepad2,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface RevenueData {
  period: string
  gross: number
  net: number
  deposits: number
  withdrawals: number
  bonuses: number
  fees: number
}

interface GameRevenue {
  game: string
  revenue: number
  players: number
  rtp: number
  change: number
}

interface RevenueStats {
  total_gross: number
  total_net: number
  avg_daily: number
  arpu: number
  avg_rtp: number
  profit_margin: number
  gross_change: number
  net_change: number
  arpu_change: number
}

interface RevenueClientProps {
  revenueData: RevenueData[]
  gameRevenue: GameRevenue[]
  stats: RevenueStats
}

export default function RevenueClient({ revenueData, gameRevenue, stats }: RevenueClientProps) {
  const [dateRange, setDateRange] = useState('30d')
  const [viewType, setViewType] = useState<'overview' | 'games' | 'players'>('overview')

  // Simple bar chart component
  const SimpleBarChart = ({ data }: { data: RevenueData[] }) => {
    const maxValue = Math.max(...data.map(d => d.gross))

    return (
      <div className="h-64 flex items-end gap-4">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full flex gap-1">
              <div className="flex-1 bg-indigo-100 rounded-t relative">
                <div
                  className="bg-indigo-600 rounded-t transition-all duration-300 hover:bg-indigo-700"
                  style={{ height: `${(item.gross / maxValue) * 200}px` }}
                  title={`Gross: $${item.gross.toLocaleString()}`}
                ></div>
              </div>
              <div className="flex-1 bg-green-100 rounded-t relative">
                <div
                  className="bg-green-600 rounded-t transition-all duration-300 hover:bg-green-700"
                  style={{ height: `${(item.net / maxValue) * 200}px` }}
                  title={`Net: $${item.net.toLocaleString()}`}
                ></div>
              </div>
            </div>
            <span className="text-xs text-gray-500 mt-2">{item.period}</span>
          </div>
        ))}
      </div>
    )
  }

  // Calculate totals for revenue breakdown
  const totalDeposits = revenueData.reduce((sum, d) => sum + d.deposits, 0)
  const totalWithdrawals = revenueData.reduce((sum, d) => sum + d.withdrawals, 0)
  const totalBonuses = revenueData.reduce((sum, d) => sum + d.bonuses, 0)
  const totalFees = revenueData.reduce((sum, d) => sum + d.fees, 0)

  // Find best performing day
  const bestDay = revenueData.reduce((max, item) =>
    item.gross > (max?.gross || 0) ? item : max, revenueData[0] || { period: 'N/A', gross: 0 }
  )

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="text-gray-600 mt-2">Track casino revenue and financial performance</p>
        </div>
        <div className="flex items-center gap-3">
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
            <DollarSign className="w-6 h-6 text-green-600" />
            <span className={`inline-flex items-center gap-1 text-xs ${stats.gross_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.gross_change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stats.gross_change).toFixed(1)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${(stats.total_gross / 1000).toFixed(1)}K</p>
          <p className="text-sm text-gray-600">Gross Revenue</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <span className={`inline-flex items-center gap-1 text-xs ${stats.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.net_change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stats.net_change).toFixed(1)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${(stats.total_net / 1000).toFixed(1)}K</p>
          <p className="text-sm text-gray-600">Net Revenue</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${(stats.avg_daily / 1000).toFixed(1)}K</p>
          <p className="text-sm text-gray-600">Daily Average</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span className={`inline-flex items-center gap-1 text-xs ${stats.arpu_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.arpu_change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stats.arpu_change).toFixed(1)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${stats.arpu.toFixed(0)}</p>
          <p className="text-sm text-gray-600">ARPU</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Gamepad2 className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avg_rtp.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Avg. RTP</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <PieChart className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.profit_margin.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Profit Margin</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['overview', 'games', 'players'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setViewType(view)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewType === view
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Revenue Chart */}
      {viewType === 'overview' && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded"></div>
                  <span className="text-sm text-gray-600">Gross Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span className="text-sm text-gray-600">Net Revenue</span>
                </div>
              </div>
            </div>
            <SimpleBarChart data={revenueData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Revenue Breakdown</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total Deposits</span>
                    <span className="text-sm font-semibold text-gray-900">+${(totalDeposits / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total Withdrawals</span>
                    <span className="text-sm font-semibold text-gray-900">-${(totalWithdrawals / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: `${(totalWithdrawals / totalDeposits) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Bonuses Given</span>
                    <span className="text-sm font-semibold text-gray-900">-${(totalBonuses / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(totalBonuses / totalDeposits) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Processing Fees</span>
                    <span className="text-sm font-semibold text-gray-900">-${(totalFees / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${(totalFees / totalDeposits) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Net Revenue</span>
                  <span className="text-2xl font-bold text-green-600">${(stats.total_net / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>

            {/* Top Performing Days */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Highlights</h2>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-green-900">Best Day</span>
                    <span className="text-sm text-green-700">{bestDay.period}</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">${(bestDay.gross / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-green-700 mt-1">
                    {((bestDay.gross / stats.avg_daily - 1) * 100).toFixed(0)}% above average
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-900">Peak Hour</span>
                    <span className="text-sm text-blue-700">8:00 PM - 9:00 PM</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">$8.5K</p>
                  <p className="text-xs text-blue-700 mt-1">Average hourly revenue</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-purple-900">Growth Rate</span>
                    <span className="text-sm text-purple-700">vs Last Period</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">+{stats.gross_change.toFixed(1)}%</p>
                  <p className="text-xs text-purple-700 mt-1">${(stats.total_gross * stats.gross_change / 100 / 1000).toFixed(0)}K increase</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Game Revenue */}
      {viewType === 'games' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Revenue by Game Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Game Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Players
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RTP %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Share
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gameRevenue.map((game) => {
                  const totalRevenue = gameRevenue.reduce((sum, g) => sum + g.revenue, 0)
                  const share = (game.revenue / totalRevenue) * 100
                  return (
                    <tr key={game.game} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {game.game}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">
                          ${game.revenue.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {game.players.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {game.rtp}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 ${
                          game.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {game.change > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">{Math.abs(game.change)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Player Revenue */}
      {viewType === 'players' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Player Revenue Segments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">High Value (Top 10%)</h3>
              <p className="text-2xl font-bold text-gray-900">${(stats.total_gross * 0.638 / 1000).toFixed(0)}K</p>
              <p className="text-sm text-gray-600 mt-1">63.8% of total revenue</p>
              <p className="text-xs text-gray-500 mt-2">145 players</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Medium Value (40%)</h3>
              <p className="text-2xl font-bold text-gray-900">${(stats.total_gross * 0.292 / 1000).toFixed(0)}K</p>
              <p className="text-sm text-gray-600 mt-1">29.2% of total revenue</p>
              <p className="text-xs text-gray-500 mt-2">580 players</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Low Value (50%)</h3>
              <p className="text-2xl font-bold text-gray-900">${(stats.total_gross * 0.07 / 1000).toFixed(0)}K</p>
              <p className="text-sm text-gray-600 mt-1">7% of total revenue</p>
              <p className="text-xs text-gray-500 mt-2">725 players</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
