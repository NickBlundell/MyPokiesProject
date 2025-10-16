export const dynamic = 'force-dynamic'


import GameCatalogV2 from '@/components/game-catalog-v2'
import { Heart } from 'lucide-react'

export default function FavoritesPage() {
  return (
    <GameCatalogV2
      title="Favorites"
      icon={<Heart className="w-8 h-8 text-red-500" />}
      requiresAuth={true}
    />
  )
}
