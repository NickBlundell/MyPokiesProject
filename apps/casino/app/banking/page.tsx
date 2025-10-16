import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { CreditCard, ArrowDown, ArrowUp, Clock } from 'lucide-react'

export default async function BankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Banking" icon={<CreditCard className="w-8 h-8 text-green-400" />}>
      <div className="space-y-8">
        {/* Deposits */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <ArrowDown className="w-6 h-6 text-green-400" />
            <h2 className="text-2xl font-bold text-white">Deposits</h2>
          </div>
          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6 mb-4">
            <p className="text-gray-300 mb-4">We accept a variety of secure payment methods for deposits. All transactions are encrypted and processed securely.</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { method: 'VISA / Mastercard', min: '$10', max: '$5,000', time: 'Instant', fee: 'Free' },
                { method: 'Bitcoin', min: '$20', max: '$10,000', time: 'Instant', fee: 'Free' },
                { method: 'Ethereum', min: '$20', max: '$10,000', time: 'Instant', fee: 'Free' },
                { method: 'Bank Transfer', min: '$50', max: '$50,000', time: '1-3 days', fee: 'Free' },
                { method: 'PayPal', min: '$10', max: '$2,000', time: 'Instant', fee: 'Free' },
              ].map((method) => (
                <div key={method.method} className="bg-[#0a0f14] rounded-lg p-4">
                  <h3 className="text-white font-bold mb-2">{method.method}</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-400">Min: <span className="text-white">{method.min}</span></p>
                    <p className="text-gray-400">Max: <span className="text-white">{method.max}</span></p>
                    <p className="text-gray-400">Processing: <span className="text-white">{method.time}</span></p>
                    <p className="text-gray-400">Fee: <span className="text-green-400">{method.fee}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Withdrawals */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <ArrowUp className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Withdrawals</h2>
          </div>
          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6 mb-4">
            <p className="text-gray-300 mb-4">Withdrawal times vary based on your VIP tier and chosen payment method.</p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {[
                { method: 'VISA / Mastercard', min: '$20', max: '$5,000', time: '2-5 days', fee: 'Free' },
                { method: 'Bitcoin', min: '$20', max: '$50,000', time: '0-24 hours', fee: 'Network fee' },
                { method: 'Ethereum', min: '$20', max: '$50,000', time: '0-24 hours', fee: 'Network fee' },
                { method: 'Bank Transfer', min: '$100', max: '$100,000', time: '3-7 days', fee: 'Free' },
              ].map((method) => (
                <div key={method.method} className="bg-[#0a0f14] rounded-lg p-4">
                  <h3 className="text-white font-bold mb-2">{method.method}</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-400">Min: <span className="text-white">{method.min}</span></p>
                    <p className="text-gray-400">Max: <span className="text-white">{method.max}</span></p>
                    <p className="text-gray-400">Processing: <span className="text-white">{method.time}</span></p>
                    <p className="text-gray-400">Fee: <span className="text-white">{method.fee}</span></p>
                  </div>
                </div>
              ))}
            </div>

            {/* VIP Tier Processing Times */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <h3 className="text-white font-bold">VIP Tier Processing Times</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div>
                  <p className="text-orange-400 font-semibold">Bronze</p>
                  <p className="text-gray-400">48-72 hours</p>
                </div>
                <div>
                  <p className="text-gray-300 font-semibold">Silver</p>
                  <p className="text-gray-400">24-48 hours</p>
                </div>
                <div>
                  <p className="text-yellow-400 font-semibold">Gold</p>
                  <p className="text-gray-400">12-24 hours</p>
                </div>
                <div>
                  <p className="text-blue-400 font-semibold">Platinum</p>
                  <p className="text-gray-400">6-12 hours</p>
                </div>
                <div>
                  <p className="text-purple-400 font-semibold">Diamond</p>
                  <p className="text-gray-400">0-6 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Important Information</h3>
          <ul className="space-y-2 text-gray-300 text-sm list-disc list-inside">
            <li>All withdrawals must be to an account in your name</li>
            <li>Account verification (KYC) is required before your first withdrawal</li>
            <li>Wagering requirements must be met on bonus funds before withdrawal</li>
            <li>We reserve the right to request additional documentation for large withdrawals</li>
            <li>Cryptocurrency withdrawals are subject to network confirmation times</li>
            <li>Processing times do not include weekends or public holidays</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  )
}
