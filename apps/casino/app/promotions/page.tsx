import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { Gift, Calendar } from 'lucide-react'
import { BonusCountdown } from '@/components/bonus-countdown'

export interface DailyBonus {
  id: string
  bonus_code: string
  bonus_name: string
  match_percentage: number
  max_bonus_amount: number
  min_deposit_amount: number
  day_of_week: number
  terms_conditions: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function PromotionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch daily bonuses from database
  const { data: dailyBonuses } = await supabase
    .from('bonus_offers')
    .select('*')
    .not('day_of_week', 'is', null)
    .eq('active', true)
    .order('day_of_week')

  // Get current day (0-6)
  const currentDay = new Date().getDay()

  // Find today's bonus and other bonuses
  const todayBonus = dailyBonuses?.find(b => b.day_of_week === currentDay)
  const otherBonuses = dailyBonuses?.filter(b => b.day_of_week !== currentDay) || []

  return (
    <PageLayout user={user} title="Promotions" icon={<Gift className="w-8 h-8 text-yellow-400" />}>
      <div className="space-y-8">
        {/* Welcome Bonus */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/50 rounded-xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="bg-yellow-400 text-[#0a0f14] p-3 rounded-lg">
              <Gift className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Bonus</h2>
              <p className="text-xl text-yellow-400 font-bold mb-3">100% Match up to $500</p>
              <p className="text-gray-300 mb-4">
                Get started with our generous welcome bonus! We&apos;ll match your first deposit 100% up to $500.
              </p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 mb-4">
                <li>Minimum deposit: $20</li>
                <li>Maximum bonus: $500</li>
                <li>Wagering requirement: 30x</li>
                <li>Valid for 30 days</li>
              </ul>
              <button className="bg-yellow-400 hover:bg-yellow-500 text-[#0a0f14] px-6 py-3 rounded-full font-bold transition-all">
                Claim Now
              </button>
            </div>
          </div>
        </div>

        {/* Phone Verification Bonus */}
        <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-2 border-blue-500/50 rounded-xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="bg-blue-400 text-[#0a0f14] p-3 rounded-lg">
              <Gift className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Phone Verification Bonus</h2>
              <p className="text-xl text-blue-400 font-bold mb-3">$20 Free - No Deposit Required!</p>
              <p className="text-gray-300 mb-4">
                Simply verify your phone number and receive $20 free to play with - no deposit needed!
              </p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 mb-4">
                <li>No deposit required</li>
                <li>Instant $20 bonus credit</li>
                <li>Wagering requirement: 30x</li>
                <li>One-time offer per player</li>
              </ul>
              <button className="bg-blue-400 hover:bg-blue-500 text-[#0a0f14] px-6 py-3 rounded-full font-bold transition-all">
                Verify Phone
              </button>
            </div>
          </div>
        </div>

        {/* Daily Bonuses */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Daily Bonuses</h2>

          {/* Today's Bonus - Featured Large */}
          {todayBonus && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-2 border-green-500/50 rounded-xl p-6 md:p-8 mb-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-400 text-[#0a0f14] p-3 rounded-lg">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                    <div className="inline-block bg-green-400/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-green-400 font-semibold text-xs uppercase tracking-wide">
                        ⭐ Today&apos;s Bonus
                      </span>
                    </div>
                    <BonusCountdown />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{todayBonus.bonus_name}</h2>
                  <p className="text-xl text-green-400 font-bold mb-3">
                    {todayBonus.match_percentage}% Match up to ${todayBonus.max_bonus_amount}
                  </p>
                  <p className="text-gray-300 mb-4">
                    {DAYS[todayBonus.day_of_week]}&apos;s special offer! Deposit at least ${todayBonus.min_deposit_amount} and get a {todayBonus.match_percentage}% match bonus.
                  </p>
                  <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 mb-4">
                    <li>Minimum deposit: ${todayBonus.min_deposit_amount}</li>
                    <li>Maximum bonus: ${todayBonus.max_bonus_amount}</li>
                    <li>Match percentage: {todayBonus.match_percentage}%</li>
                    <li>Wagering requirement: 35x bonus amount</li>
                  </ul>
                  <button className="bg-green-400 hover:bg-green-500 text-[#0a0f14] px-6 py-3 rounded-full font-bold transition-all">
                    Claim Today&apos;s Bonus
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Other Days - Two per row */}
          <div className="grid md:grid-cols-2 gap-4">
            {otherBonuses.map((bonus) => (
              <div
                key={bonus.id}
                className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-4 hover:border-blue-800/50 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <h3 className="text-lg font-bold text-white">{DAYS[bonus.day_of_week]}</h3>
                </div>
                <p className="text-gray-300 font-semibold mb-1">{bonus.bonus_name}</p>
                <p className="text-blue-400 text-sm font-bold mb-3">
                  {bonus.match_percentage}% Match up to ${bonus.max_bonus_amount}
                </p>
                <div className="text-gray-400 text-xs space-y-0.5 mb-3">
                  <p>Min deposit: ${bonus.min_deposit_amount}</p>
                  <p>Wagering: 35x bonus</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
                  Learn More →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-3">Terms & Conditions</h3>
          <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
            <li>All bonuses are subject to wagering requirements before withdrawal</li>
            <li>Minimum deposit amounts apply to all deposit bonuses</li>
            <li>Maximum bet with bonus funds is $5 per spin/hand</li>
            <li>Different games contribute different percentages to wagering requirements</li>
            <li>Bonuses expire if wagering is not completed within the specified timeframe</li>
            <li>MyPokies reserves the right to modify or cancel promotions at any time</li>
            <li>Only one bonus can be active at a time</li>
            <li>Full terms and conditions apply - please see individual promotion pages</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  )
}
