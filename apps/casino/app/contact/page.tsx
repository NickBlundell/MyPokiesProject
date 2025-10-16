import { createClient } from '@/lib/supabase/server'
import PageLayout from '@/components/page-layout'
import { Mail, MessageCircle, MapPin, Clock } from 'lucide-react'

export default async function ContactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageLayout user={user} title="Contact Us" icon={<Mail className="w-8 h-8 text-blue-400" />}>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Send us a Message</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-white text-sm font-semibold mb-2">Name</label>
              <input
                type="text"
                className="w-full bg-[#0a0f14] border border-[#2a3439] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                className="w-full bg-[#0a0f14] border border-[#2a3439] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-semibold mb-2">Subject</label>
              <input
                type="text"
                className="w-full bg-[#0a0f14] border border-[#2a3439] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="How can we help?"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-semibold mb-2">Message</label>
              <textarea
                rows={5}
                className="w-full bg-[#0a0f14] border border-[#2a3439] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Tell us more..."
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
            >
              Send Message
            </button>
          </form>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <MessageCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-bold mb-2">Live Chat</h3>
                <p className="text-gray-400 text-sm mb-3">Get instant help from our support team 24/7</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                  Start Chat
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-bold mb-2">Email Support</h3>
                <p className="text-gray-400 text-sm mb-1">support@mypokies.com</p>
                <p className="text-gray-500 text-xs">Response within 24 hours</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-bold mb-2">Support Hours</h3>
                <p className="text-gray-400 text-sm">Live Chat: 24/7</p>
                <p className="text-gray-400 text-sm">Email: 24/7 (replies within 24 hours)</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a2024] border border-[#2a3439] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-bold mb-2">Office Location</h3>
                <p className="text-gray-400 text-sm">
                  MyPokies Australia Pty Ltd<br />
                  Level 5, 123 Gaming Street<br />
                  Sydney, NSW 2000<br />
                  Australia
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
