export const dynamic = 'force-dynamic'


import GameCatalogV2 from '@/components/game-catalog-v2'
import { Gamepad2 } from 'lucide-react'

export default function GameShowsPage() {
  return (
    <GameCatalogV2
      title="Game Shows"
      category="shows"
      icon={<Gamepad2 className="w-8 h-8 text-white" />}
    />
  )
}
