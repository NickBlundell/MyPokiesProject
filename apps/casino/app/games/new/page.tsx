import GameCatalogV2 from '@/components/game-catalog-v2'
import { Star } from 'lucide-react'

export default function NewGamesPage() {
  return (
    <GameCatalogV2
      title="New Games"
      showNew={true}
      icon={<Star className="w-8 h-8 text-white" />}
    />
  )
}
