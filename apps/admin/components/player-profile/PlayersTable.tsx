'use client'

import React from 'react'
import {
  Eye,
  DollarSign,
  Shield,
  MessageSquare,
  MoreVertical
} from 'lucide-react'
import { StatusBadge } from './common/StatusBadge'
import { VIPBadge } from './common/VIPBadge'
import type { Player } from './types'

interface PlayersTableProps {
  players: Player[]
  onPlayerClick: (player: Player) => void
}

export function PlayersTable({ players, onPlayerClick }: PlayersTableProps) {
  const handleActionClick = (e: React.MouseEvent, action: string, player: Player) => {
    e.stopPropagation()
    console.log(`Action ${action} for player:`, player.id)
    // Handle different actions here
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                VIP Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Deposits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {players.map((player) => (
              <tr
                key={player.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onPlayerClick(player)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {player.email || 'No email'}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {player.external_user_id || player.id.slice(0, 8)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={player.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <VIPBadge tier={player.loyalty_tier || 'Bronze'} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      ${(player.balance || 0).toLocaleString()}
                    </div>
                    {player.bonus_balance && player.bonus_balance > 0 && (
                      <div className="text-xs text-gray-500">
                        +${player.bonus_balance.toLocaleString()} bonus
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${(player.total_deposits || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(player.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onPlayerClick(player)
                      }}
                      className="p-1 text-gray-600 hover:text-indigo-600"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleActionClick(e, 'transactions', player)}
                      className="p-1 text-gray-600 hover:text-green-600"
                      title="Transactions"
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleActionClick(e, 'kyc', player)}
                      className="p-1 text-gray-600 hover:text-orange-600"
                      title="KYC/Compliance"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleActionClick(e, 'message', player)}
                      className="p-1 text-gray-600 hover:text-blue-600"
                      title="Send Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleActionClick(e, 'more', player)}
                      className="p-1 text-gray-600 hover:text-gray-900"
                      title="More Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}