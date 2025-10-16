import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { HelpCircle, MessageCircle, Mail, Search } from 'lucide-react'
import Link from 'next/link'

export default async function HelpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Help Center" icon={<HelpCircle className="w-8 h-8 text-blue-400" />}>
      <div className="space-y-8">
        {/* Quick Help */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/contact" className="bg-[#1a2024] border border-[#2a3439] hover:border-blue-800/50 rounded-lg p-6 transition-all group">
            <MessageCircle className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Live Chat</h3>
            <p className="text-gray-400 text-sm">Get instant help from our support team</p>
          </Link>

          <Link href="/contact" className="bg-[#1a2024] border border-[#2a3439] hover:border-blue-800/50 rounded-lg p-6 transition-all group">
            <Mail className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Email Support</h3>
            <p className="text-gray-400 text-sm">support@mypokies.com</p>
          </Link>

          <Link href="/faq" className="bg-[#1a2024] border border-[#2a3439] hover:border-blue-800/50 rounded-lg p-6 transition-all group">
            <Search className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">FAQ</h3>
            <p className="text-gray-400 text-sm">Find answers to common questions</p>
          </Link>
        </div>

        {/* Popular Topics */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Popular Topics</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'How to Create an Account', link: '/help/account' },
              { title: 'Making a Deposit', link: '/banking' },
              { title: 'Withdrawing Funds', link: '/banking' },
              { title: 'Verifying Your Account', link: '/kyc' },
              { title: 'Bonus Terms & Conditions', link: '/promotions' },
              { title: 'VIP Program Details', link: '/vip' },
              { title: 'Responsible Gaming Tools', link: '/responsible-gaming' },
              { title: 'Game Rules & Payouts', link: '/help/games' },
            ].map((topic) => (
              <Link
                key={topic.title}
                href={topic.link}
                className="bg-[#1a2024] border border-[#2a3439] hover:border-blue-800/50 rounded-lg p-4 transition-all group"
              >
                <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                  {topic.title} →
                </h3>
              </Link>
            ))}
          </div>
        </div>

        {/* Support Hours */}
        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Support Hours</h3>
          <div className="space-y-2 text-gray-300">
            <p><span className="font-semibold text-white">Live Chat:</span> 24/7</p>
            <p><span className="font-semibold text-white">Email:</span> Responded within 24 hours</p>
            <p><span className="font-semibold text-white">VIP Support:</span> Dedicated managers for Platinum & Diamond tiers</p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
