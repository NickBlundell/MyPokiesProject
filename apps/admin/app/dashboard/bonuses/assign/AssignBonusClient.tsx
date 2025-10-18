'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Gift,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface BonusOffer {
  id: string
  name: string
  type: 'deposit_match' | 'fixed' | 'free_spins' | 'cashback' | 'custom'
  value: number
  max_amount: number
  wagering: number
  code: string
  active: boolean
}

interface RecentAssignment {
  id: string
  player_email: string
  player_username: string
  bonus_name: string
  amount: number
  created_at: string
  assigned_by: string
}

interface AssignBonusClientProps {
  bonusOffers: BonusOffer[]
  recentAssignments: RecentAssignment[]
}

export default function AssignBonusClient({ bonusOffers, recentAssignments }: AssignBonusClientProps) {
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedBonus, setSelectedBonus] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [playerSearch, setPlayerSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string, email?: string, external_user_id?: string }>>([])

  const searchPlayers = async () => {
    if (!playerSearch.trim()) {
      setSearchResults([])
      return
    }

    // Create client inside the handler to avoid SSR issues
    const supabase = createClient()

    const { data, error } = await supabase
      .from('users')
      .select('id, email, external_user_id')
      .or(`email.ilike.%${playerSearch}%,external_user_id.ilike.%${playerSearch}%`)
      .limit(5)

    if (!error && data) {
      setSearchResults(data)
    }
  }

  const assignBonus = async () => {
    if (!selectedPlayer || !selectedBonus) {
      setMessage({ type: 'error', text: 'Please select both a player and a bonus offer' })
      return
    }

    const selectedOffer = bonusOffers.find(b => b.id === selectedBonus)
    if (!selectedOffer) return

    const bonusAmount = selectedOffer.type === 'custom' ? parseFloat(customAmount) : selectedOffer.value

    if (selectedOffer.type === 'custom' && (!customAmount || isNaN(bonusAmount))) {
      setMessage({ type: 'error', text: 'Please enter a valid custom bonus amount' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Create client inside the handler to avoid SSR issues
      const supabase = createClient()

      // Try to insert into player_bonuses or bonus_assignments table
      const possibleTables = ['player_bonuses', 'bonus_assignments', 'bonus_claims']

      let success = false
      for (const tableName of possibleTables) {
        try {
          const { error } = await supabase
            .from(tableName)
            .insert({
              user_id: selectedPlayer,
              bonus_id: selectedBonus === 'custom' ? null : selectedBonus,
              bonus_name: selectedOffer.name,
              amount: bonusAmount,
              bonus_amount: bonusAmount,
              wagering_requirement: selectedOffer.wagering,
              status: 'active',
              reason: reason || undefined,
              assigned_by: 'Admin',
              created_at: new Date().toISOString()
            })

          if (!error) {
            success = true
            break
          }
        } catch {
          continue
        }
      }

      if (success) {
        setMessage({
          type: 'success',
          text: `Successfully assigned ${selectedOffer.name} to player!`
        })

        // Reset form
        setSelectedPlayer('')
        setSelectedBonus('')
        setCustomAmount('')
        setReason('')
        setPlayerSearch('')
        setSearchResults([])

        // Refresh page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to assign bonus. Please ensure the database tables are set up correctly.'
        })
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to assign bonus. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Assign Bonus</h1>
        <p className="text-gray-600 mt-2">Manually assign bonuses to players</p>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5" /> :
           message.type === 'error' ? <XCircle className="w-5 h-5 mt-0.5" /> :
           <AlertCircle className="w-5 h-5 mt-0.5" />}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {bonusOffers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bonus Offers Available</h3>
          <p className="text-gray-600">
            No bonus offers found in the database. Please create bonus offers first.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Step 1: Select Player */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                Select Player
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Player
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        onKeyUp={(e) => e.key === 'Enter' && searchPlayers()}
                        placeholder="Enter email or player ID..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={searchPlayers}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {searchResults.map((player) => (
                      <div
                        key={player.id}
                        onClick={() => {
                          setSelectedPlayer(player.id)
                          setPlayerSearch(player.email || player.external_user_id || '')
                          setSearchResults([])
                        }}
                        className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                          selectedPlayer === player.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">
                          {player.email || 'No email'}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {player.external_user_id || player.id.slice(0, 8)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPlayer && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      Player selected: {playerSearch}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Select Bonus */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                Select Bonus Offer
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bonusOffers.map((bonus) => (
                  <div
                    key={bonus.id}
                    onClick={() => setSelectedBonus(bonus.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedBonus === bonus.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">{bonus.name}</h3>
                      </div>
                      {bonus.type === 'deposit_match' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Match
                        </span>
                      )}
                      {bonus.type === 'fixed' && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Fixed
                        </span>
                      )}
                      {bonus.type === 'custom' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {bonus.type === 'deposit_match' && (
                        <p>Match: {bonus.value}% up to ${bonus.max_amount}</p>
                      )}
                      {bonus.type === 'fixed' && (
                        <p>Amount: ${bonus.value}</p>
                      )}
                      {bonus.type === 'custom' && (
                        <p>Enter custom amount below</p>
                      )}
                      <p>Wagering: {bonus.wagering}x</p>
                      {bonus.code && <p className="text-xs">Code: {bonus.code}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Amount Input */}
              {selectedBonus === 'custom' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Bonus Amount ($)
                  </label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount..."
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Step 3: Additional Details */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                Additional Details (Optional)
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Assignment
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., VIP retention, service recovery, special promotion..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Summary */}
            {selectedPlayer && selectedBonus && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Assignment Summary</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Player: {playerSearch}</p>
                  <p>Bonus: {bonusOffers.find(b => b.id === selectedBonus)?.name}</p>
                  {selectedBonus === 'custom' && customAmount && (
                    <p>Amount: ${customAmount}</p>
                  )}
                  {reason && <p>Reason: {reason}</p>}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedPlayer('')
                  setSelectedBonus('')
                  setCustomAmount('')
                  setReason('')
                  setPlayerSearch('')
                  setSearchResults([])
                  setMessage(null)
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={assignBonus}
                disabled={loading || !selectedPlayer || !selectedBonus}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Assign Bonus
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Assignments</h2>
            {recentAssignments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No recent assignments found</p>
            ) : (
              <div className="space-y-3">
                {recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {assignment.bonus_name} assigned to {assignment.player_email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(assignment.created_at)} • By {assignment.assigned_by}
                      </p>
                    </div>
                    <span className="text-green-600 text-sm font-medium">
                      {formatCurrency(assignment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
