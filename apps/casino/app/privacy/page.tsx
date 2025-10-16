import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { Shield } from 'lucide-react'

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Privacy Policy" icon={<Shield className="w-8 h-8 text-green-400" />}>
      <div className="space-y-6 text-gray-300">
        <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

        <p>
          At MyPokies, we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, and safeguard your data.
        </p>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Information We Collect</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Personal identification information (name, email, date of birth, address)</li>
            <li>Financial information for deposits and withdrawals</li>
            <li>Gaming activity and transaction history</li>
            <li>Technical data (IP address, browser type, device information)</li>
            <li>Cookies and usage data</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>To provide and maintain our services</li>
            <li>To process transactions and manage your account</li>
            <li>To verify your identity and prevent fraud</li>
            <li>To send important updates and promotional communications</li>
            <li>To improve our services and user experience</li>
            <li>To comply with legal and regulatory requirements</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information. All sensitive data is encrypted using SSL technology. However, no method of transmission over the internet is 100% secure.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Your Rights</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Access to your personal data</li>
            <li>Correction of inaccurate data</li>
            <li>Deletion of your data (subject to legal requirements)</li>
            <li>Opt-out of marketing communications</li>
            <li>Data portability</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Third-Party Services</h2>
          <p>
            We may share your information with trusted third-party service providers who assist us in operating our platform, processing payments, and analyzing data. These parties are obligated to keep your information confidential.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-3">Contact Us</h2>
          <p>
            For privacy-related inquiries, please contact us at privacy@mypokies.com
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
