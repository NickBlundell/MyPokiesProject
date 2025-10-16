'use client'

import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  CreditCard,
  Gift,
  AlertCircle,
  UserCheck
} from 'lucide-react'

interface KPIData {
  total_players: number
  active_players_24h: number
  today_deposits: number
  today_revenue: number
  active_bonuses: number
  vip_players: number
  today_withdrawals: number
  pending_kyc: number
}

interface KPICard {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease'
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
}

export default function DashboardClient({ kpis }: { kpis: KPIData }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const kpiCards: KPICard[] = [
    {
      title: 'Total Players',
      value: kpis.total_players.toLocaleString(),
      change: 0,
      changeType: 'increase',
      icon: Users,
      iconColor: 'text-blue-600'
    },
    {
      title: 'Active Players (24h)',
      value: kpis.active_players_24h.toLocaleString(),
      change: 0,
      changeType: 'increase',
      icon: Activity,
      iconColor: 'text-green-600'
    },
    {
      title: "Today's Deposits",
      value: formatCurrency(kpis.today_deposits),
      change: 0,
      changeType: 'increase',
      icon: CreditCard,
      iconColor: 'text-emerald-600'
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(kpis.today_revenue),
      change: 0,
      changeType: 'increase',
      icon: DollarSign,
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Active Bonuses',
      value: kpis.active_bonuses.toLocaleString(),
      change: 0,
      changeType: 'decrease',
      icon: Gift,
      iconColor: 'text-purple-600'
    },
    {
      title: 'VIP Players',
      value: kpis.vip_players.toLocaleString(),
      change: 0,
      changeType: 'increase',
      icon: UserCheck,
      iconColor: 'text-yellow-600'
    },
    {
      title: "Today's Withdrawals",
      value: formatCurrency(kpis.today_withdrawals),
      change: 0,
      changeType: 'increase',
      icon: TrendingUp,
      iconColor: 'text-red-600'
    },
    {
      title: 'Pending KYC',
      value: kpis.pending_kyc.toLocaleString(),
      icon: AlertCircle,
      iconColor: 'text-orange-600'
    }
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Overview Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor your casino&apos;s key performance indicators</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gray-50 ${card.iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {card.change !== undefined && card.change !== 0 && (
                  <div className={`text-sm font-medium ${
                    card.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.changeType === 'increase' ? '+' : '-'}{card.change}%
                  </div>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <span className="text-sm text-gray-700">View Players</span>
          </button>
          <button className="p-4 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Gift className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <span className="text-sm text-gray-700">Assign Bonus</span>
          </button>
          <button className="p-4 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <span className="text-sm text-gray-700">Process Withdrawal</span>
          </button>
          <button className="p-4 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <span className="text-sm text-gray-700">Review KYC</span>
          </button>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">No recent activity</p>
                <p className="text-xs text-gray-500">Activity will appear here when available</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">No Active Alerts</p>
                  <p className="text-xs text-gray-700 mt-1">System alerts will appear here when available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
