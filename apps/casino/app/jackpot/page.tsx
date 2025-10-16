import { createClient } from '@/lib/supabase/server'
import JackpotPage from './jackpot-content'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Weekly Jackpot',
  description: 'Win big with our weekly progressive jackpot! Drawings every Wednesday at 8 PM. Current jackpot pool over $100,000. Earn tickets by playing your favorite games.',
  keywords: ['jackpot', 'progressive jackpot', 'weekly draw', 'win big', 'casino jackpot', 'lottery'],
  openGraph: {
    title: 'Weekly Jackpot | MyPokies Casino',
    description: 'Win big with our weekly progressive jackpot! Drawings every Wednesday at 8 PM.',
  },
}

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <JackpotPage user={user} />
}
