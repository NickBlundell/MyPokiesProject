'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Wallet, X, ArrowLeft } from 'lucide-react'
import { useWalletState } from '@/lib/hooks/useWalletState'
import { useBonusOffers } from '@/lib/hooks/useBonusOffers'
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods'
import { BonusOfferList } from './wallet/BonusOfferList'
import { PaymentMethodGrid } from './wallet/PaymentMethodGrid'
import { AmountInput } from './wallet/AmountInput'
import { BalanceSummary } from './wallet/BalanceSummary'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  realBalance: number
  bonusBalance: number
  wageringRequired: number
  wageringCompleted: number
}

export function WalletModal({
  isOpen,
  onClose,
  realBalance,
  bonusBalance,
  wageringRequired,
  wageringCompleted
}: WalletModalProps) {
  const [mounted, setMounted] = useState(false)

  // Wallet state management
  const walletState = useWalletState()
  const {
    view,
    amount,
    selectedOffer,
    confirmingBonus,
    claiming,
    claimSuccess,
    setView,
    setAmount,
    handleClose: handleWalletClose,
    handleQuickAmount: baseHandleQuickAmount
  } = walletState

  // Bonus offers management
  const bonusOffers = useBonusOffers({
    isOpen,
    amount,
    selectedOffer,
    setAmount,
    setSelectedOffer: walletState.setSelectedOffer,
    setConfirmingBonus: walletState.setConfirmingBonus,
    setClaiming: walletState.setClaiming,
    setClaimSuccess: walletState.setClaimSuccess
  })

  const {
    availableOffers,
    calculateBonusPreview,
    handleOfferClick,
    handleStartClaim,
    handleConfirmClaim,
    handleCancelClaim
  } = bonusOffers

  // Payment methods management
  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    fiatMethods,
    cryptoMethods,
    renderPaymentMethodIcon
  } = usePaymentMethods()

  // SSR hydration check - only render portal on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden'
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = 'unset'
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  // Reset view when modal closes
  const handleClose = () => {
    handleWalletClose(onClose)
  }

  // Memoize quick amount handler to prevent recreation on every render
  const handleQuickAmount = useCallback((value: string) => {
    const selectedBonus = availableOffers.find(b => b.id === selectedOffer)
    const minAmount = selectedBonus?.min_deposit_amount || 0
    baseHandleQuickAmount(value, minAmount)
  }, [availableOffers, selectedOffer, baseHandleQuickAmount])

  // Memoize calculated values to prevent recalculation on every render
  const amountValue = useMemo(() => parseFloat(amount) || 0, [amount])
  const projectedBonus = useMemo(() =>
    selectedOffer && amountValue > 0 ? calculateBonusPreview(selectedOffer, amount) : 0,
    [selectedOffer, amountValue, amount, calculateBonusPreview]
  )
  const canSubmitDeposit = useMemo(() => amountValue > 0, [amountValue])

  if (!isOpen || !mounted) return null

  // Use portal to render modal at document root, breaking out of sidebar's z-index context
  return createPortal(
    <div className="fixed inset-0 lg:hidden z-50 flex items-center justify-center px-4" style={{ paddingTop: '5rem', paddingBottom: 'calc(2rem + 3.525rem)' }}>
      {/* Backdrop - only covers area above navbar */}
      <div
        className="absolute inset-x-0 top-0 bg-black/70"
        style={{ bottom: 'calc(2rem + 3.525rem)' }}
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-[420px] h-full overflow-y-auto bg-[#1a2024] border border-[#2a3439] rounded-xl shadow-2xl">
        {/* Header with back button (when not on main view) */}
        {view !== 'main' && (
          <div className="flex items-center p-4 pb-2 relative border-b border-[#2a3439]">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-[#2a3439] rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="absolute left-1/2 -translate-x-1/2">
              <h3 className="text-white font-bold text-base">
                Deposit
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="ml-auto p-2 hover:bg-[#2a3439] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        )}

        {/* Close button (main view only) */}
        {view === 'main' && (
          <div className="flex items-center p-4 pb-2 relative border-b border-[#2a3439]">
            <div className="flex-1 text-center">
              <h3 className="text-white font-bold text-base">Wallet Overview</h3>
            </div>
            <button
              onClick={handleClose}
              className="absolute right-4 p-2 hover:bg-[#2a3439] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {view === 'main' ? (
            <>
              {/* Available Offers */}
              {availableOffers.length > 0 && (
                <div className="mb-4">
                  <BonusOfferList
                    availableOffers={availableOffers}
                    selectedOffer={selectedOffer}
                    confirmingBonus={confirmingBonus}
                    claimSuccess={claimSuccess}
                    claiming={claiming}
                    onOfferClick={handleOfferClick}
                    onStartClaim={handleStartClaim}
                    onConfirmClaim={handleConfirmClaim}
                    onCancelClaim={handleCancelClaim}
                  />
                </div>
              )}

              {/* Amount Input */}
              <div className="mb-4">
                <AmountInput
                  amount={amount}
                  onAmountChange={setAmount}
                  onQuickAmount={handleQuickAmount}
                />
              </div>

              {/* Balance Summary */}
              <div className="mb-4">
                <BalanceSummary
                  realBalance={realBalance}
                  bonusBalance={bonusBalance}
                  wageringRequired={wageringRequired}
                  wageringCompleted={wageringCompleted}
                  amountValue={amountValue}
                  projectedBonus={projectedBonus}
                />
              </div>

              {/* Action Button */}
              <button
                onClick={() => setView('deposit')}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-bold text-base transition-all shadow-md hover:shadow-lg"
              >
                Deposit
              </button>
            </>
          ) : (
            <>
              {/* Payment Methods */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Select Payment Method
                </label>

                <PaymentMethodGrid
                  fiatMethods={fiatMethods}
                  cryptoMethods={cryptoMethods}
                  selectedPaymentMethod={selectedPaymentMethod}
                  onPaymentMethodSelect={setSelectedPaymentMethod}
                  renderIcon={renderPaymentMethodIcon}
                />
              </div>

              {/* Balance Summary */}
              <div className="mb-4">
                <BalanceSummary
                  realBalance={realBalance}
                  bonusBalance={bonusBalance}
                  wageringRequired={wageringRequired}
                  wageringCompleted={wageringCompleted}
                  amountValue={amountValue}
                  projectedBonus={projectedBonus}
                  showWagering={false}
                />
              </div>

              {/* Complete Deposit */}
              <button
                type="button"
                disabled={!canSubmitDeposit}
                className={`w-full py-4 rounded-lg font-bold text-base transition-all shadow-md ${
                  canSubmitDeposit
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white hover:shadow-lg'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Complete Deposit
              </button>

              {/* Footer */}
              <div className="mt-4 p-4 bg-[#0f1419] border border-[#2a3439] rounded-lg">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Wallet className="w-4 h-4" />
                  <span>All transactions are encrypted and secure</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
