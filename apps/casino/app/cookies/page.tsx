import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { Cookie } from 'lucide-react'

export default async function CookiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Cookie Policy" icon={<Cookie className="w-8 h-8 text-yellow-400" />}>
      <div className="space-y-6 text-gray-300">
        <p>
          This Cookie Policy explains how MyPokies uses cookies and similar tracking technologies when you visit our website.
        </p>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help us provide you with a better experience by remembering your preferences and analyzing site usage.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Types of Cookies We Use</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-bold mb-2">Essential Cookies</h3>
              <p className="text-sm">Required for the website to function properly. These cannot be disabled.</p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-2">Performance Cookies</h3>
              <p className="text-sm">Help us understand how visitors interact with our website by collecting anonymous data.</p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-2">Functional Cookies</h3>
              <p className="text-sm">Remember your preferences and settings to provide enhanced functionality.</p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-2">Marketing Cookies</h3>
              <p className="text-sm">Track your visits across websites to deliver targeted advertising.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. However, disabling certain cookies may affect website functionality.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
