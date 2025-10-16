import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { CheckCircle } from 'lucide-react'

export default async function KYCPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="KYC Verification" icon={<CheckCircle className="w-8 h-8 text-green-400" />}>
      <div className="space-y-6 text-gray-300">
        <p>
          Know Your Customer (KYC) verification is a regulatory requirement to prevent fraud, money laundering, and underage gambling.
        </p>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Why We Need Verification</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>To comply with legal and regulatory requirements</li>
            <li>To prevent fraud and protect your account</li>
            <li>To ensure you are of legal gambling age</li>
            <li>To process withdrawals securely</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Required Documents</h2>
          <div className="space-y-4">
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">1. Proof of Identity</h3>
              <p className="text-sm">Valid government-issued ID (passport, driver&apos;s license, or national ID card)</p>
            </div>
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">2. Proof of Address</h3>
              <p className="text-sm">Recent utility bill, bank statement, or government correspondence (issued within the last 3 months)</p>
            </div>
            <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">3. Proof of Payment Method</h3>
              <p className="text-sm">Screenshot or photo of credit/debit card or bank account statement</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Verification Process</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Upload required documents through your account settings</li>
            <li>Our team reviews your documents (usually within 24-48 hours)</li>
            <li>You&apos;ll receive a confirmation email once verified</li>
            <li>You can then make withdrawals without restrictions</li>
          </ol>
        </div>

        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-3">Document Guidelines</h3>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Documents must be clear and legible</li>
            <li>All four corners must be visible</li>
            <li>Documents must be in color (no black and white)</li>
            <li>Documents must be current and not expired</li>
            <li>File formats: JPG, PNG, or PDF</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  )
}
