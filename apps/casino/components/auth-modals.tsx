'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label
} from '@mypokies/ui'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

interface BonusInfo {
  type: string
  amount: number
  code?: string
  listName?: string
}

interface AuthModalsProps {
  isLoginOpen: boolean
  isSignUpOpen: boolean
  isForgotPasswordOpen: boolean
  isVerificationOpen: boolean
  verificationPhone: string | null
  verificationBonus: BonusInfo | null
  onLoginClose: () => void
  onSignUpClose: () => void
  onForgotPasswordClose: () => void
  onVerificationClose: () => void
  onOpenVerification: (phone: string, bonus?: BonusInfo | null) => void
  onSwitchToSignUp: () => void
  onSwitchToLogin: () => void
  onSwitchToForgotPassword: () => void
}

export function AuthModals({
  isLoginOpen,
  isSignUpOpen,
  isForgotPasswordOpen,
  isVerificationOpen,
  verificationPhone,
  verificationBonus,
  onLoginClose,
  onSignUpClose,
  onForgotPasswordClose,
  onVerificationClose,
  onOpenVerification,
  onSwitchToSignUp,
  onSwitchToLogin,
  onSwitchToForgotPassword,
}: AuthModalsProps) {
  return (
    <>
      <LoginModal
        isOpen={isLoginOpen}
        onClose={onLoginClose}
        onSwitchToSignUp={onSwitchToSignUp}
        onSwitchToForgotPassword={onSwitchToForgotPassword}
      />
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={onSignUpClose}
        onSwitchToLogin={onSwitchToLogin}
        onOpenVerification={onOpenVerification}
      />
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={onForgotPasswordClose}
        onSwitchToLogin={onSwitchToLogin}
      />
      <VerificationModal
        isOpen={isVerificationOpen}
        onClose={onVerificationClose}
        phone={verificationPhone}
        bonus={verificationBonus}
      />
    </>
  )
}

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToSignUp: () => void
  onSwitchToForgotPassword: () => void
}

