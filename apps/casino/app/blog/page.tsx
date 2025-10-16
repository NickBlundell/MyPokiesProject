import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { BookOpen } from 'lucide-react'

export default async function BlogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Blog" icon={<BookOpen className="w-8 h-8 text-blue-400" />}>
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-3">Coming Soon</h2>
        <p className="text-gray-400">Our blog is currently under construction. Check back soon for gaming tips, strategy guides, and casino news!</p>
      </div>
    </PageLayout>
  )
}
