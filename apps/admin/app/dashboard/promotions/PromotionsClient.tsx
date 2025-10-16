'use client'

import { useState } from 'react'
import { logDebug } from '@/lib/utils/client-logger'
import {
  Gift,
  Percent,
  DollarSign,
  CheckCircle,
  Edit2,
  Save,
  X,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  RotateCcw,
  Settings,
  Copy,
  Power,
  ChevronDown,
  ChevronUp,
  Zap,
  Trophy
} from 'lucide-react'

export interface DailyPromotion {
  id: string
  day_of_week: string
  day_number: number
  type: 'deposit_match' | 'free_spins' | 'cashback' | 'reload' | 'no_deposit'
  name: string
  description: string
  active: boolean
  bonus_code?: string
  match_percentage?: number
  max_bonus?: number
  min_deposit?: number
  free_spins_count?: number
  free_spins_game?: string
  cashback_percentage?: number
  wagering_requirement?: number
  valid_hours?: { start: string; end: string }
  vip_tiers_only?: string[]
  total_claimed?: number
  total_value?: number
}

export interface SpecialPromotion {
  id: string
  name: string
  type: 'sign_in_bonus' | 'loyalty_reward' | 'tournament' | 'jackpot_boost'
  active: boolean
  recurring: 'daily' | 'weekly' | 'monthly' | 'one_time'
  reward: string
  conditions: string[]
}

export interface PromotionStats {
  active_promotions: number
  claims_today: number
  total_value_7d: number
  conversion_rate: number
  free_spins_7d: number
}

interface PromotionsClientProps {
  dailyPromotions: DailyPromotion[]
  specialPromotions: SpecialPromotion[]
  stats: PromotionStats
}

