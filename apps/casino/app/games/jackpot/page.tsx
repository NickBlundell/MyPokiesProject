import GameCatalogV2 from '@/components/game-catalog-v2'
import { Coins } from 'lucide-react'

export default function JackpotGamesPage() {
  return (
    <GameCatalogV2
      title="Big Jackpot Buys"
      showJackpot={true}
      icon={<Coins className="w-8 h-8 text-white" />}
    />
  )
}
