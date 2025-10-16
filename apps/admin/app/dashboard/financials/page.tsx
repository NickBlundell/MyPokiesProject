'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Receipt,
  AlertCircle,
  BarChart,
  Activity,
  ChevronRight,
  Download,
  RefreshCw,
  Clock,
  CheckCircle
} from 'lucide-react'

export default function FinancialsPage() {
  const [period, setPeriod] = useState('7d')

  // Quick navigation cards
  const financeLinks = [
    {
      title: 'Transactions',
      description: 'View all financial transactions',
      href: '/dashboard/financials/transactions',
      icon: Receipt,
      color: 'bg-blue-600',
      stats: { value: '3,421', label: 'Total (24h)', trend: '+12%' }
    },
    {
      title: 'Withdrawals',
      description: 'Process withdrawal requests',
      href: '/dashboard/financials/withdrawals',
      icon: ArrowUpRight,
      color: 'bg-orange-600',
      stats: { value: '23', label: 'Pending', trend: '3 urgent' }
    },
    {
      title: 'Revenue',
      description: 'Revenue analytics and metrics',
      href: '/dashboard/financials/revenue',
      icon: TrendingUp,
      color: 'bg-green-600',
      stats: { value: '$125.4K', label: 'Today', trend: '+15%' }
    }
  ]

  // Recent transactions
  const recentTransactions = [
    { id: 'TXN001', user: 'player123', type: 'deposit', amount: 100, status: 'completed', time: '5 min ago' },
    { id: 'TXN002', user: 'highroller', type: 'withdrawal', amount: 5000, status: 'pending', time: '10 min ago' },
    { id: 'TXN003', user: 'luckyplayer', type: 'deposit', amount: 250, status: 'completed', time: '15 min ago' },
    { id: 'TXN004', user: 'vipuser', type: 'bet', amount: 50, status: 'completed', time: '20 min ago' },
    { id: 'TXN005', user: 'newplayer', type: 'bonus', amount: 20, status: 'completed', time: '25 min ago' }
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />
      case 'bet':
        return <TrendingDown className="w-4 h-4 text-orange-600" />
      case 'win':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'bonus':
        return <DollarSign className="w-4 h-4 text-purple-600" />
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string, icon: React.ComponentType<{ className?: string }> }> = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }

    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Overview</h1>
          <p className="text-gray-600 mt-2">Monitor financial performance and transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <ArrowDownLeft className="w-6 h-6 text-green-600" />
            <span className="text-xs text-green-600">+15%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">$125.4K</p>
          <p className="text-sm text-gray-600">Deposits (24h)</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <ArrowUpRight className="w-6 h-6 text-red-600" />
            <span className="text-xs text-red-600">+8%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">$45.2K</p>
          <p className="text-sm text-gray-600">Withdrawals (24h)</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-purple-600" />
            <span className="text-xs text-green-600">+22%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">$80.2K</p>
          <p className="text-sm text-gray-600">Net Revenue</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">$892K</p>
          <p className="text-sm text-gray-600">Total Volume</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <span className="text-xs text-green-600">+3.2%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">12.8%</p>
          <p className="text-sm text-gray-600">Margin</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">3,421</p>
          <p className="text-sm text-gray-600">Transactions</p>
        </div>
      </div>

      {/* Financial Alerts */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900">23 Pending Withdrawals</h3>
            <p className="text-sm text-yellow-700 mt-1">
              There are 23 withdrawal requests pending review, including 5 high-value withdrawals over $5,000.
              Review them promptly to maintain player satisfaction.
            </p>
          </div>
          <Link
            href="/dashboard/financials/withdrawals"
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
          >
            Review Now
          </Link>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {financeLinks.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 ${link.color} rounded-lg`}>
                <link.icon className="w-6 h-6 text-white" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{link.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{link.description}</p>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{link.stats.value}</p>
                  <p className="text-xs text-gray-500">{link.stats.label}</p>
                </div>
                <span className={`text-xs ${link.stats.trend.startsWith('+') ? 'text-green-600' : 'text-orange-600'}`}>
                  {link.stats.trend}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
            <Link href="/dashboard/financials/revenue" className="text-sm text-indigo-600 hover:text-indigo-700">
              View Details
            </Link>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Revenue chart visualization</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-lg font-semibold text-gray-900">$125.4K</p>
              <p className="text-xs text-green-600">+15%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">This Week</p>
              <p className="text-lg font-semibold text-gray-900">$687.2K</p>
              <p className="text-xs text-green-600">+8%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">This Month</p>
              <p className="text-lg font-semibold text-gray-900">$2.4M</p>
              <p className="text-xs text-green-600">+12%</p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link href="/dashboard/financials/transactions" className="text-sm text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  {getTypeIcon(transaction.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.user}
                    </p>
                    <p className="text-xs text-gray-500">{transaction.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    ['deposit', 'win', 'bonus'].includes(transaction.type) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {['deposit', 'win', 'bonus'].includes(transaction.type) ? '+' : '-'}
                    ${transaction.amount}
                  </p>
                  <p className="text-xs text-gray-500">{transaction.time}</p>
                </div>
                <div>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Methods</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Credit Card</span>
              <span className="text-sm font-medium text-gray-900">45%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Bank Transfer</span>
              <span className="text-sm font-medium text-gray-900">28%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Crypto</span>
              <span className="text-sm font-medium text-gray-900">18%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">E-Wallet</span>
              <span className="text-sm font-medium text-gray-900">9%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Revenue Sources</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Slots</span>
              <span className="text-sm font-medium text-gray-900">62%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Table Games</span>
              <span className="text-sm font-medium text-gray-900">22%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Live Casino</span>
              <span className="text-sm font-medium text-gray-900">12%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Sports</span>
              <span className="text-sm font-medium text-gray-900">4%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Processing Times</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Deposits</span>
              <span className="text-sm font-medium text-green-600">Instant</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Withdrawals</span>
              <span className="text-sm font-medium text-yellow-600">2-4 hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Verification</span>
              <span className="text-sm font-medium text-blue-600">30 min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Support</span>
              <span className="text-sm font-medium text-purple-600">15 min</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk Indicators</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Chargeback Rate</span>
              <span className="text-sm font-medium text-green-600">0.2%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Failed Payments</span>
              <span className="text-sm font-medium text-yellow-600">1.8%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fraud Rate</span>
              <span className="text-sm font-medium text-green-600">0.05%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">AML Flags</span>
              <span className="text-sm font-medium text-orange-600">3 today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}