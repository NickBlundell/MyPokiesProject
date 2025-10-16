import React from 'react'

interface BalanceSummaryProps {
  realBalance: number
  bonusBalance: number
  wageringRequired: number
  wageringCompleted: number
  amountValue: number
  projectedBonus: number
  showWagering?: boolean
}

export function BalanceSummary({
  realBalance,
  bonusBalance,
  wageringRequired,
  wageringCompleted,
  amountValue,
  projectedBonus,
  showWagering = true
}: BalanceSummaryProps) {
  const wageringProgress = wageringRequired > 0 ? (wageringCompleted / wageringRequired) * 100 : 0
  const balanceIncrease = amountValue + projectedBonus
  const showRealIncrease = amountValue > 0
  const showBonusIncrease = projectedBonus > 0
  const showTotalIncrease = balanceIncrease > 0

  return (
    <div className="bg-[#0f1419] border border-[#2a3439] rounded-lg p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Real Balance</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">
              ${realBalance.toFixed(2)}
            </span>
            {showRealIncrease && (
              <span className="text-green-400 font-bold text-sm flex items-center gap-1">
                <span className="text-green-400">+</span>
                ${amountValue.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Bonus Balance</span>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-semibold text-base">
              ${bonusBalance.toFixed(2)}
            </span>
            {showBonusIncrease && (
              <span className="text-yellow-400 font-bold text-sm flex items-center gap-1">
                <span className="text-yellow-400">+</span>
                ${projectedBonus.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {showWagering && bonusBalance > 0 && (
          <div className="mt-3 pt-3 border-t border-[#2a3439]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Wagering Progress</span>
              <span className="text-xs text-gray-300 font-semibold">
                {wageringProgress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#1a2024] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(wageringProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-500">
                ${wageringCompleted.toFixed(2)} wagered
              </span>
              <span className="text-xs text-gray-500">
                ${wageringRequired.toFixed(2)} required
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[#2a3439]">
          <span className="text-sm font-semibold text-gray-300">Total Balance</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">
              ${(realBalance + bonusBalance).toFixed(2)}
            </span>
            {showTotalIncrease && (
              <span className="text-green-400 font-bold text-sm flex items-center gap-1">
                <span className="text-green-400">+</span>
                ${balanceIncrease.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
