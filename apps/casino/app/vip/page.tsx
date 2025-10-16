import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { Crown, Star, Trophy, Gem } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VIP Loyalty Program',
  description: 'Join our exclusive VIP loyalty program with 5 tiers: Bronze, Silver, Gold, Platinum, and Diamond. Earn points with every wager and unlock amazing rewards!',
  keywords: ['VIP', 'loyalty program', 'rewards', 'casino rewards', 'VIP casino', 'loyalty points'],
  openGraph: {
    title: 'VIP Loyalty Program | MyPokies Casino',
    description: 'Join our exclusive VIP loyalty program with 5 tiers. Earn points and unlock amazing rewards!',
  },
}

export default async function VIPPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="VIP Program" icon={<Crown className="w-8 h-8 text-yellow-400" />}>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/50 rounded-xl p-6 md:p-8 text-center">
          <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4">Join the Elite</h2>
          <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
            Earn loyalty points with every bet and unlock exclusive rewards, faster withdrawals, and dedicated VIP support as you climb through our 5 prestigious tiers.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>Earn 1 point per $10 wagered</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Automatic tier upgrades</span>
            </div>
          </div>
        </div>

        {/* VIP Tiers */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">VIP Tiers</h2>
          <div className="space-y-4">
            {/* Bronze */}
            <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/30 border-2 border-orange-700/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="bg-orange-700 p-3 rounded-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Bronze</h3>
                    <span className="text-orange-400 font-semibold">0 points</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Standard withdrawal times</li>
                    <li>• Email support</li>
                    <li>• Access to standard bonuses</li>
                    <li>• 1 jackpot ticket per $250 wagered</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Silver */}
            <div className="bg-gradient-to-r from-gray-500/30 to-gray-400/30 border-2 border-gray-400/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="bg-gray-400 p-3 rounded-lg">
                  <Star className="w-6 h-6 text-[#0a0f14]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Silver</h3>
                    <span className="text-gray-300 font-semibold">500 points</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Priority withdrawals (24-48 hours)</li>
                    <li>• Live chat support</li>
                    <li>• Exclusive weekly bonuses</li>
                    <li>• 1 jackpot ticket per $225 wagered</li>
                    <li>• Birthday bonus</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Gold */}
            <div className="bg-gradient-to-r from-yellow-600/30 to-yellow-500/30 border-2 border-yellow-500/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="bg-yellow-500 p-3 rounded-lg">
                  <Trophy className="w-6 h-6 text-[#0a0f14]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Gold</h3>
                    <span className="text-yellow-400 font-semibold">2,500 points</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Fast-track withdrawals (12-24 hours)</li>
                    <li>• Priority support</li>
                    <li>• Enhanced weekly bonuses</li>
                    <li>• 1 jackpot ticket per $200 wagered</li>
                    <li>• Monthly cashback (5%)</li>
                    <li>• Special event invitations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Platinum */}
            <div className="bg-gradient-to-r from-blue-600/30 to-blue-500/30 border-2 border-blue-500/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Platinum</h3>
                    <span className="text-blue-400 font-semibold">10,000 points</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Express withdrawals (6-12 hours)</li>
                    <li>• Dedicated VIP manager</li>
                    <li>• Premium weekly bonuses</li>
                    <li>• 1 jackpot ticket per $175 wagered</li>
                    <li>• Monthly cashback (7.5%)</li>
                    <li>• Luxury gifts and experiences</li>
                    <li>• Higher table limits</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Diamond */}
            <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-2 border-purple-500/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-lg">
                  <Gem className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Diamond</h3>
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">50,000 points</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Instant withdrawals (0-6 hours)</li>
                    <li>• 24/7 dedicated VIP manager</li>
                    <li>• Exclusive Diamond bonuses</li>
                    <li>• 1 jackpot ticket per $150 wagered</li>
                    <li>• Monthly cashback (10%)</li>
                    <li>• Personal account customization</li>
                    <li>• Invitations to exclusive events</li>
                    <li>• Highest table limits</li>
                    <li>• Custom rewards and experiences</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
          <div className="space-y-4 text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">1. Earn Points</h4>
              <p className="text-sm">Earn 1 loyalty point for every $10 you wager on any game. Points are automatically credited to your account.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">2. Climb Tiers</h4>
              <p className="text-sm">As you accumulate points, you&apos;ll automatically advance through the tiers. Your tier level is permanent and never decreases.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">3. Redeem Rewards</h4>
              <p className="text-sm">Convert your points into bonus credits at any time. Redemption rates improve as you climb higher tiers.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">4. Enjoy Benefits</h4>
              <p className="text-sm">Unlock exclusive perks like faster withdrawals, higher bonuses, and dedicated support at each tier level.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/50 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to Start Your VIP Journey?</h3>
          <p className="text-gray-300 mb-6">Join MyPokies today and start earning loyalty points with your first bet!</p>
          <button className="bg-yellow-400 hover:bg-yellow-500 text-[#0a0f14] px-8 py-3 rounded-full font-bold transition-all">
            Sign Up Now
          </button>
        </div>
      </div>
    </PageLayout>
  )
}
