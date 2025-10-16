export const dynamic = 'force-dynamic'


import GameCatalogV2 from '@/components/game-catalog-v2'
import { CircleDot } from 'lucide-react'

export default function RoulettePage() {
  return (
    <GameCatalogV2
      title="Roulette"
      category="roulette"
      icon={<CircleDot className="w-8 h-8 text-white" />}
    />
  )
}
