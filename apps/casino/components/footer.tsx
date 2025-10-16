'use client'

import Link from 'next/link'
import { Facebook, Twitter, Instagram, Youtube, Mail, MessageCircle } from 'lucide-react'
import { memo } from 'react'

// PERFORMANCE FIX: Memoize Footer to prevent unnecessary re-renders
// Footer content is static and doesn't need to re-render on parent changes
export const Footer = memo(function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#0a1628] via-[#0d1a32] to-[#101f3c] border-t border-[#1a2439]/30">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8 md:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8 mb-8">
          {/* Casino Games */}
          <div className="col-span-1">
            <h3 className="text-white font-bold text-sm uppercase mb-3 md:mb-4">Casino Games</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li><Link href="/games/pokies" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Pokies</Link></li>
              <li><Link href="/games/live" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Live Casino</Link></li>
              <li><Link href="/games/jackpot" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Jackpot Games</Link></li>
              <li><Link href="/games/table" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Table Games</Link></li>
              <li><Link href="/games/new" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">New Games</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-1">
            <h3 className="text-white font-bold text-sm uppercase mb-3 md:mb-4">Support</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li><Link href="/help" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Contact Us</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">FAQ</Link></li>
              <li><Link href="/banking" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Banking</Link></li>
              <li><Link href="/responsible-gaming" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Responsible Gaming</Link></li>
            </ul>
          </div>

          {/* About */}
          <div className="col-span-1">
            <h3 className="text-white font-bold text-sm uppercase mb-3 md:mb-4">About</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li><Link href="/about" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">About Us</Link></li>
              <li><Link href="/promotions" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Promotions</Link></li>
              <li><Link href="/vip" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">VIP Club</Link></li>
              <li><Link href="/affiliates" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Affiliates</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-1">
            <h3 className="text-white font-bold text-sm uppercase mb-3 md:mb-4">Legal</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li><Link href="/terms" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">Cookie Policy</Link></li>
              <li><Link href="/kyc" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">KYC Policy</Link></li>
              <li><Link href="/aml" className="text-gray-400 hover:text-white text-[10px] md:text-xs font-bold uppercase transition-colors">AML Policy</Link></li>
            </ul>
          </div>

          {/* Follow Us / Contact - Full width on mobile */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-white font-bold text-sm uppercase mb-3 md:mb-4">Follow Us</h3>
            <div className="flex gap-3 mb-4">
              <Link href="#" className="bg-[#1a2024] hover:bg-[#2a3439] p-2 rounded-lg transition-colors">
                <Facebook className="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-white" />
              </Link>
              <Link href="#" className="bg-[#1a2024] hover:bg-[#2a3439] p-2 rounded-lg transition-colors">
                <Twitter className="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-white" />
              </Link>
              <Link href="#" className="bg-[#1a2024] hover:bg-[#2a3439] p-2 rounded-lg transition-colors">
                <Instagram className="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-white" />
              </Link>
              <Link href="#" className="bg-[#1a2024] hover:bg-[#2a3439] p-2 rounded-lg transition-colors">
                <Youtube className="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-white" />
              </Link>
            </div>
            <div className="space-y-2">
              <Link href="mailto:support@mypokies.com" className="flex items-center gap-2 text-gray-400 hover:text-white text-[10px] md:text-xs transition-colors">
                <Mail className="w-3 h-3 md:w-4 md:h-4" />
                <span>support@mypokies.com</span>
              </Link>
              <Link href="#" className="flex items-center gap-2 text-gray-400 hover:text-white text-[10px] md:text-xs transition-colors">
                <MessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                <span>Live Chat</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-[#1a2024] pt-6 md:pt-8 mb-6 md:mb-8">
          <h3 className="text-white font-bold text-sm uppercase mb-3 md:mb-4">Payment Methods</h3>
          <div className="flex flex-wrap gap-3 md:gap-4">
            <div className="bg-[#1a2024] px-3 py-2 md:px-4 md:py-2.5 rounded-lg">
              <span className="text-gray-400 text-[10px] md:text-xs">VISA</span>
            </div>
            <div className="bg-[#1a2024] px-3 py-2 md:px-4 md:py-2.5 rounded-lg">
              <span className="text-gray-400 text-[10px] md:text-xs">Mastercard</span>
            </div>
            <div className="bg-[#1a2024] px-3 py-2 md:px-4 md:py-2.5 rounded-lg">
              <span className="text-gray-400 text-[10px] md:text-xs">Bitcoin</span>
            </div>
            <div className="bg-[#1a2024] px-3 py-2 md:px-4 md:py-2.5 rounded-lg">
              <span className="text-gray-400 text-[10px] md:text-xs">Ethereum</span>
            </div>
            <div className="bg-[#1a2024] px-3 py-2 md:px-4 md:py-2.5 rounded-lg">
              <span className="text-gray-400 text-[10px] md:text-xs">Bank Transfer</span>
            </div>
            <div className="bg-[#1a2024] px-3 py-2 md:px-4 md:py-2.5 rounded-lg">
              <span className="text-gray-400 text-[10px] md:text-xs">PayPal</span>
            </div>
          </div>
        </div>

        {/* Responsible Gaming */}
        <div className="border-t border-[#1a2024] pt-6 md:pt-8 mb-6 md:mb-8">
          <div className="text-center md:text-left">
            <h3 className="text-white font-bold text-sm uppercase mb-2 md:mb-3">Play Responsibly</h3>
            <p className="text-gray-400 text-[10px] md:text-xs mb-3 md:mb-4">
              MyPokies is committed to responsible gaming. Must be 18+ to play. Gambling can be addictive, please play responsibly.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
              <Link href="/responsible-gaming" className="bg-[#1a2024] hover:bg-[#2a3439] px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-gray-400 hover:text-white text-[10px] md:text-xs transition-colors">
                18+
              </Link>
              <Link href="/self-exclusion" className="bg-[#1a2024] hover:bg-[#2a3439] px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-gray-400 hover:text-white text-[10px] md:text-xs transition-colors">
                Self Exclusion
              </Link>
              <Link href="/limits" className="bg-[#1a2024] hover:bg-[#2a3439] px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-gray-400 hover:text-white text-[10px] md:text-xs transition-colors">
                Set Limits
              </Link>
              <Link href="https://www.gamblinghelponline.org.au" target="_blank" className="bg-[#1a2024] hover:bg-[#2a3439] px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-gray-400 hover:text-white text-[10px] md:text-xs transition-colors">
                Get Help
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[#1a2024] pt-6 md:pt-8">
          <div className="text-center">
            <p className="text-gray-500 text-[10px] md:text-xs mb-2">
              © {new Date().getFullYear()} MyPokies. All rights reserved.
            </p>
            <p className="text-gray-500 text-[10px]">
              MyPokies is operated under license. Please gamble responsibly.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
})