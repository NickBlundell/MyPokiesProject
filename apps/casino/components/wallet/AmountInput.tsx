import React from 'react'

interface AmountInputProps {
  amount: string
  onAmountChange: (amount: string) => void
  onQuickAmount: (value: string) => void
  quickAmounts?: string[]
}

export function AmountInput({
  amount,
  onAmountChange,
  onQuickAmount,
  quickAmounts = ['5', '20', '50', '500']
}: AmountInputProps) {
  return (
    <div className="bg-[#0f1419] border border-[#2a3439] rounded-lg p-4">
      <label className="block text-sm font-semibold text-gray-300 mb-3">
        Amount
      </label>
      <div className="relative mb-3">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">
          $
        </span>
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
          className="w-full bg-[#1a2024] border border-[#2a3439] rounded-lg pl-8 pr-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500 transition-colors"
          min="0"
          step="0.01"
        />
      </div>

      {/* Quick Amount Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {quickAmounts.map((quickAmount) => (
          <button
            key={quickAmount}
            type="button"
            onClick={() => onQuickAmount(quickAmount)}
            className="py-2 bg-[#2a3439] hover:bg-[#3a4449] text-white text-sm font-semibold rounded-lg transition-all"
          >
            ${quickAmount}
          </button>
        ))}
      </div>
    </div>
  )
}
