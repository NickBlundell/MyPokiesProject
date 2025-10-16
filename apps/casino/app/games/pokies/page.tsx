export const dynamic = 'force-dynamic'


import GameCatalogV2 from '@/components/game-catalog-v2'
import { Apple } from 'lucide-react'

export default function PokiesPage() {
  return (
    <GameCatalogV2
      title="Pokies (Slots)"
      category="slots"
      icon={<Apple className="w-8 h-8 text-white" />}
    />
  )
}
