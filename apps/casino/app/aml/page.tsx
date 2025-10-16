import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { ShieldCheck } from 'lucide-react'

export default async function AMLPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Anti-Money Laundering Policy" icon={<ShieldCheck className="w-8 h-8 text-red-400" />}>
      <div className="space-y-6 text-gray-300">
        <p>
          MyPokies is committed to preventing money laundering and terrorist financing. We have implemented comprehensive Anti-Money Laundering (AML) procedures in accordance with applicable laws and regulations.
        </p>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Our AML Commitment</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Verify the identity of all customers</li>
            <li>Monitor transactions for suspicious activity</li>
            <li>Report suspicious transactions to authorities</li>
            <li>Maintain comprehensive transaction records</li>
            <li>Train staff on AML procedures</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Customer Due Diligence</h2>
          <p>
            We conduct Customer Due Diligence (CDD) on all players, which includes:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-3">
            <li>Identity verification through KYC procedures</li>
            <li>Monitoring of transaction patterns</li>
            <li>Enhanced due diligence for high-value transactions</li>
            <li>Ongoing monitoring of customer activity</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Suspicious Activity</h2>
          <p className="mb-3">
            We monitor for indicators of money laundering, including:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Unusually large or frequent deposits</li>
            <li>Minimal or no gaming activity followed by withdrawals</li>
            <li>Deposits and immediate withdrawal requests</li>
            <li>Multiple accounts from the same person or household</li>
            <li>Inconsistent betting patterns</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Record Keeping</h2>
          <p>
            We maintain detailed records of all transactions, identity verification documents, and account activity for a minimum of 5 years as required by law.
          </p>
        </div>

        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-3">Reporting</h3>
          <p className="text-sm">
            Suspicious transactions are reported to the relevant authorities in accordance with applicable laws. We cannot disclose the filing of such reports to affected customers.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
