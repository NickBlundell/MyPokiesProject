import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { HelpCircle } from 'lucide-react'

export default async function FAQPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const faqs = [
    {
      category: 'Account',
      questions: [
        { q: 'How do I create an account?', a: 'Click the "Sign Up" button in the top right corner and follow the registration process. You\'ll need to provide your email, create a password, and verify your email address.' },
        { q: 'I forgot my password. What do I do?', a: 'Click "Forgot Password" on the login page and enter your email. We\'ll send you a password reset link.' },
        { q: 'How do I verify my account?', a: 'Navigate to your account settings and upload the required documents (ID, proof of address). Verification typically takes 24-48 hours.' },
      ]
    },
    {
      category: 'Deposits & Withdrawals',
      questions: [
        { q: 'What payment methods do you accept?', a: 'We accept VISA, Mastercard, Bitcoin, Ethereum, Bank Transfer, and PayPal.' },
        { q: 'Is there a minimum deposit?', a: 'The minimum deposit is $10 for most payment methods.' },
        { q: 'How long do withdrawals take?', a: 'Withdrawal times vary by tier: Bronze (48-72h), Silver (24-48h), Gold (12-24h), Platinum (6-12h), Diamond (0-6h).' },
        { q: 'Are there withdrawal fees?', a: 'We don\'t charge withdrawal fees, but your payment provider may apply their own fees.' },
      ]
    },
    {
      category: 'Bonuses',
      questions: [
        { q: 'How do I claim the welcome bonus?', a: 'The welcome bonus is automatically applied to your first deposit. Make sure you opt-in during the deposit process.' },
        { q: 'What are wagering requirements?', a: 'Wagering requirements determine how many times you must bet your bonus before you can withdraw. Most bonuses have a 30x requirement.' },
        { q: 'Can I have multiple bonuses active?', a: 'No, only one bonus can be active at a time. Complete or forfeit your current bonus before claiming a new one.' },
      ]
    },
    {
      category: 'VIP Program',
      questions: [
        { q: 'How do I earn VIP points?', a: 'You earn 1 point for every $10 wagered on any game. Points are automatically added to your account.' },
        { q: 'Do VIP points expire?', a: 'No, VIP points never expire and your tier level never decreases.' },
        { q: 'How do I redeem my points?', a: 'Visit the VIP section in your account to redeem points for bonus credits. Redemption rates improve at higher tiers.' },
      ]
    },
    {
      category: 'Games',
      questions: [
        { q: 'Are the games fair?', a: 'Yes, all our games use certified Random Number Generators (RNG) and are regularly audited by independent testing agencies.' },
        { q: 'Can I play games for free?', a: 'Yes, most games have a demo mode available. Simply click on a game and select "Play for Fun".' },
        { q: 'What is RTP?', a: 'RTP (Return to Player) is the percentage of wagered money a game pays back over time. For example, a 96% RTP means the game returns $96 for every $100 wagered on average.' },
      ]
    }
  ]

  return (
    <PageLayout user={user} title="Frequently Asked Questions" icon={<HelpCircle className="w-8 h-8 text-blue-400" />}>
      <div className="space-y-8">
        {faqs.map((category) => (
          <div key={category.category}>
            <h2 className="text-2xl font-bold text-white mb-4">{category.category}</h2>
            <div className="space-y-4">
              {category.questions.map((faq, index) => (
                <div key={index} className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
                  <h3 className="text-white font-bold mb-2">{faq.q}</h3>
                  <p className="text-gray-400 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Still have questions? */}
        <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-2 border-blue-500/50 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Still have questions?</h3>
          <p className="text-gray-300 mb-6">Our support team is here to help 24/7</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold transition-all">
            Contact Support
          </button>
        </div>
      </div>
    </PageLayout>
  )
}
