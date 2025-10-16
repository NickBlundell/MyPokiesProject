'use client'

import { useState } from 'react'
import {
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Copy,
  Eye,
  Settings,
  Gift,
  Plus
} from 'lucide-react'

interface Bonus {
  id: string
  bonus_code: string
  bonus_name: string
  bonus_type: string
  fixed_bonus_amount?: number
  match_percentage?: number
  max_bonus_amount?: number
  min_deposit_amount?: number
  wagering_requirement_multiplier?: number
  valid_until?: string
  active: boolean
  auto_apply?: boolean
  created_at: string
  updated_at: string
  usageCount?: number
}

interface BonusesClientProps {
  bonuses: Bonus[]
}

export default function BonusesClient({ bonuses }: BonusesClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Note: selectedBonus and setSelectedBonus removed as they were unused

  const bonusTypeConfig = {
    no_deposit: { color: 'bg-green-100 text-green-800', label: 'No Deposit' },
    deposit_match: { color: 'bg-blue-100 text-blue-800', label: 'Deposit Match' },
    free_spins: { color: 'bg-purple-100 text-purple-800', label: 'Free Spins' },
    cashback: { color: 'bg-yellow-100 text-yellow-800', label: 'Cashback' },
    reload: { color: 'bg-orange-100 text-orange-800', label: 'Reload' },
    welcome: { color: 'bg-indigo-100 text-indigo-800', label: 'Welcome' },
    loyalty: { color: 'bg-pink-100 text-pink-800', label: 'Loyalty' }
  }

  const getTypeConfig = (type: string) => {
    return bonusTypeConfig[type as keyof typeof bonusTypeConfig] ||
           { color: 'bg-gray-100 text-gray-800', label: type }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    // You could add a toast notification here
  }

  return (
    <>
      {/* Bonus Offers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bonus Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requirements
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bonuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No bonuses found</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Bonus
                    </button>
                  </td>
                </tr>
              ) : (
                bonuses.map((bonus) => {
                  const typeConfig = getTypeConfig(bonus.bonus_type)
                  return (
                    <tr key={bonus.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{bonus.bonus_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                              {bonus.bonus_code}
                            </code>
                            <button
                              onClick={() => handleCopyCode(bonus.bonus_code)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {bonus.bonus_type === 'no_deposit' && bonus.fixed_bonus_amount && (
                            `$${bonus.fixed_bonus_amount}`
                          )}
                          {bonus.bonus_type === 'deposit_match' && (
                            <>
                              {bonus.match_percentage}%
                              {bonus.max_bonus_amount && ` up to $${bonus.max_bonus_amount}`}
                              {bonus.min_deposit_amount && (
                                <p className="text-xs text-gray-500">Min: ${bonus.min_deposit_amount}</p>
                              )}
                            </>
                          )}
                          {bonus.bonus_type === 'cashback' && bonus.match_percentage && (
                            `${bonus.match_percentage}% cashback`
                          )}
                          {bonus.bonus_type === 'free_spins' && bonus.fixed_bonus_amount && (
                            `${bonus.fixed_bonus_amount} spins`
                          )}
                          {!bonus.fixed_bonus_amount && !bonus.match_percentage && '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {bonus.wagering_requirement_multiplier ? (
                            <>
                              {bonus.wagering_requirement_multiplier}x wagering
                              {bonus.min_deposit_amount && (
                                <p className="text-xs text-gray-500">
                                  Min deposit: ${bonus.min_deposit_amount}
                                </p>
                              )}
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {bonus.usageCount || 0} used
                          {bonus.valid_until && (
                            <p className="text-xs text-gray-500">
                              Expires: {new Date(bonus.valid_until).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            className={`flex items-center gap-1 ${
                              bonus.active ? 'text-green-600' : 'text-gray-400'
                            }`}
                          >
                            {bonus.active ? (
                              <ToggleRight className="w-5 h-5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                            <span className="text-xs">
                              {bonus.active ? 'Active' : 'Inactive'}
                            </span>
                          </button>
                          {bonus.auto_apply && (
                            <span className="text-xs text-purple-600">Auto-apply</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button className="p-1 text-gray-600 hover:text-indigo-600" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-blue-600" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-gray-800" title="Settings">
                            <Settings className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Bonus Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Bonus</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Weekend Special"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Code</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., WEEKEND50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="no_deposit">No Deposit Bonus</option>
                  <option value="deposit_match">Deposit Match</option>
                  <option value="free_spins">Free Spins</option>
                  <option value="cashback">Cashback</option>
                  <option value="reload">Reload Bonus</option>
                  <option value="welcome">Welcome Bonus</option>
                  <option value="loyalty">Loyalty Bonus</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Match Percentage</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="100"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Bonus Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Deposit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wagering Requirement</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="30"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">x</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Settings</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600" />
                    <span className="text-sm text-gray-700">Auto-apply when conditions are met</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600" />
                    <span className="text-sm text-gray-700">Limit to one use per player</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600" />
                    <span className="text-sm text-gray-700">Active (enable immediately)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Create Bonus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}