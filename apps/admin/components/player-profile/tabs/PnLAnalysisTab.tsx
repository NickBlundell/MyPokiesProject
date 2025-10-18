import React from 'react'
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import type { TabProps, PnLData } from '../types'

export function PnLAnalysisTab({ player: _player }: TabProps) {
  // Data will be loaded from actual player data in the future
  const mockPnLData: PnLData = {
    totalWagered: 0,
    totalWon: 0,
    netResult: 0,
    houseEdge: 0,
    totalSessions: 0,
    avgSessionLength: '0m',
    favoriteGames: [],
    lastGames: []
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${mockPnLData.totalWagered.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Total Wagered</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${mockPnLData.totalWon.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Total Won</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            ${Math.abs(mockPnLData.netResult).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Net Loss</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {mockPnLData.houseEdge}%
          </p>
          <p className="text-sm text-gray-600">House Edge</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Game Results</h3>
        <div className="space-y-3">
          {mockPnLData.lastGames.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No game history available</p>
          ) : (
            mockPnLData.lastGames.map((game, index) => (
              <div key={index} className="flex items-center justify-between pb-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{game.game}</p>
                  <p className="text-xs text-gray-500">{game.time}</p>
                </div>
                <span className={`text-sm font-semibold ${
                  game.result > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {game.result > 0 ? '+' : ''}${Math.abs(game.result)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}