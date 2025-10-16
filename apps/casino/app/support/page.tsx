import PageLayout from '@/components/page-layout'
import { Headphones } from 'lucide-react'

export default function SupportPage() {
  return (
    <PageLayout title="Live Support" icon={<Headphones className="w-8 h-8 text-white" />}>
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400 text-lg">Live Support page coming soon...</p>
      </div>
    </PageLayout>
  )
}
