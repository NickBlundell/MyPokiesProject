'use client'

import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download
} from 'lucide-react'

interface ChartDataPoint {
  label: string
  value: number
}

interface GamePerformance {
  name: string
  revenue: number
  players: number
  rtp: number
  trend: number
}

interface AnalyticsStats {
  total_revenue: number
  net_profit: number
  total_deposits: number
  total_withdrawals: number
  active_players: number
  revenue_change: number
  profit_change: number
  deposits_change: number
  withdrawals_change: number
  players_change: number
  avg_daily_revenue: number
  peak_revenue: number
  growth_rate: number
  projected_revenue: number
  deposit_count: number
  withdrawal_count: number
  bonus_value: number
  bonus_count: number
  avg_fee_percentage: number
}

interface AnalyticsClientProps {
  revenueData: ChartDataPoint[]
  depositData: ChartDataPoint[]
  withdrawalData: ChartDataPoint[]
  profitData: ChartDataPoint[]
  playerActivity: ChartDataPoint[]
  gamePerformance: GamePerformance[]
  stats: AnalyticsStats
}

// Simple chart component
function SimpleChart({ data, type = 'line' }: { data: ChartDataPoint[], type?: 'line' | 'bar' }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="h-64 flex items-end justify-between gap-2 px-4 pb-8 pt-4 bg-gray-50 rounded-lg relative">
      {data.map((point, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div className="relative w-full flex items-end justify-center" style={{ height: '200px' }}>
            <div
              className={`w-full ${type === 'bar' ? 'bg-indigo-500' : 'bg-indigo-400'} rounded-t transition-all hover:bg-indigo-600`}
              style={{ height: `${(point.value / maxValue) * 100}%` }}
              title={`${point.label}: ${point.value.toLocaleString()}`}
            />
          </div>
          <span className="text-xs text-gray-600 truncate w-full text-center">{point.label}</span>
        </div>
      ))}
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color = 'indigo'
}: {
  title: string
  value: string
  change?: number
  changeType?: 'increase' | 'decrease'
  icon: React.ComponentType<{ className?: string }>
  color?: string
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && change !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            changeType === 'increase' ? 'text-green-600' : 'text-red-600'
          }`}>
            {changeType === 'increase' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

export default function AnalyticsClient({
  revenueData,
  depositData,
  withdrawalData,
  profitData,
  playerActivity,
  gamePerformance,
  stats
}: AnalyticsClientProps) {
  const [dateRange, setDateRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'deposits' | 'withdrawals' | 'profit'>('revenue')

  const metricDataMap = {
    revenue: revenueData,
    deposits: depositData,
    withdrawals: withdrawalData,
    profit: profitData
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Analytics</h1>
          <p className="text-gray-600 mt-2">Monitor revenue, transactions, and financial performance</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(stats.total_revenue)}
          change={stats.revenue_change}
          changeType={stats.revenue_change >= 0 ? 'increase' : 'decrease'}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(stats.net_profit)}
          change={stats.profit_change}
          changeType={stats.profit_change >= 0 ? 'increase' : 'decrease'}
          icon={TrendingUp}
          color="indigo"
        />
        <MetricCard
          title="Total Deposits"
          value={formatCurrency(stats.total_deposits)}
          change={stats.deposits_change}
          changeType={stats.deposits_change >= 0 ? 'increase' : 'decrease'}
          icon={CreditCard}
          color="green"
        />
        <MetricCard
          title="Total Withdrawals"
          value={formatCurrency(stats.total_withdrawals)}
          change={stats.withdrawals_change}
          changeType={stats.withdrawals_change >= 0 ? 'decrease' : 'increase'}
          icon={ArrowUpRight}
          color="yellow"
        />
        <MetricCard
          title="Active Players"
          value={stats.active_players.toLocaleString()}
          change={stats.players_change}
          changeType={stats.players_change >= 0 ? 'increase' : 'decrease'}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
          <div className="flex gap-2">
            {(['revenue', 'deposits', 'withdrawals', 'profit'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1 text-sm rounded-lg ${
                  selectedMetric === metric
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <SimpleChart data={metricDataMap[selectedMetric]} type="bar" />
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Avg. Daily Revenue</p>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.avg_daily_revenue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Peak Revenue</p>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.peak_revenue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Growth Rate</p>
            <p className="text-xl font-semibold text-gray-900">{stats.growth_rate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Projection (30d)</p>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.projected_revenue)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Player Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Player Activity (24h)</h2>
          <SimpleChart data={playerActivity} type="line" />
        </div>

        {/* Transaction Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Transaction Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Deposits</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(stats.total_deposits)}</p>
                <p className="text-xs text-gray-500">{stats.deposit_count} transactions</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Withdrawals</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(stats.total_withdrawals)}</p>
                <p className="text-xs text-gray-500">{stats.withdrawal_count} transactions</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Bonuses</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(stats.bonus_value)}</p>
                <p className="text-xs text-gray-500">{stats.bonus_count} activated</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Fees</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">$0</p>
                <p className="text-xs text-gray-500">{stats.avg_fee_percentage.toFixed(2)}% avg</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Performance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Game Performance</h2>
        </div>
        {gamePerformance.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No game performance data available
          </div>
        ) : (
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
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gamePerformance.map((game) => (
                  <tr key={game.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {game.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(game.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {game.players}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {game.rtp.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-1 ${
                        game.trend >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {game.trend >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="text-sm">{game.trend.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
