import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { Heart, AlertTriangle, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default async function ResponsibleGamingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Responsible Gaming" icon={<Heart className="w-8 h-8 text-red-400" />}>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-500/50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Gambling Can Be Addictive</h2>
              <p className="text-gray-300">
                MyPokies is committed to promoting responsible gaming. While most people enjoy gambling as entertainment, it can become a problem for some. We provide tools and resources to help you stay in control.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Signs of Problem Gambling</h2>
          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <ul className="space-y-2 text-gray-300">
              <li>• Spending more money or time gambling than you can afford</li>
              <li>• Gambling to escape problems or relieve feelings of anxiety or depression</li>
              <li>• Neglecting work, family, or social obligations due to gambling</li>
              <li>• Borrowing money or selling possessions to gamble</li>
              <li>• Lying to family or friends about your gambling</li>
              <li>• Feeling guilty or ashamed about your gambling</li>
              <li>• Repeated unsuccessful attempts to cut down or stop gambling</li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Our Tools</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/limits" className="bg-[#1a2024] border border-[#2a3439] hover:border-blue-800/50 rounded-lg p-6 transition-all">
              <DollarSign className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="text-white font-bold mb-2">Set Limits</h3>
              <p className="text-gray-400 text-sm">Set daily, weekly, or monthly deposit limits</p>
            </Link>

            <Link href="/self-exclusion" className="bg-[#1a2024] border border-[#2a3439] hover:border-blue-800/50 rounded-lg p-6 transition-all">
              <Clock className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="text-white font-bold mb-2">Take a Break</h3>
              <p className="text-gray-400 text-sm">Self-exclude for a period of time</p>
            </Link>

            <Link href="/contact" className="bg-[#1a2024] border border-[#2a3439] hover:border-blue-800/50 rounded-lg p-6 transition-all">
              <Heart className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="text-white font-bold mb-2">Get Help</h3>
              <p className="text-gray-400 text-sm">Contact support or helplines</p>
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Help & Support Organizations</h2>
          <div className="space-y-4">
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">Gambling Help Online (Australia)</h3>
              <p className="text-gray-400 text-sm mb-2">24/7 confidential counseling and support</p>
              <p className="text-blue-400">www.gamblinghelponline.org.au</p>
              <p className="text-blue-400">1800 858 858</p>
            </div>

            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">Gamblers Anonymous</h3>
              <p className="text-gray-400 text-sm mb-2">Support groups for problem gamblers</p>
              <p className="text-blue-400">www.gamblersanonymous.org.au</p>
            </div>

            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
              <h3 className="text-white font-bold mb-2">Lifeline Australia</h3>
              <p className="text-gray-400 text-sm mb-2">Crisis support and suicide prevention</p>
              <p className="text-blue-400">13 11 14</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Responsible Gaming Tips</h2>
          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <ul className="space-y-2 text-gray-300">
              <li>• Set a budget before you start and stick to it</li>
              <li>• Never chase your losses</li>
              <li>• Don&apos;t gamble when you&apos;re upset or depressed</li>
              <li>• Take regular breaks</li>
              <li>• Don&apos;t borrow money to gamble</li>
              <li>• Balance gambling with other activities</li>
              <li>• Remember that gambling is entertainment, not a way to make money</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
