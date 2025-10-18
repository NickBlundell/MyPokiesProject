import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logError } from '@mypokies/monitoring/client'

export interface DailyBonus {
  id: string
  bonus_code: string
  bonus_name: string
  bonus_type?: string
  match_percentage?: number
  max_bonus_amount?: number
  min_deposit_amount?: number
  fixed_bonus_amount?: number
  day_of_week?: number | null
}

export interface UseBonusOffersReturn {
  availableOffers: DailyBonus[]
  setAvailableOffers: (offers: DailyBonus[]) => void
  calculateBonusPreview: (selectedOfferId: string | null, amount: string) => number
  handleOfferClick: (offer: DailyBonus) => void
  handleStartClaim: (bonusId: string) => void
  handleConfirmClaim: (bonus: DailyBonus) => Promise<void>
  handleCancelClaim: () => void
}

interface UseBonusOffersProps {
  isOpen: boolean
  amount: string
  selectedOffer: string | null
  setAmount: (amount: string) => void
  setSelectedOffer: (offerId: string | null) => void
  setConfirmingBonus: (bonusId: string | null) => void
  setClaiming: (claiming: boolean) => void
  setClaimSuccess: (bonusId: string | null) => void
}

export function useBonusOffers({
  isOpen,
  amount,
  selectedOffer,
  setAmount,
  setSelectedOffer,
  setConfirmingBonus,
  setClaiming,
  setClaimSuccess
}: UseBonusOffersProps): UseBonusOffersReturn {
  const [availableOffers, setAvailableOffers] = useState<DailyBonus[]>([])

  // Memoize bonus preview calculation to prevent unnecessary recalculations
  const calculateBonusPreview = useCallback((selectedOfferId: string | null, depositAmount: string) => {
    if (!selectedOfferId || !depositAmount) return 0

    const amount = parseFloat(depositAmount) || 0
    const selectedBonus = availableOffers.find(b => b.id === selectedOfferId)

    if (!selectedBonus) return 0

    // Calculate match amount
    const matchAmount = (amount * ((selectedBonus.match_percentage || 0) / 100))

    // Cap at max bonus amount
    const bonusAmount = Math.min(matchAmount, selectedBonus.max_bonus_amount || matchAmount)

    return bonusAmount
  }, [availableOffers])

  // Fetch all available offers when component opens
  useEffect(() => {
    if (isOpen) {
      const fetchOffers = async () => {
        const supabase = createClient()
        const currentDay = new Date().getDay()

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser()

        // Fetch all active bonus offers
        const { data } = await supabase
          .from('bonus_offers')
          .select('*')
          .eq('active', true)

        if (data && user) {
          // Get player's claimed bonuses
          const { data: claimedBonuses } = await supabase
            .from('player_bonuses')
            .select('bonus_offer_id')
            .eq('user_id', user.id)

          const claimedOfferIds = new Set(claimedBonuses?.map((b: { bonus_offer_id: string }) => b.bonus_offer_id) || [])

          // Filter to only include today's daily bonus OR non-daily bonuses
          // AND exclude already claimed bonuses
          const filteredOffers = data.filter((offer: DailyBonus) => {
            // Exclude if already claimed
            if (claimedOfferIds.has(offer.id)) {
              return false
            }

            // If it's a daily bonus (has day_of_week), only include if it's today
            if (offer.day_of_week !== null) {
              return offer.day_of_week === currentDay
            }
            // If it's not a daily bonus (day_of_week is null), include it
            return true
          })

          setAvailableOffers(filteredOffers)
        } else if (data) {
          // If not logged in, just show based on day filter
          const filteredOffers = data.filter((offer: DailyBonus) => {
            if (offer.day_of_week !== null) {
              return offer.day_of_week === currentDay
            }
            return true
          })

          setAvailableOffers(filteredOffers)
        }
      }

      fetchOffers()
    }
  }, [isOpen])

  // Memoize offer selection handler
  const handleOfferClick = useCallback(async (offer: DailyBonus) => {
    // Toggle selection - if clicking the same offer, deselect it
    if (selectedOffer === offer.id) {
      setSelectedOffer(null)
      setAmount('')
      return
    }

    // Cancel any confirming no-deposit bonus
    setConfirmingBonus(null)

    // For deposit offers, select it
    setSelectedOffer(offer.id)

    // Only set minimum amount if current amount is 0 or less than minimum
    const currentAmount = parseFloat(amount) || 0
    const minAmount = offer.min_deposit_amount || 0
    if (currentAmount === 0 || currentAmount < minAmount) {
      setAmount(minAmount.toString())
    }
  }, [selectedOffer, amount, setSelectedOffer, setAmount, setConfirmingBonus])

  // Memoize claim start handler
  const handleStartClaim = useCallback((bonusId: string) => {
    // Deselect any selected deposit offer
    setSelectedOffer(null)
    setConfirmingBonus(bonusId)
  }, [setSelectedOffer, setConfirmingBonus])

  // Memoize confirm claim handler
  const handleConfirmClaim = useCallback(async (bonus: DailyBonus) => {
    setClaiming(true)
    const supabase = createClient()

    try {
      // Call API to claim the no-deposit bonus
      const response = await fetch('/api/bonuses/claim-no-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bonus_offer_id: bonus.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        setClaimSuccess(bonus.id)
        setClaiming(false)

        // Refresh offers to remove claimed bonus after a delay
        setTimeout(async () => {
          const currentDay = new Date().getDay()
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            const { data: allOffers } = await supabase
              .from('bonus_offers')
              .select('*')
              .eq('active', true)

            const { data: claimedBonuses } = await supabase
              .from('player_bonuses')
              .select('bonus_offer_id')
              .eq('user_id', user.id)

            const claimedOfferIds = new Set(claimedBonuses?.map((b: { bonus_offer_id: string }) => b.bonus_offer_id) || [])

            if (allOffers) {
              const filteredOffers = allOffers.filter((o: DailyBonus) => {
                if (claimedOfferIds.has(o.id)) {
                  return false
                }
                if (o.day_of_week !== null) {
                  return o.day_of_week === currentDay
                }
                return true
              })
              setAvailableOffers(filteredOffers)
            }
          }
        }, 2000)
      } else {
        alert(data.error || 'Failed to claim bonus')
        setConfirmingBonus(null)
        setClaiming(false)
      }
    } catch (error) {
      logError('Error claiming bonus', { context: 'useBonusOffers', data: error })
      alert('Failed to claim bonus')
      setConfirmingBonus(null)
      setClaiming(false)
    }
  }, [setClaiming, setClaimSuccess, setConfirmingBonus, setAvailableOffers])

  // Memoize cancel claim handler
  const handleCancelClaim = useCallback(() => {
    setConfirmingBonus(null)
    setClaiming(false)
  }, [setConfirmingBonus, setClaiming])

  return {
    availableOffers,
    setAvailableOffers,
    calculateBonusPreview,
    handleOfferClick,
    handleStartClaim,
    handleConfirmClaim,
    handleCancelClaim
  }
}
