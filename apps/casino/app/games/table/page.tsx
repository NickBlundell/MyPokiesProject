import GameCatalogV2 from '@/components/game-catalog-v2'
import { Coins } from 'lucide-react'

export default function TableGamesPage() {
  return (
    <GameCatalogV2
      title="Table Games"
      category="table"
      icon={<Coins className="w-8 h-8 text-white" />}
    />
  )
}
