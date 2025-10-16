import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { Users, TrendingUp, DollarSign, Award } from 'lucide-react'

export default async function AffiliatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Affiliate Program" icon={<Users className="w-8 h-8 text-purple-400" />}>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-2 border-purple-500/50 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Earn Up to 40% Revenue Share</h2>
          <p className="text-gray-300 text-lg mb-6">
            Join our affiliate program and earn generous commissions by promoting MyPokies to your audience.
          </p>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-bold transition-all">
            Join Now
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">High Commissions</h3>
            <p className="text-gray-400 text-sm">Earn up to 40% revenue share with no negative carryover.</p>
          </div>

          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <DollarSign className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Monthly Payments</h3>
            <p className="text-gray-400 text-sm">Get paid on time, every month, with multiple payment options.</p>
          </div>

          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <Award className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Marketing Tools</h3>
            <p className="text-gray-400 text-sm">Access banners, landing pages, and tracking tools.</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Commission Structure</h2>
          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-[#2a3439]">
                <span className="text-gray-400">0-10 Active Players</span>
                <span className="text-white font-bold">25%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#2a3439]">
                <span className="text-gray-400">11-50 Active Players</span>
                <span className="text-white font-bold">30%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#2a3439]">
                <span className="text-gray-400">51-100 Active Players</span>
                <span className="text-white font-bold">35%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">100+ Active Players</span>
                <span className="text-purple-400 font-bold">40%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Contact Us</h3>
          <p className="text-gray-400 mb-4">Interested in becoming an affiliate? Get in touch with our affiliate team:</p>
          <p className="text-white">affiliates@mypokies.com</p>
        </div>
      </div>
    </PageLayout>
  )
}
