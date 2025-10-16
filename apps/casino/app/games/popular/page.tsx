export const dynamic = 'force-dynamic'


import GameCatalogV2 from '@/components/game-catalog-v2'
import { TrendingUp } from 'lucide-react'

export default function PopularGamesPage() {
  return (
    <GameCatalogV2
      title="Popular Games"
      icon={<TrendingUp className="w-8 h-8 text-yellow-500" />}
    />
  )
}
