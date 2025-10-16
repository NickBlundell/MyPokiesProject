'use client'

import { useEffect } from 'react'
import { Wallet, X, ArrowLeft } from 'lucide-react'
import { useSidebar } from '@/lib/contexts/sidebar-context'
import { useWalletState } from '@/lib/hooks/useWalletState'
import { useBonusOffers } from '@/lib/hooks/useBonusOffers'
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods'
import { BonusOfferList } from './wallet/BonusOfferList'
import { PaymentMethodGrid } from './wallet/PaymentMethodGrid'
import { AmountInput } from './wallet/AmountInput'
import { BalanceSummary } from './wallet/BalanceSummary'

interface WalletDropdownProps {
  isOpen: boolean
  onClose: () => void
  realBalance: number
  bonusBalance: number
  wageringRequired: number
  wageringCompleted: number
}

export function WalletDropdown({
  isOpen,
  onClose,
  realBalance,
  bonusBalance,
  wageringRequired,
  wageringCompleted
}: WalletDropdownProps) {
  const { isCollapsed } = useSidebar()

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

  // Lock body scroll when dropdown is open
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previousOverflow
      }
    }
  }, [isOpen])

  // Reset view when dropdown closes
  const handleClose = () => {
    handleWalletClose(onClose)
  }

  // Handle quick amount with bonus minimum consideration
  const handleQuickAmount = (value: string) => {
    const selectedBonus = availableOffers.find(b => b.id === selectedOffer)
    const minAmount = selectedBonus?.min_deposit_amount || 0
    baseHandleQuickAmount(value, minAmount)
  }

  const amountValue = parseFloat(amount) || 0
  const projectedBonus = selectedOffer && amountValue > 0 ? calculateBonusPreview(selectedOffer, amount) : 0
  const canSubmitDeposit = amountValue > 0

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - dims content below header, sidebar naturally excluded due to higher z-index */}
      <div
        className="fixed inset-0 z-[200] pointer-events-none"
        onClick={handleClose}
      >
        {/* Top section - transparent (header area with wallet button) */}
        <div className="absolute top-0 left-0 right-0 h-[5rem] pointer-events-none" />

        {/* Content area on desktop (excludes left sidebar) */}
        <div
          className="hidden lg:block absolute top-[5rem] right-0 bottom-0 bg-black/60 pointer-events-auto"
          style={{
            left: isCollapsed ? '5rem' : '16rem'
          }}
          onClick={handleClose}
        />

        {/* Content area on mobile (full width below header, above bottom nav) */}
        <div
          className="lg:hidden absolute top-[5rem] left-0 right-0 bottom-[4rem] bg-black/60 pointer-events-auto"
          onClick={handleClose}
        />

        {/* Mobile bottom nav area - dimmed */}
        <div
          className="lg:hidden absolute bottom-0 left-0 right-0 h-16 bg-black/60 pointer-events-auto"
          onClick={handleClose}
        />
      </div>

      {/* Dropdown */}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[95vw] max-w-[420px] lg:w-[420px] border border-[#2a3439]/90 rounded-xl shadow-2xl backdrop-blur-md bg-[#1a2024]/[0.99] lg:bg-[#1a2024] z-[201] overflow-hidden lg:max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain touch-pan-y pb-5"
        style={{ maxHeight: 'calc(100dvh - 9rem)', marginBottom: '4rem', backgroundColor: 'rgba(26, 32, 36, 0.97)' }}
      >
        {/* Header with back button (when not on main view) */}
        {view !== 'main' && (
          <div className="flex items-center p-4 pb-2 relative">
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
          <div className="flex items-center p-4 pb-2 relative">
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

        {view === 'main' ? (
          <>
            {/* Available Offers */}
            {availableOffers.length > 0 && (
              <div className="px-4 pb-4">
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
            <div className="px-4 pb-4">
              <AmountInput
                amount={amount}
                onAmountChange={setAmount}
                onQuickAmount={handleQuickAmount}
              />
            </div>

            {/* Balance Summary */}
            <div className="px-4 pb-4">
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
            <div className="px-4 pb-4">
              <button
                onClick={() => setView('deposit')}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-bold text-base transition-all shadow-md hover:shadow-lg"
              >
                Deposit
              </button>
            </div>
          </>
        ) : (
          /* Payment Methods View */
          <>
            {/* Payment Methods */}
            <div className="p-4 pt-2">
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
            <div className="px-4 pb-4">
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
            <div className="px-4 pb-4">
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
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#0f1419] border-t border-[#2a3439]">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Wallet className="w-4 h-4" />
                <span>All transactions are encrypted and secure</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
