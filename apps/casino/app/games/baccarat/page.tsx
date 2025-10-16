export const dynamic = 'force-dynamic'


import GameCatalogV2 from '@/components/game-catalog-v2'
import { Diamond } from 'lucide-react'

export default function BaccaratPage() {
  return (
    <GameCatalogV2
      title="Baccarat"
      category="baccarat"
      icon={<Diamond className="w-8 h-8 text-white" />}
    />
  )
}
