import GameCatalogV2 from '@/components/game-catalog-v2'
import { Clock } from 'lucide-react'

export default function RecentGamesPage() {
  return (
    <GameCatalogV2
      title="Recently Played"
      icon={<Clock className="w-8 h-8 text-blue-500" />}
      requiresAuth={true}
    />
  )
}
