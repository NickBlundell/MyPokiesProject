import React from 'react'
import type { DailyBonus } from '@/lib/hooks/useBonusOffers'

interface BonusOfferListProps {
  availableOffers: DailyBonus[]
  selectedOffer: string | null
  confirmingBonus: string | null
  claimSuccess: string | null
  claiming: boolean
  onOfferClick: (offer: DailyBonus) => void
  onStartClaim: (bonusId: string) => void
  onConfirmClaim: (bonus: DailyBonus) => void
  onCancelClaim: () => void
}

export function BonusOfferList({
  availableOffers,
  selectedOffer,
  confirmingBonus,
  claimSuccess,
  claiming,
  onOfferClick,
  onStartClaim,
  onConfirmClaim,
  onCancelClaim
}: BonusOfferListProps) {
  if (availableOffers.length === 0) return null

  return (
    <div className="bg-[#0f1419] border border-[#2a3439] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-semibold text-sm">Available Offers</h4>
        <span className="text-xs text-gray-500 bg-[#1a2024] px-2 py-1 rounded">
          {availableOffers.length} Available
        </span>
      </div>

      {/* All Bonus Cards */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {availableOffers.map((bonus) => {
          const isSelected = selectedOffer === bonus.id
          const isNoDeposit = bonus.bonus_type === 'no_deposit'
          const isConfirming = confirmingBonus === bonus.id
          const isSuccess = claimSuccess === bonus.id

          return (
            <div
              key={bonus.id}
              onClick={isNoDeposit ? undefined : () => onOfferClick(bonus)}
              className={`${
                isSelected || isConfirming
                  ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/50'
                  : 'bg-gradient-to-r from-blue-600/10 to-blue-700/10 border-blue-500/30'
              } border rounded-lg p-4 hover:border-opacity-70 transition-all ${!isNoDeposit ? 'cursor-pointer' : ''}`}
            >
              {!isConfirming && !isSuccess ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`${isSelected ? 'text-green-400' : 'text-blue-400'} font-bold text-sm`}>
                        {bonus.match_percentage ? `${bonus.match_percentage}% Match` : bonus.bonus_name}
                      </span>
                      <span className="text-[10px] text-gray-400 bg-[#1a2024] px-1.5 py-0.5 rounded">
                        {bonus.bonus_code}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mb-2">
                      {bonus.bonus_name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span>Up to ${bonus.max_bonus_amount || bonus.fixed_bonus_amount}</span>
                      {bonus.min_deposit_amount && bonus.min_deposit_amount > 0 && (
                        <>
                          <span>•</span>
                          <span>Min ${bonus.min_deposit_amount}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>35x wagering</span>
                    </div>
                  </div>

                  {/* Show Claim button for no-deposit bonuses */}
                  {isNoDeposit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStartClaim(bonus.id)
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all self-center"
                    >
                      Claim
                    </button>
                  )}
                </div>
              ) : isSuccess ? (
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-green-400 font-bold text-sm">Success!</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    <span className="text-green-400 font-bold">${bonus.fixed_bonus_amount}</span> has been credited to your bonus balance!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm mb-1">Claim ${bonus.fixed_bonus_amount} Bonus?</p>
                    <p className="text-xs text-gray-400">This bonus can only be claimed once.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onCancelClaim()
                      }}
                      disabled={claiming}
                      className="flex-1 px-3 py-2 bg-red-600/80 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onConfirmClaim(bonus)
                      }}
                      disabled={claiming}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                    >
                      {claiming ? 'Claiming...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
