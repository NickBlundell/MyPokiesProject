'use client'

import { useState } from 'react'
import {
  Gift,
  Plus,
  TrendingUp,
  Edit2,
  Eye,
  Copy,
  ToggleLeft,
  ToggleRight,
  X
} from 'lucide-react'
import { Promotion, PromotionStats } from './page'

interface PromotionsClientProps {
  promotions: Promotion[]
  stats: PromotionStats
}

export default function PromotionsClient({
  promotions: initialPromotions,
  stats
}: PromotionsClientProps) {
  const [promotions, setPromotions] = useState(initialPromotions)
  const [showModal, setShowModal] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)

  const handleCreate = () => {
    setEditingPromotion(null)
    setShowModal(true)
  }

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setShowModal(true)
  }

  const handleToggle = async (promotion: Promotion) => {
    // TODO: Implement toggle active status
    console.log('Toggle promotion:', promotion.id)
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0'
    return `$${amount.toLocaleString()}`
  }

  const formatBonusDetails = (promo: Promotion) => {
    if (promo.match_percentage) {
      return `${promo.match_percentage}% up to ${formatCurrency(promo.max_bonus)}`
    }
    if (promo.bonus_amount) {
      return formatCurrency(promo.bonus_amount)
    }
    if (promo.free_spins_count) {
      return `${promo.free_spins_count} spins`
    }
    if (promo.cashback_percentage) {
      return `${promo.cashback_percentage}% cashback`
    }
    return 'N/A'
  }

  const formatClaimFrequency = (frequency: string) => {
    const map: Record<string, string> = {
      'once_lifetime': '1x Lifetime',
      'once_daily': 'Daily',
      'once_weekly': 'Weekly',
      'once_monthly': 'Monthly',
      'unlimited': 'Unlimited'
    }
    return map[frequency] || frequency
  }

  const formatBonusType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promotion Templates</h1>
          <p className="text-gray-600 mt-2">Create and manage promotion templates that trigger offers to users</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Gift className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalPromotions}</p>
          <p className="text-sm text-gray-600">Total Templates</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <ToggleRight className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activePromotions}</p>
          <p className="text-sm text-gray-600">Active Templates</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalClaims}</p>
          <p className="text-sm text-gray-600">Total Claims</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.claimsToday}</p>
          <p className="text-sm text-gray-600">Claims Today</p>
        </div>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bonus Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Claim Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Times Triggered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No templates yet. Create your first template to get started.
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{promo.name}</div>
                      {promo.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {promo.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {formatBonusType(promo.bonus_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatBonusDetails(promo)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {promo.is_public && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Public
                          </span>
                        )}
                        {promo.vip_tiers && promo.vip_tiers.length > 0 && promo.vip_tiers.map((tier, idx) => (
                          <span
                            key={`vip-${idx}`}
                            className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800"
                          >
                            VIP: {tier}
                          </span>
                        ))}
                        {promo.segment_ids && promo.segment_ids.length > 0 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {promo.segment_ids.length} Segment{promo.segment_ids.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {promo.specific_user_ids && promo.specific_user_ids.length > 0 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                            {promo.specific_user_ids.length} User{promo.specific_user_ids.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {!promo.is_public &&
                         (!promo.vip_tiers || promo.vip_tiers.length === 0) &&
                         (!promo.segment_ids || promo.segment_ids.length === 0) &&
                         (!promo.specific_user_ids || promo.specific_user_ids.length === 0) && (
                          <span className="text-sm text-gray-500">Not set</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatClaimFrequency(promo.claim_frequency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {promo.times_triggered || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {promo.active ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(promo)}
                          className="text-gray-400 hover:text-gray-600"
                          title={promo.active ? 'Deactivate' : 'Activate'}
                        >
                          {promo.active ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(promo)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          title="View Claims"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPromotion ? 'Edit Template' : 'Create Template'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <p className="text-gray-600 font-medium mb-4">
                Create Template Form
              </p>

              {/* Section 1: Offer Details */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold mb-4">1. Offer Details</h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <p>• Promotion name and description</p>
                  <p>• Bonus type (deposit match, free spins, cashback, fixed bonus, etc.)</p>
                  <p>• Bonus configuration (amounts, percentages, wagering requirements)</p>
                </div>
              </div>

              {/* Section 2: Who Can See It */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold mb-4">2. Who Can See It</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 w-4 h-4 border-2 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-900">Public</p>
                      <p className="text-xs">Available to all users on the site</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 w-4 h-4 border-2 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-900">VIP Tiers</p>
                      <p className="text-xs">Select specific VIP tiers (Gold, Platinum, Diamond, etc.)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 w-4 h-4 border-2 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-900">Player Segments</p>
                      <p className="text-xs">Target specific player segments from your database</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 w-4 h-4 border-2 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-900">Specific Users</p>
                      <p className="text-xs">Search and select individual players</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 w-4 h-4 border-2 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-900">Leads (CSV Upload)</p>
                      <p className="text-xs">Upload phone numbers for signup bonuses</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: How They Get It */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold mb-4">3. How They Get It</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2"></div>
                    <p className="font-medium text-gray-900">Available to Claim</p>
                    <span className="text-xs">(Player sees offer and clicks to claim)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2"></div>
                    <p className="font-medium text-gray-900">Auto-Assign</p>
                    <span className="text-xs">(Automatically applied to player account)</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Claim Rules */}
              <div className="pb-2">
                <h3 className="text-lg font-semibold mb-4">4. Claim Rules</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>• <span className="font-medium text-gray-900">Claim Frequency:</span> Once lifetime, daily, weekly, monthly, or unlimited</p>
                  <p>• <span className="font-medium text-gray-900">Trigger Type:</span> Manual, on deposit, on login, auto-apply, or on registration</p>
                  <p>• <span className="font-medium text-gray-900">Trigger Conditions:</span> Min deposit amount, etc.</p>
                  <p>• <span className="font-medium text-gray-900">Valid Dates:</span> Start date and optional end date</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Full interactive form coming soon. This shows the structure of how promotion creation will work.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingPromotion ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
