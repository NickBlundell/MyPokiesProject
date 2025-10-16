import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { XCircle } from 'lucide-react'

export default async function SelfExclusionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Self-Exclusion" icon={<XCircle className="w-8 h-8 text-red-400" />}>
      <div className="space-y-6 text-gray-300">
        <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-500/50 rounded-xl p-6">
          <p className="text-lg">
            Self-exclusion allows you to take a break from gambling for a set period of time. During this period, you will not be able to access your account or place any bets.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Self-Exclusion Periods</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">24 Hours</h3>
              <p className="text-gray-400 text-sm">Take a short break to cool down</p>
            </div>
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">1 Week</h3>
              <p className="text-gray-400 text-sm">Step away for a week</p>
            </div>
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">1 Month</h3>
              <p className="text-gray-400 text-sm">Extended break</p>
            </div>
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">6 Months</h3>
              <p className="text-gray-400 text-sm">Long-term self-exclusion</p>
            </div>
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">1 Year</h3>
              <p className="text-gray-400 text-sm">Annual self-exclusion</p>
            </div>
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">Permanent</h3>
              <p className="text-gray-400 text-sm">Close your account permanently</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">What Happens During Self-Exclusion?</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Your account will be immediately suspended</li>
            <li>You will not be able to log in or place bets</li>
            <li>Any active bonuses will be forfeited</li>
            <li>You will not receive promotional communications</li>
            <li>You can withdraw your remaining balance</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">How to Self-Exclude</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Log in to your account</li>
            <li>Go to Account Settings → Responsible Gaming</li>
            <li>Select &quot;Self-Exclusion&quot;</li>
            <li>Choose your exclusion period</li>
            <li>Confirm your decision</li>
          </ol>
        </div>

        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-3">Important Information</h3>
          <ul className="space-y-2 text-sm">
            <li>• Self-exclusion cannot be reversed once activated</li>
            <li>• The exclusion period must run its full course</li>
            <li>• For permanent exclusion, your account cannot be reopened</li>
            <li>• We recommend seeking professional help if you&apos;re struggling with gambling</li>
          </ul>
        </div>

        {user && (
          <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-500/50 rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Need to Self-Exclude?</h3>
            <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold transition-all">
              Start Self-Exclusion
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
