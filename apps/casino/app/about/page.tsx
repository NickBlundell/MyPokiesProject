import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { Info } from 'lucide-react'

export default async function AboutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="About MyPokies" icon={<Info className="w-8 h-8 text-blue-400" />}>
      <div className="space-y-6 text-gray-300">
        <p className="text-lg">
          MyPokies is Australia&apos;s premier online casino, offering thousands of exciting games, generous bonuses, and a world-class VIP program.
        </p>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Our Mission</h2>
          <p>
            To provide Australian players with the most entertaining, fair, and rewarding online casino experience possible. We&apos;re committed to responsible gaming, player safety, and exceptional customer service.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Why Choose MyPokies?</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>Thousands of premium casino games from top providers</li>
            <li>Fast and secure deposits and withdrawals</li>
            <li>24/7 customer support</li>
            <li>Generous bonuses and promotions</li>
            <li>5-tier VIP program with exclusive rewards</li>
            <li>Weekly progressive jackpot draws</li>
            <li>Fully licensed and regulated</li>
            <li>Proven fair gaming with certified RNG</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Our Commitment</h2>
          <p>
            We take responsible gaming seriously. MyPokies provides tools for setting deposit limits, self-exclusion options, and links to professional gambling support services. We&apos;re committed to ensuring our platform remains a safe and enjoyable form of entertainment.
          </p>
        </div>

        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-3">Licensed & Regulated</h3>
          <p className="text-sm">
            MyPokies is operated by MyPokies Australia Pty Ltd and is licensed and regulated by the appropriate gaming authorities. We adhere to strict standards of fairness, security, and player protection.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
