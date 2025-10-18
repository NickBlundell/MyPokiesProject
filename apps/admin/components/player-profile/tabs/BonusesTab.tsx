import React from 'react'
import { Gift, Activity, CheckCircle } from 'lucide-react'
import type { TabProps, Bonus } from '../types'

export function BonusesTab({ player: _player }: TabProps) {
  // Mock bonuses - will be replaced with real data
  const mockBonuses: Bonus[] = []

  return (
    <div className="space-y-6">
      {mockBonuses.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No bonuses assigned</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockBonuses.map((bonus, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{bonus.name}</h4>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{bonus.code}</code>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                  bonus.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {bonus.status === 'active' ? <Activity className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                  {bonus.status.charAt(0).toUpperCase() + bonus.status.slice(1)}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Amount</span>
                  <span className="text-sm font-medium text-gray-900">${bonus.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Wagering</span>
                  <span className="text-sm font-medium text-gray-900">{bonus.wagering}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expires</span>
                  <span className="text-sm font-medium text-gray-900">{bonus.expires}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}