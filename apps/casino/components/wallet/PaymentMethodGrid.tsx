import React from 'react'
import type { JSX } from 'react'
import type { PaymentMethod, PaymentMethodIcon } from '@/lib/hooks/usePaymentMethods'

interface PaymentMethodGridProps {
  fiatMethods: PaymentMethod[]
  cryptoMethods: PaymentMethod[]
  selectedPaymentMethod: string | null
  onPaymentMethodSelect: (methodId: string) => void
  renderIcon: (icon: PaymentMethodIcon) => JSX.Element | null
}

export function PaymentMethodGrid({
  fiatMethods,
  cryptoMethods,
  selectedPaymentMethod,
  onPaymentMethodSelect,
  renderIcon
}: PaymentMethodGridProps) {
  const renderPaymentMethodButton = (method: PaymentMethod) => {
    const isSelected = selectedPaymentMethod === method.id

    return (
      <button
        key={method.id}
        type="button"
        onClick={() => onPaymentMethodSelect(method.id)}
        className={`group w-full flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-lg transition-all border ${
          isSelected
            ? 'border-green-500/60 bg-gradient-to-r from-green-600/20 to-emerald-600/20 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
            : 'border-[#2a3439] bg-[#2a3439] hover:bg-[#3a4449]'
        }`}
      >
        <div
          className={`w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-lg transition-colors ${
            isSelected
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/25 border border-green-500/50'
              : 'bg-[#1a2024] group-hover:bg-[#0f1419]'
          }`}
        >
          {renderIcon(method.icon)}
        </div>
        <div className="flex-1 text-left min-w-0 space-y-1">
          <div className="text-sm lg:text-base font-semibold text-white">
            {method.label}
          </div>
          <div className={`text-xs lg:text-sm ${isSelected ? 'text-green-300' : 'text-gray-400'}`}>
            {method.caption}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {fiatMethods.map(renderPaymentMethodButton)}
      </div>

      <div className="space-y-3">
        <div className="text-[11px] lg:text-xs font-medium text-gray-500 px-1 uppercase tracking-wide">
          Cryptocurrency
        </div>
        <div className="space-y-3">
          {cryptoMethods.map(renderPaymentMethodButton)}
        </div>
      </div>
    </div>
  )
}
