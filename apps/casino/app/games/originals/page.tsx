import GameCatalogV2 from '@/components/game-catalog-v2'
import { Flame } from 'lucide-react'

export default function OriginalsPage() {
  return (
    <GameCatalogV2
      title="Original Games"
      category="originals"
      icon={<Flame className="w-8 h-8 text-white" />}
    />
  )
}
