import PageLayout from '@/components/page-layout'
import { LayoutGrid } from 'lucide-react'

export default function ProvidersPage() {
  return (
    <PageLayout title="Game Providers" icon={<LayoutGrid className="w-8 h-8 text-white" />}>
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400 text-lg">Game Providers page coming soon...</p>
      </div>
    </PageLayout>
  )
}
