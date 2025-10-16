export const dynamic = 'force-dynamic'


import GameCatalogV2 from '@/components/game-catalog-v2'
import { Spade } from 'lucide-react'

export default function BlackjackPage() {
  return (
    <GameCatalogV2
      title="Blackjack"
      category="blackjack"
      icon={<Spade className="w-8 h-8 text-white" />}
    />
  )
}
