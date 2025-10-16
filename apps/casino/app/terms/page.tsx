import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { FileText } from 'lucide-react'

export default async function TermsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Terms & Conditions" icon={<FileText className="w-8 h-8 text-gray-400" />}>
      <div className="space-y-6 text-gray-300">
        <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using MyPokies, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use this service.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">2. Eligibility</h2>
          <p>
            You must be at least 18 years old to use MyPokies. By using our service, you represent and warrant that you are of legal age to form a binding contract and meet all eligibility requirements.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">3. Account Registration</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>You must provide accurate and complete information during registration</li>
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
            <li>One account per person, household, or IP address is permitted</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">4. Deposits and Withdrawals</h2>
          <p>
            All financial transactions are subject to our banking policies. Wagering requirements must be met before withdrawing bonus funds. We reserve the right to request verification documents before processing withdrawals.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">5. Bonuses and Promotions</h2>
          <p>
            All bonuses are subject to specific terms and conditions. Abuse of bonuses may result in forfeiture of bonus funds and account closure. Only one bonus can be active at a time unless otherwise stated.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">6. Responsible Gaming</h2>
          <p>
            MyPokies is committed to responsible gaming. We provide tools for setting limits, self-exclusion, and links to professional support services. If you believe you have a gambling problem, please seek help immediately.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">7. Prohibited Activities</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Using automated betting software or bots</li>
            <li>Colluding with other players</li>
            <li>Fraudulent activity or money laundering</li>
            <li>Multiple accounts or account sharing</li>
            <li>Bonus abuse or exploitation of errors</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">8. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violation of these terms, suspicious activity, or at our discretion. Upon termination, any bonus funds will be forfeited.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">9. Disclaimer</h2>
          <p>
            MyPokies is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted access to our services and are not liable for technical failures or errors.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of MyPokies after changes constitutes acceptance of the revised terms.
          </p>
        </div>

        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <p className="text-sm">
            For questions about these terms, please contact us at legal@mypokies.com
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