function LoginModal({ isOpen, onClose, onSwitchToSignUp, onSwitchToForgotPassword }: LoginModalProps) {
  const router = useRouter()
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Normalize phone number to international format
  const normalizePhoneNumber = (phoneInput: string): string => {
    // Remove all whitespace and common separators
    let cleaned = phoneInput.replace(/[\s\-()]/g, '')

    // If starts with 04, convert to +614
    if (cleaned.startsWith('04')) {
      cleaned = '+61' + cleaned.substring(1)
    }
    // If starts with 61 but no +, add it
    else if (cleaned.startsWith('61') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned
    }
    // If doesn't start with + or 0, assume it needs +
    else if (!cleaned.startsWith('+') && !cleaned.startsWith('0')) {
      cleaned = '+' + cleaned
    }

    return cleaned
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // Detect if input is phone number (starts with +, 0, or all digits)
      const isPhone = emailOrPhone.startsWith('+') || emailOrPhone.startsWith('0') || /^\d+$/.test(emailOrPhone)

      // Normalize phone if detected
      const normalizedInput = isPhone ? normalizePhoneNumber(emailOrPhone) : emailOrPhone
      console.log('[Login] Original:', emailOrPhone, '-> Normalized:', normalizedInput, 'isPhone:', isPhone)

      const { error } = await supabase.auth.signInWithPassword({
        ...(isPhone ? { phone: normalizedInput } : { email: normalizedInput }),
        password,
      })
      if (error) throw error

      // Close modal before redirect
      onClose()

      // PERFORMANCE FIX: Use soft navigation instead of hard redirect
      // AuthProvider will pick up the session change via onAuthStateChange
      router.push('/')
      router.refresh() // Refresh server components
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchToSignUp = () => {
    onClose()
    onSwitchToSignUp()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] !bg-[#1a2024] border-slate-600 p-6 sm:p-16 relative overflow-y-auto max-h-[95vh]">
        {/* Sparkle Stars Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[15%] text-blue-400 text-xl opacity-60 animate-twinkle">✦</div>
          <div className="absolute top-[20%] right-[20%] text-blue-300 text-sm opacity-50 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[35%] left-[8%] text-blue-400 text-xs opacity-40 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[50%] right-[12%] text-blue-300 text-lg opacity-60 animate-twinkle">✦</div>
          <div className="absolute top-[65%] left-[25%] text-blue-400 text-sm opacity-50 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[75%] right-[18%] text-blue-300 text-xs opacity-40 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[15%] right-[35%] text-blue-400 text-xs opacity-45 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[45%] left-[18%] text-blue-300 text-sm opacity-55 animate-twinkle-delay-2">✦</div>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-4 pt-2 sm:pt-6 relative z-[10000]">
          <Image
            src="/logo.webp"
            alt="MyPokies"
            width={150}
            height={64}
            className="h-12 sm:h-16 w-auto object-contain"
            priority
          />
        </div>

        <DialogHeader className="relative z-[10000]">
          <DialogTitle className="text-2xl text-white text-center">Login</DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            Enter your phone number to login
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4 mt-4 relative z-[10000]">
          <div className="space-y-2">
            <Label htmlFor="login-phone" className="text-gray-300">Phone Number</Label>
            <Input
              id="login-phone"
              type="text"
              placeholder="0412 345 678"
              required
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold placeholder-gray-500 placeholder:text-xs py-2 px-3 h-12"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-gray-300">Password</Label>
              <button
                type="button"
                className="text-sm text-yellow-400 hover:text-yellow-300 underline-offset-4 hover:underline"
                onClick={() => {
                  onClose()
                  onSwitchToForgotPassword()
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold py-2 px-3 h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
          <div className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={handleSwitchToSignUp}
              className="text-yellow-400 hover:text-yellow-300 underline underline-offset-4"
            >
              Sign up
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface SignUpModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
  onOpenVerification: (phone: string, bonus?: BonusInfo | null) => void
}

function SignUpModal({ isOpen, onClose, onSwitchToLogin, onOpenVerification }: SignUpModalProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [isOver18, setIsOver18] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when modal closes
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setRepeatPassword('')
      setShowPassword(false)
      setShowRepeatPassword(false)
      setIsOver18(false)
      setMarketingConsent(false)
      setTermsAccepted(false)
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  // Normalize phone number to international format
  const normalizePhoneNumber = (phoneInput: string): string => {
    // Remove all whitespace and common separators
    let cleaned = phoneInput.replace(/[\s\-()]/g, '')

    // If starts with 04, convert to +614
    if (cleaned.startsWith('04')) {
      cleaned = '+61' + cleaned.substring(1)
    }
    // If starts with 61 but no +, add it
    else if (cleaned.startsWith('61') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned
    }
    // If doesn't start with + or 0, assume it needs +
    else if (!cleaned.startsWith('+') && !cleaned.startsWith('0')) {
      cleaned = '+' + cleaned
    }

    return cleaned
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Validate all required fields
    if (!firstName.trim()) {
      setError('First name is required')
      setIsLoading(false)
      return
    }

    if (!lastName.trim()) {
      setError('Last name is required')
      setIsLoading(false)
      return
    }

    if (!email.trim()) {
      setError('Email is required')
      setIsLoading(false)
      return
    }

    if (!phone.trim()) {
      setError('Phone number is required')
      setIsLoading(false)
      return
    }

    if (!password) {
      setError('Password is required')
      setIsLoading(false)
      return
    }

    if (!repeatPassword) {
      setError('Please confirm your password')
      setIsLoading(false)
      return
    }

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!isOver18) {
      setError('You must be 18 or over to create an account')
      setIsLoading(false)
      return
    }

    if (!termsAccepted) {
      setError('You must accept the terms and conditions')
      setIsLoading(false)
      return
    }

    try {
      // Normalize the phone number to international format
      const normalizedPhone = normalizePhoneNumber(phone)
      console.log('[Signup] Original phone:', phone, '-> Normalized:', normalizedPhone)

      // DUPLICATE CHECK: Verify phone number isn't already registered (saves SMS credits)
      console.log('[Signup] Checking for duplicate phone number...')
      const { data: isDuplicate, error: checkError } = await supabase.rpc(
        'is_phone_number_registered',
        { phone_number: normalizedPhone }
      )

      if (checkError) {
        console.error('[Signup] Duplicate check error:', checkError)
        // Continue even if check fails - don't block signup
      } else if (isDuplicate) {
        console.warn('[Signup] ❌ Phone number already registered')
        throw new Error('This phone number is already registered. Please login instead or use a different number.')
      }

      console.log('[Signup] ✅ Phone number available')

      // Create the account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: normalizedPhone,
            marketing_consent: marketingConsent,
          },
        },
      })

      if (signUpError) {
        // Check if it's an email duplicate error
        if (signUpError.message.includes('User already registered') || signUpError.message.includes('already_exists')) {
          throw new Error('This email address is already registered. Please login or use a different email.')
        }
        throw signUpError
      }

      console.log('[Signup] ✅ Account created successfully')

      // Check for custom bonus eligibility from lead lists
      console.log('[Signup] Checking bonus eligibility for phone:', normalizedPhone)
      let bonusInfo = null
      try {
        const bonusResponse = await fetch(`/api/auth/check-bonus-eligibility?phone=${encodeURIComponent(normalizedPhone)}`)
        if (bonusResponse.ok) {
          const bonusData = await bonusResponse.json()
          if (bonusData.eligible && bonusData.bonus) {
            bonusInfo = bonusData.bonus
            console.log('[Signup] ✅ Custom bonus found:', bonusInfo)
          } else {
            console.log('[Signup] No custom bonus found')
          }
        }
      } catch (bonusError) {
        console.error('[Signup] Failed to check bonus eligibility:', bonusError)
        // Continue with signup even if bonus check fails
      }

      // Send OTP to phone for verification
      console.log('[Signup] Sending OTP to phone:', normalizedPhone)
      const SEND_OTP_TIMEOUT = 30000 // 30 seconds

      const sendOtpPromise = supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out. Please check your connection and try again.'))
        }, SEND_OTP_TIMEOUT)
      })

      const { error: otpError } = await Promise.race([
        sendOtpPromise,
        timeoutPromise
      ]) as { error: Error | null; data?: unknown }

      if (otpError) {
        console.error('[Signup] Send OTP error:', otpError)
        // Handle specific Twilio/Supabase errors
        if (otpError.message.includes('20003')) {
          throw new Error('SMS service authentication failed. Please contact support.')
        } else if (otpError.message.includes('21212')) {
          throw new Error('Invalid phone number configuration. Please contact support.')
        } else if (otpError.message.includes('Invalid phone number')) {
          throw new Error('Please enter a valid phone number in international format (e.g., +61400000000)')
        } else {
          throw otpError
        }
      }

      console.log('[Signup] ✅ OTP sent successfully')

      // Track signup metadata (IP address, country, user agent)
      try {
        const trackResponse = await fetch('/api/auth/track-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!trackResponse.ok) {
          console.error('[Signup] Failed to track metadata, but continuing signup')
        } else {
          const trackData = await trackResponse.json()
          console.log('[Signup] Metadata tracked:', trackData.metadata)
        }
      } catch (trackError) {
        // Don't fail the signup if metadata tracking fails
        console.error('[Signup] Error tracking metadata:', trackError)
      }

      // Close signup modal and open verification modal
      onClose()
      onOpenVerification(normalizedPhone, bonusInfo)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchToLogin = () => {
    onClose()
    onSwitchToLogin()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] !bg-[#1a2024] border-slate-600 px-6 py-4 sm:py-6 relative overflow-y-auto max-h-[95vh]">
        {/* Sparkle Stars Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[15%] text-blue-400 text-xl opacity-60 animate-twinkle">✦</div>
          <div className="absolute top-[20%] right-[20%] text-blue-300 text-sm opacity-50 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[35%] left-[8%] text-blue-400 text-xs opacity-40 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[50%] right-[12%] text-blue-300 text-lg opacity-60 animate-twinkle">✦</div>
          <div className="absolute top-[65%] left-[25%] text-blue-400 text-sm opacity-50 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[75%] right-[18%] text-blue-300 text-xs opacity-40 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[15%] right-[35%] text-blue-400 text-xs opacity-45 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[45%] left-[18%] text-blue-300 text-sm opacity-55 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[85%] right-[25%] text-blue-400 text-xs opacity-50 animate-twinkle">✦</div>
          <div className="absolute top-[30%] right-[8%] text-blue-300 text-sm opacity-45 animate-twinkle-delay-1">✦</div>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-2 sm:mb-4 pt-1 sm:pt-6 relative z-[10000]">
          <Image
            src="/logo.webp"
            alt="MyPokies"
            width={150}
            height={64}
            className="h-10 sm:h-16 w-auto object-contain"
            priority
          />
        </div>

        <DialogHeader className="relative z-[10000] mb-2">
          <DialogTitle className="text-xl sm:text-2xl text-white text-center">
            Sign up
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 text-center">
            Create your account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4 mt-2 sm:mt-4 relative z-[10000]">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-first-name" className="text-gray-300">First Name</Label>
              <Input
                id="signup-first-name"
                type="text"
                placeholder="John"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold placeholder-gray-500 placeholder:text-xs py-2 px-3 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-last-name" className="text-gray-300">Last Name</Label>
              <Input
                id="signup-last-name"
                type="text"
                placeholder="Doe"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold placeholder-gray-500 placeholder:text-xs py-2 px-3 h-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold placeholder-gray-500 placeholder:text-xs py-2 px-3 h-12"
            />
          </div>
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="signup-phone" className="text-gray-300">Mobile Number</Label>
            <Input
              id="signup-phone"
              type="tel"
              placeholder="0412 345 678"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold placeholder-gray-500 placeholder:text-xs py-2 px-3 h-12"
            />
          </div>

          {/* Error message */}
          {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold py-2 px-3 h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-repeat-password" className="text-gray-300">Repeat Password</Label>
            <div className="relative">
              <Input
                id="signup-repeat-password"
                type={showRepeatPassword ? 'text' : 'password'}
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold py-2 px-3 h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showRepeatPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

            {/* Checkboxes */}
            <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="age-confirm"
                  name="age-confirm"
                  checked={isOver18}
                  onChange={(e) => setIsOver18(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#2a3439] bg-[#0f1419] text-blue-400 focus:ring-blue-400 focus:ring-offset-0"
                  required
                />
                <label htmlFor="age-confirm" className="text-sm text-gray-300 cursor-pointer">
                  I confirm that I am 18 years or older
                </label>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms-accept"
                  name="terms-accept"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#2a3439] bg-[#0f1419] text-blue-400 focus:ring-blue-400 focus:ring-offset-0"
                  required
                />
                <label htmlFor="terms-accept" className="text-sm text-gray-300 cursor-pointer">
                  I accept the{' '}
                  <a href="/terms" target="_blank" className="text-yellow-400 hover:text-yellow-300 underline">
                    Terms and Conditions
                  </a>
                </label>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="marketing-consent"
                  name="marketing-consent"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#2a3439] bg-[#0f1419] text-blue-400 focus:ring-blue-400 focus:ring-offset-0"
                />
                <label htmlFor="marketing-consent" className="text-sm text-gray-300 cursor-pointer">
                  I agree to receive marketing communications and promotional offers
                </label>
              </div>
            </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              isLoading ||
              !firstName.trim() ||
              !lastName.trim() ||
              !email.trim() ||
              !phone.trim() ||
              !password ||
              !repeatPassword ||
              !isOver18 ||
              !termsAccepted
            }
          >
            {isLoading ? 'Sending code...' : 'Sign up'}
          </Button>
          <div className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={handleSwitchToLogin}
              className="text-yellow-400 hover:text-yellow-300 underline underline-offset-4"
            >
              Login
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

function ForgotPasswordModal({ isOpen, onClose, onSwitchToLogin }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchToLogin = () => {
    onClose()
    setEmail('')
    setError(null)
    setSuccess(false)
    onSwitchToLogin()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] !bg-[#1a2024] border-slate-600 p-6 sm:p-16 relative overflow-y-auto max-h-[95vh]">
        {/* Sparkle Stars Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[15%] text-blue-400 text-xl opacity-60 animate-twinkle">✦</div>
          <div className="absolute top-[20%] right-[20%] text-blue-300 text-sm opacity-50 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[35%] left-[8%] text-blue-400 text-xs opacity-40 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[50%] right-[12%] text-blue-300 text-lg opacity-60 animate-twinkle">✦</div>
          <div className="absolute top-[65%] left-[25%] text-blue-400 text-sm opacity-50 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[75%] right-[18%] text-blue-300 text-xs opacity-40 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[15%] right-[35%] text-blue-400 text-xs opacity-45 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[45%] left-[18%] text-blue-300 text-sm opacity-55 animate-twinkle-delay-2">✦</div>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-4 pt-2 sm:pt-6 relative z-[10000]">
          <Image
            src="/logo.webp"
            alt="MyPokies"
            width={150}
            height={64}
            className="h-12 sm:h-16 w-auto object-contain"
            priority
          />
        </div>

        <DialogHeader className="relative z-[10000]">
          <DialogTitle className="text-2xl text-white text-center">Reset Password</DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            {success ? 'Check your email for the reset link' : 'Enter your email to reset your password'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="mt-4 relative z-[10000]">
            <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-500 font-medium">Password reset email sent!</span>
            </div>
            <p className="text-sm text-gray-400 text-center mb-4">
              We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>. Please check your inbox and follow the instructions.
            </p>
            <Button
              onClick={handleSwitchToLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4 relative z-[10000]">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-gray-300">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold placeholder-gray-500 placeholder:text-xs py-2 px-3 h-12"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <div className="text-center text-sm text-gray-400">
              Remember your password?{' '}
              <button
                type="button"
                onClick={handleSwitchToLogin}
                className="text-yellow-400 hover:text-yellow-300 underline underline-offset-4"
              >
                Login
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface VerificationModalProps {
  isOpen: boolean
  onClose: () => void
  phone: string | null
  bonus: BonusInfo | null
}

function VerificationModal({ isOpen, onClose, phone, bonus }: VerificationModalProps) {
  const router = useRouter()
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [otpSentTime, setOtpSentTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Set initial timestamp when modal opens
  useEffect(() => {
    if (isOpen && !otpSentTime) {
      setOtpSentTime(Date.now())
    }
  }, [isOpen, otpSentTime])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVerificationCode('')
      setError(null)
      setIsVerifying(false)
      setIsResending(false)
      setOtpSentTime(null)
      setTimeRemaining(null)
    }
  }, [isOpen])

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (!otpSentTime) {
      setTimeRemaining(null)
      return
    }

    const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

    const updateTimer = () => {
      const elapsed = Date.now() - otpSentTime
      const remaining = OTP_EXPIRY_MS - elapsed

      if (remaining <= 0) {
        setTimeRemaining(0)
        setError('Verification code has expired. Please request a new code.')
      } else {
        setTimeRemaining(Math.ceil(remaining / 1000)) // Convert to seconds
      }
    }

    updateTimer() // Initial update
    const interval = setInterval(updateTimer, 1000) // Update every second

    return () => clearInterval(interval)
  }, [otpSentTime])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone) {
      setError('Phone number not found. Please try signing up again.')
      return
    }

    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }

    // Validate OTP timestamp - codes expire after 10 minutes
    if (otpSentTime) {
      const OTP_EXPIRY_MS = 10 * 60 * 1000
      const elapsedTime = Date.now() - otpSentTime

      if (elapsedTime > OTP_EXPIRY_MS) {
        setError('Verification code has expired. Please request a new code.')
        return
      }
    }

    const supabase = createClient()
    setIsVerifying(true)
    setError(null)

    console.log('[Verification] Starting verification for phone:', phone)

    try {
      const VERIFICATION_TIMEOUT = 30000 // 30 seconds

      const verificationPromise = supabase.auth.verifyOtp({
        phone,
        token: verificationCode,
        type: 'sms',
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Verification request timed out. Please try again.'))
        }, VERIFICATION_TIMEOUT)
      })

      const { error, data } = await Promise.race([
        verificationPromise,
        timeoutPromise
      ]) as { error: Error | null; data?: unknown }

      if (error) {
        console.error('[Verification] Error:', error)

        if (error.message.includes('Invalid token') || error.message.includes('Token has expired')) {
          throw new Error('Invalid or expired code. Please request a new code.')
        } else if (error.message.includes('Phone not found')) {
          throw new Error('Phone number not found. Please start the verification process again.')
        } else {
          throw error
        }
      }

      console.log('[Verification] ✅ Success! Phone verified')

      // Auto-claim the no-deposit bonus
      console.log('[Verification] Attempting to claim bonus...')
      try {
        const bonusResponse = await fetch('/api/player/claim-phone-bonus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (bonusResponse.ok) {
          const bonusData = await bonusResponse.json()
          console.log('[Verification] ✅ Bonus claimed successfully:', bonusData)
        } else {
          const errorData = await bonusResponse.json()
          console.error('[Verification] Failed to claim bonus:', errorData)
          // Don't block the user flow if bonus claiming fails
        }
      } catch (bonusError) {
        console.error('[Verification] Error claiming bonus:', bonusError)
        // Don't block the user flow if bonus claiming fails
      }

      // Close modal and redirect to home
      onClose()
      router.push('/')
      router.refresh() // Refresh server components
    } catch (error: unknown) {
      console.error('[Verification] ❌ Failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify code. Please try again.'
      setError(errorMessage)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    if (!phone) {
      setError('Phone number not found. Please try signing up again.')
      return
    }

    const supabase = createClient()
    setIsResending(true)
    setError(null)

    console.log('[Verification] Resending OTP to phone:', phone)

    try {
      const SEND_OTP_TIMEOUT = 30000 // 30 seconds

      const sendOtpPromise = supabase.auth.signInWithOtp({
        phone,
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out. Please check your connection and try again.'))
        }, SEND_OTP_TIMEOUT)
      })

      const { error } = await Promise.race([
        sendOtpPromise,
        timeoutPromise
      ]) as { error: Error | null; data?: unknown }

      if (error) {
        console.error('[Verification] Send OTP error:', error)
        throw error
      }

      console.log('[Verification] ✅ OTP resent successfully')
      setOtpSentTime(Date.now()) // Reset timer
      setVerificationCode('') // Clear the input
    } catch (error: unknown) {
      console.error('[Verification] ❌ Failed to resend OTP:', error)
      setError(error instanceof Error ? error.message : 'Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] !bg-[#1a2024] border-slate-600 p-6 sm:p-16 relative overflow-y-auto max-h-[95vh]">
        {/* Sparkle Stars Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[15%] text-blue-400 text-xl opacity-60 animate-twinkle">✦</div>
          <div className="absolute top-[20%] right-[20%] text-blue-300 text-sm opacity-50 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[35%] left-[8%] text-blue-400 text-xs opacity-40 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[50%] right-[12%] text-blue-300 text-lg opacity-60 animate-twinkle">✦</div>
          <div className="absolute top-[65%] left-[25%] text-blue-400 text-sm opacity-50 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[75%] right-[18%] text-blue-300 text-xs opacity-40 animate-twinkle-delay-2">✦</div>
          <div className="absolute top-[15%] right-[35%] text-blue-400 text-xs opacity-45 animate-twinkle-delay-1">✦</div>
          <div className="absolute top-[45%] left-[18%] text-blue-300 text-sm opacity-55 animate-twinkle-delay-2">✦</div>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-4 pt-2 sm:pt-6 relative z-10">
          <Image
            src="/logo.webp"
            alt="MyPokies"
            width={150}
            height={64}
            className="h-12 sm:h-16 w-auto object-contain"
            priority
          />
        </div>

        <DialogHeader className="relative z-10">
          <DialogTitle className="text-2xl text-white text-center">Verify Your Phone</DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            We&apos;ve sent a 6-digit code to <span className="text-white font-semibold">{phone}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Bonus promotional message */}
        {bonus && bonus.amount && (
          <div className="relative z-10 mt-4 p-4 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50">
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-1">Verify your phone to claim</p>
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                ${bonus.amount} No Deposit Bonus!
              </p>
              {bonus.listName && (
                <p className="text-xs text-gray-400 mt-1">Special offer for {bonus.listName}</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleVerifyCode} className="space-y-4 mt-4 relative z-10">
          <div className="space-y-2">
            <Label htmlFor="verification-code" className="text-gray-300">Verification Code</Label>
            <Input
              id="verification-code"
              type="text"
              placeholder="000000"
              required
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold py-2 px-3 h-16 text-center text-3xl tracking-[0.5em] placeholder:tracking-normal placeholder:text-gray-500"
              autoFocus
            />
            {timeRemaining !== null && timeRemaining > 0 && (
              <p className="text-xs text-center font-medium" style={{
                color: timeRemaining < 60 ? '#ef4444' : '#fbbf24'
              }}>
                Code expires in {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all"
            disabled={isVerifying || verificationCode.length !== 6}
          >
            {isVerifying ? 'Verifying...' : 'Verify & Continue'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
              className="text-sm text-yellow-400 hover:text-yellow-300 underline underline-offset-4 disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
