import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import ActiveOffersClient from './ActiveOffersClient'

export interface TriggeredPromotion {
  id: string
  promotion_id: string
  user_id: string
  triggered_at: string
  claimed_at: string | null
  expires_at: string
  is_live: boolean
  status: 'available' | 'claimed' | 'expired'
  trigger_context: any
  bonus_id: string | null
  // Joined fields
  promotion_name?: string
  user_email?: string
  user_phone?: string
}

export interface ActiveOffersStats {
  totalOffers: number
  liveOffers: number
  claimedOffers: number
  expiredOffers: number
}

async function getActiveOffers() {
  const supabase = await createAdminClient()

  try {
    // Fetch all triggered promotions with template and user details
    const { data: offers, error: offersError } = await supabase
      .from('triggered_promotions')
      .select(`
        *,
        promotion_templates (
          name
        ),
        users (
          email,
          phone
        )
      `)
      .order('triggered_at', { ascending: false })

    if (offersError) {
      logger.error('Error fetching active offers', offersError, {
        function: 'getActiveOffers',
      })
      return { offers: [], stats: getDefaultStats() }
    }

    // Transform the data to flatten the joined fields
    const transformedOffers = (offers || []).map(offer => ({
      id: offer.id,
      promotion_id: offer.promotion_id,
      user_id: offer.user_id,
      triggered_at: offer.triggered_at,
      claimed_at: offer.claimed_at,
      expires_at: offer.expires_at,
      is_live: offer.is_live,
      status: offer.status,
      trigger_context: offer.trigger_context,
      bonus_id: offer.bonus_id,
      promotion_name: offer.promotion_templates?.name || 'Unknown',
      user_email: offer.users?.email,
      user_phone: offer.users?.phone
    }))

    // Calculate stats
    const stats = calculateStats(transformedOffers)

    return { offers: transformedOffers, stats }
  } catch (error) {
    logger.error('Unexpected error in getActiveOffers', error, {
      function: 'getActiveOffers',
    })
    return { offers: [], stats: getDefaultStats() }
  }
}

function calculateStats(offers: any[]): ActiveOffersStats {
  return {
    totalOffers: offers.length,
    liveOffers: offers.filter(o => o.is_live && o.status === 'available').length,
    claimedOffers: offers.filter(o => o.status === 'claimed').length,
    expiredOffers: offers.filter(o => o.status === 'expired').length
  }
}

function getDefaultStats(): ActiveOffersStats {
  return {
    totalOffers: 0,
    liveOffers: 0,
    claimedOffers: 0,
    expiredOffers: 0
  }
}

export default async function ActiveOffersPage() {
  const { offers, stats } = await getActiveOffers()

  return <ActiveOffersClient offers={offers} stats={stats} />
}
