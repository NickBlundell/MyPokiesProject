import GameCatalogV2 from '@/components/game-catalog-v2'
import { Dices } from 'lucide-react'

export default function LiveCasinoPage() {
  return (
    <GameCatalogV2
      title="Live Dealer Tables"
      category="live"
      icon={<Dices className="w-8 h-8 text-white" />}
    />
  )
}
