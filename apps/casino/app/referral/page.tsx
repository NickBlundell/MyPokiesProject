import PageLayout from '@/components/page-layout'
import { Users } from 'lucide-react'

export default function ReferralPage() {
  return (
    <PageLayout title="Referral Program" icon={<Users className="w-8 h-8 text-white" />}>
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400 text-lg">Referral Program page coming soon...</p>
      </div>
    </PageLayout>
  )
}