export default function PromotionsClient({
  dailyPromotions: initialDailyPromotions,
  specialPromotions,
  stats
}: PromotionsClientProps) {
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'daily' | 'special' | 'templates'>('daily')
  const [dailyPromotions, setDailyPromotions] = useState<DailyPromotion[]>(initialDailyPromotions)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit_match':
        return <Percent className="w-4 h-4" />
      case 'free_spins':
        return <RotateCcw className="w-4 h-4" />
      case 'cashback':
        return <DollarSign className="w-4 h-4" />
      case 'reload':
        return <TrendingUp className="w-4 h-4" />
      case 'no_deposit':
        return <Gift className="w-4 h-4" />
      default:
        return <Sparkles className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit_match':
        return 'text-blue-600 bg-blue-50'
      case 'free_spins':
        return 'text-purple-600 bg-purple-50'
      case 'cashback':
        return 'text-green-600 bg-green-50'
      case 'reload':
        return 'text-orange-600 bg-orange-50'
      case 'no_deposit':
        return 'text-pink-600 bg-pink-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const handleTogglePromotion = async (id: string) => {
    logDebug('Toggle promotion', { context: 'PromotionsClient', data: { id } })

    // Optimistic update
    setDailyPromotions(prev =>
      prev.map(promo =>
        promo.id === id ? { ...promo, active: !promo.active } : promo
      )
    )

    // TODO (tracked in TODO.md): Implement API endpoint for promotion status updates
    //   Create: apps/admin/app/api/promotions/[id]/toggle/route.ts
    //   Implementation:
    //     - Authenticate admin user
    //     - Update daily_promotions table: SET active = NOT active WHERE id = id
    //     - Return updated promotion
    //   Uncomment below when API is ready:
    // try {
    //   const response = await fetch(`/api/promotions/${id}/toggle`, { method: 'POST' })
    //   if (!response.ok) throw new Error('Failed to update promotion')
    // } catch (error) {
    //   // Revert on error
    //   setDailyPromotions(prev =>
    //     prev.map(promo =>
    //       promo.id === id ? { ...promo, active: !promo.active } : promo
    //     )
    //   )
    //   logError('Failed to toggle promotion', { context: 'PromotionsClient', data: { id, error } })
    // }
  }

  const handleSavePromotion = async (id: string, updates: Partial<DailyPromotion>) => {
    logDebug('Save promotion', { context: 'PromotionsClient', data: { id, updates } })

    // Optimistic update
    setDailyPromotions(prev =>
      prev.map(promo =>
        promo.id === id ? { ...promo, ...updates } : promo
      )
    )
    setEditingDay(null)

    // TODO (tracked in TODO.md): Implement API endpoint for saving promotions
    //   Create: apps/admin/app/api/promotions/[id]/route.ts
    //   Implementation:
    //     - Authenticate admin user
    //     - Validate updates with Zod schema
    //     - Update daily_promotions table with provided fields
    //     - Return updated promotion
    //   Uncomment below when API is ready:
    // try {
    //   const response = await fetch(`/api/promotions/${id}`, {
    //     method: 'PATCH',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(updates)
    //   })
    //   if (!response.ok) throw new Error('Failed to save promotion')
    // } catch (error) {
    //   logError('Failed to save promotion', { context: 'PromotionsClient', data: { id, error } })
    // }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promotions & Bonuses</h1>
          <p className="text-gray-600 mt-2">Manage daily deposit matches, free spins, and special offers</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Duplicate Week
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Promotion
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Gift className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.active_promotions}</p>
          <p className="text-sm text-gray-600">Active Promotions</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.claims_today.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Claims Today</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${(stats.total_value_7d / 1000).toFixed(0)}K
          </p>
          <p className="text-sm text-gray-600">Total Value (7d)</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.conversion_rate.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Conversion Rate</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <RotateCcw className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(stats.free_spins_7d / 1000).toFixed(1)}K
          </p>
          <p className="text-sm text-gray-600">Free Spins (7d)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white rounded-lg border border-gray-200 p-1 w-fit">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'daily'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Daily Promotions
        </button>
        <button
          onClick={() => setActiveTab('special')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'special'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Special Offers
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'templates'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Templates
        </button>
      </div>

      {/* Daily Promotions Tab */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {dailyPromotions.map((promo) => (
            <div
              key={promo.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              {/* Promotion Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getTypeColor(promo.type)}`}>
                      {getTypeIcon(promo.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{promo.day_of_week}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          promo.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {promo.active ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {promo.active ? 'Active' : 'Inactive'}
                        </span>
                        {promo.bonus_code && (
                          <code className="px-2 py-1 text-xs bg-gray-100 rounded">
                            {promo.bonus_code}
                          </code>
                        )}
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-1">{promo.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{promo.description}</p>

                      {/* Promotion Details */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {promo.match_percentage && (
                          <div className="flex items-center gap-1">
                            <Percent className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 font-medium">
                              {promo.match_percentage}% Match
                            </span>
                          </div>
                        )}
                        {promo.max_bonus && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">
                              Up to ${promo.max_bonus}
                            </span>
                          </div>
                        )}
                        {promo.min_deposit && (
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">
                              Min. ${promo.min_deposit}
                            </span>
                          </div>
                        )}
                        {promo.free_spins_count && (
                          <div className="flex items-center gap-1">
                            <RotateCcw className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 font-medium">
                              {promo.free_spins_count} Free Spins
                            </span>
                            {promo.free_spins_game && (
                              <span className="text-gray-500">
                                on {promo.free_spins_game}
                              </span>
                            )}
                          </div>
                        )}
                        {promo.cashback_percentage && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 font-medium">
                              {promo.cashback_percentage}% Cashback
                            </span>
                          </div>
                        )}
                        {promo.wagering_requirement && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">
                              {promo.wagering_requirement}x Wagering
                            </span>
                          </div>
                        )}
                        {promo.vip_tiers_only && promo.vip_tiers_only.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Trophy className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">
                              {promo.vip_tiers_only.join(', ')} Only
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePromotion(promo.id)}
                      className={`p-2 rounded-lg ${
                        promo.active
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                      title={promo.active ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingDay(editingDay === promo.id ? null : promo.id)}
                      className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setExpandedDay(expandedDay === promo.id ? null : promo.id)}
                      className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="View Stats"
                    >
                      {expandedDay === promo.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Edit Form */}
                {editingDay === promo.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Promotion Name
                        </label>
                        <input
                          type="text"
                          defaultValue={promo.name}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bonus Code
                        </label>
                        <input
                          type="text"
                          defaultValue={promo.bonus_code}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Match Percentage
                        </label>
                        <input
                          type="number"
                          defaultValue={promo.match_percentage}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Bonus
                        </label>
                        <input
                          type="number"
                          defaultValue={promo.max_bonus}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Deposit
                        </label>
                        <input
                          type="number"
                          defaultValue={promo.min_deposit}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Wagering Requirement
                        </label>
                        <input
                          type="number"
                          defaultValue={promo.wagering_requirement}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setEditingDay(null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSavePromotion(promo.id, {})}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Section */}
              {expandedDay === promo.id && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Claims Today</p>
                      <p className="text-lg font-semibold text-gray-900">{promo.total_claimed || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${(promo.total_value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg. Claim</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${promo.total_claimed && promo.total_value
                          ? Math.round(promo.total_value / promo.total_claimed)
                          : 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Conversion</p>
                      <p className="text-lg font-semibold text-green-600">24.5%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Special Offers Tab */}
      {activeTab === 'special' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specialPromotions.map((promo) => (
            <div key={promo.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{promo.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                      promo.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {promo.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {promo.recurring.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Reward</p>
                  <p className="text-sm text-gray-900">{promo.reward}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Conditions</p>
                  <ul className="space-y-1">
                    {promo.conditions.map((condition, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {condition}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                <button className="text-sm text-indigo-600 hover:text-indigo-700">
                  View Stats
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-700">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Promotion Templates</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose from pre-built promotion templates to quickly set up new offers
            </p>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Browse Templates
            </button>
          </div>
        </div>
      )}

      {/* Quick Setup Guide */}
      <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-indigo-900">Quick Promotion Setup</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Set up a complete week of promotions in minutes! Use our AI-powered recommendation engine to create
              personalized offers based on player behavior and maximize engagement.
            </p>
            <button className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              Generate Weekly Promotions
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
