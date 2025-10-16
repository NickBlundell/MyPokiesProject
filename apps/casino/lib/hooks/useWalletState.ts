import { useState, useCallback } from 'react'

export interface UseWalletStateReturn {
  view: 'main' | 'deposit'
  amount: string
  selectedOffer: string | null
  confirmingBonus: string | null
  claiming: boolean
  claimSuccess: string | null
  setView: (view: 'main' | 'deposit') => void
  setAmount: (amount: string) => void
  setSelectedOffer: (offerId: string | null) => void
  setConfirmingBonus: (bonusId: string | null) => void
  setClaiming: (claiming: boolean) => void
  setClaimSuccess: (bonusId: string | null) => void
  handleClose: (onClose: () => void) => void
  handleQuickAmount: (value: string, minAmount: number) => void
}

export function useWalletState(): UseWalletStateReturn {
  const [view, setView] = useState<'main' | 'deposit'>('main')
  const [amount, setAmount] = useState<string>('')
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null)
  const [confirmingBonus, setConfirmingBonus] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)

  const handleClose = useCallback((onClose: () => void) => {
    setView('main')
    setAmount('')
    setSelectedOffer(null)
    onClose()
  }, [])

  const handleQuickAmount = useCallback((value: string, minAmount: number) => {
    setAmount((currentAmount) => {
      const current = parseFloat(currentAmount) || 0
      const addAmount = parseFloat(value)

      // If current amount equals the minimum (default), replace instead of add
      if (current === minAmount && minAmount > 0) {
        return value
      } else {
        // Otherwise, add to current amount
        const newAmount = current + addAmount
        return newAmount.toFixed(2)
      }
    })
  }, [])

  return {
    view,
    amount,
    selectedOffer,
    confirmingBonus,
    claiming,
    claimSuccess,
    setView,
    setAmount,
    setSelectedOffer,
    setConfirmingBonus,
    setClaiming,
    setClaimSuccess,
    handleClose,
    handleQuickAmount
  }
}
