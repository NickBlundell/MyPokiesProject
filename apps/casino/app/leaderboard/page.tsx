import PageLayout from '@/components/page-layout'
import { Trophy } from 'lucide-react'

export default function LeaderboardPage() {
  return (
    <PageLayout title="Leaderboard" icon={<Trophy className="w-8 h-8 text-white" />}>
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400 text-lg">Leaderboard page coming soon...</p>
      </div>
    </PageLayout>
  )
}
