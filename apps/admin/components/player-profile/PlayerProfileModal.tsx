'use client'

import React, { useState, lazy, Suspense } from 'react'
import {
  X,
  User,
  TrendingUp,
  MessageSquare,
  Brain,
  DollarSign,
  Gift,
  Activity,
  Download,
  RefreshCw,
  Ban
} from 'lucide-react'
import { StatusBadge } from './common/StatusBadge'
import { VIPBadge } from './common/VIPBadge'
import type { PlayerModalProps } from './types'

// Lazy load tabs for better performance
const OverviewTab = lazy(() => import('./tabs/OverviewTab').then(m => ({ default: m.OverviewTab })))
const PnLAnalysisTab = lazy(() => import('./tabs/PnLAnalysisTab').then(m => ({ default: m.PnLAnalysisTab })))
const SMSConversationsTab = lazy(() => import('./tabs/SMSConversationsTab').then(m => ({ default: m.SMSConversationsTab })))
const EngagementInsightsTab = lazy(() => import('./tabs/EngagementInsightsTab').then(m => ({ default: m.EngagementInsightsTab })))
const TransactionsTab = lazy(() => import('./tabs/TransactionsTab').then(m => ({ default: m.TransactionsTab })))
const BonusesTab = lazy(() => import('./tabs/BonusesTab').then(m => ({ default: m.BonusesTab })))
const ActivityTab = lazy(() => import('./tabs/ActivityTab').then(m => ({ default: m.ActivityTab })))

// Loading spinner component
function TabLoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )
}

export function PlayerProfileModal({ player, isOpen, onClose }: PlayerModalProps) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!isOpen || !player) return null

  const handleExport = () => {
    console.log('Exporting player data...')
  }

  const handleRefresh = () => {
    console.log('Refreshing player data...')
  }

  const handleSuspend = () => {
    console.log('Suspending player...')
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'pnl', label: 'P&L Analysis', icon: TrendingUp },
    { id: 'sms', label: 'SMS Conversations', icon: MessageSquare },
    { id: 'engagement', label: 'Engagement Insights', icon: Brain },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'bonuses', label: 'Bonuses', icon: Gift },
    { id: 'activity', label: 'Activity', icon: Activity }
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="absolute right-0 top-0 h-full w-full max-w-5xl bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Player Profile</h2>
                <p className="text-sm text-gray-500">ID: {player.external_user_id || player.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleSuspend}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Suspend
              </button>
            </div>
          </div>
        </div>

        {/* Player Info Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={player.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">VIP Tier</p>
              <div className="mt-1">
                <VIPBadge tier={player.loyalty_tier || 'Bronze'} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p className="text-sm font-semibold text-gray-900">
                ${(player.balance || 0).toLocaleString()}
                {player.bonus_balance && player.bonus_balance > 0 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (+${player.bonus_balance.toLocaleString()})
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Deposits</p>
              <p className="text-sm font-semibold text-gray-900">
                ${(player.total_deposits || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Joined</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(player.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-200">
          <nav className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-indigo-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content with lazy loading */}
        <div className="px-6 py-6">
          <Suspense fallback={<TabLoadingSpinner />}>
            {activeTab === 'overview' && <OverviewTab player={player} />}
            {activeTab === 'pnl' && <PnLAnalysisTab player={player} />}
            {activeTab === 'sms' && <SMSConversationsTab player={player} />}
            {activeTab === 'engagement' && <EngagementInsightsTab player={player} />}
            {activeTab === 'transactions' && <TransactionsTab player={player} />}
            {activeTab === 'bonuses' && <BonusesTab player={player} />}
            {activeTab === 'activity' && <ActivityTab player={player} />}
          </Suspense>
        </div>
      </div>
    </div>
  )
}