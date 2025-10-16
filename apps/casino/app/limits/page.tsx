import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { DollarSign } from 'lucide-react'

export default async function LimitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Set Limits" icon={<DollarSign className="w-8 h-8 text-green-400" />}>
      <div className="space-y-6 text-gray-300">
        <p className="text-lg">
          Setting deposit limits helps you stay in control of your gambling. You can set daily, weekly, or monthly limits to manage your spending.
        </p>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Types of Limits</h2>
          <div className="space-y-4">
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">Daily Deposit Limit</h3>
              <p className="text-sm mb-3">Set a maximum amount you can deposit in any 24-hour period</p>
              {user && (
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Enter amount"
                    className="flex-1 bg-[#0a0f14] border border-[#2a3439] rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all">
                    Set Limit
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">Weekly Deposit Limit</h3>
              <p className="text-sm mb-3">Set a maximum amount you can deposit in any 7-day period</p>
              {user && (
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Enter amount"
                    className="flex-1 bg-[#0a0f14] border border-[#2a3439] rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all">
                    Set Limit
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">Monthly Deposit Limit</h3>
              <p className="text-sm mb-3">Set a maximum amount you can deposit in any 30-day period</p>
              {user && (
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Enter amount"
                    className="flex-1 bg-[#0a0f14] border border-[#2a3439] rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all">
                    Set Limit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">How Limits Work</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Limits take effect immediately once set</li>
            <li>You can decrease your limit at any time</li>
            <li>Increases to limits have a 24-hour cooling-off period</li>
            <li>Once you reach your limit, you cannot deposit more until the period resets</li>
            <li>Limits apply across all payment methods</li>
          </ul>
        </div>

        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-3">Important Information</h3>
          <ul className="space-y-2 text-sm">
            <li>• Setting limits is voluntary but highly recommended</li>
            <li>• Limits help you gamble responsibly and within your means</li>
            <li>• You can combine multiple limits (e.g., daily + monthly)</li>
            <li>• Contact support if you need help setting appropriate limits</li>
            <li>• Consider self-exclusion if you&apos;re unable to stick to your limits</li>
          </ul>
        </div>

        {!user && (
          <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-2 border-blue-500/50 rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Log In to Set Limits</h3>
            <p className="text-gray-300 mb-6">You need to be logged in to set deposit limits</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition-all">
              Log In
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
