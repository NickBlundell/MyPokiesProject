'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

interface AuthModalsProps {
  isLoginOpen: boolean
  isSignUpOpen: boolean
  isForgotPasswordOpen: boolean
  onLoginClose: () => void
  onSignUpClose: () => void
  onForgotPasswordClose: () => void
  onSwitchToSignUp: () => void
  onSwitchToLogin: () => void
  onSwitchToForgotPassword: () => void
}

export function AuthModals({
  isLoginOpen,
  isSignUpOpen,
  isForgotPasswordOpen,
  onLoginClose,
  onSignUpClose,
  onForgotPasswordClose,
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
      />
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={onForgotPasswordClose}
        onSwitchToLogin={onSwitchToLogin}
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // Detect if input is phone number (starts with + or all digits)
      const isPhone = emailOrPhone.startsWith('+') || /^\d+$/.test(emailOrPhone)

      const { error } = await supabase.auth.signInWithPassword({
        ...(isPhone ? { phone: emailOrPhone } : { email: emailOrPhone }),
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
      <DialogContent className="sm:max-w-[425px] !bg-[#1a2024] border-slate-600 p-6 sm:p-16 relative overflow-hidden">
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
          <img
            src="/logo.webp"
            alt="MyPokies"
            className="h-12 sm:h-16 w-auto object-contain"
          />
        </div>

        <DialogHeader className="relative z-10">
          <DialogTitle className="text-2xl text-white text-center">Login</DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            Enter your phone number to login
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4 mt-4 relative z-10">
          <div className="space-y-2">
            <Label htmlFor="login-phone" className="text-gray-300">Phone Number</Label>
            <Input
              id="login-phone"
              type="text"
              placeholder="+61 400 000 000"
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
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all hover:shadow-[0_0_10px_rgba(255,255,255,0.4)]"
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
}

function SignUpModal({ isOpen, onClose, onSwitchToLogin }: SignUpModalProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [mobileOtp, setMobileOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpSentTime, setOtpSentTime] = useState<number | null>(null)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isOver18, setIsOver18] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

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
      setMobileOtp('')
      setOtpSent(false)
      setOtpSentTime(null)
      setPhoneVerified(false)
      setIsVerifying(false)
      setIsOver18(false)
      setMarketingConsent(false)
      setTermsAccepted(false)
      setError(null)
      setIsLoading(false)
      setIsSendingCode(false)
      setTimeRemaining(null)
    }
  }, [isOpen])

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (!otpSentTime || phoneVerified) {
      setTimeRemaining(null)
      return
    }

    const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

    const updateTimer = () => {
      const elapsed = Date.now() - otpSentTime
      const remaining = OTP_EXPIRY_MS - elapsed

      if (remaining <= 0) {
        setTimeRemaining(0)
        setOtpSent(false)
        setOtpSentTime(null)
        setMobileOtp('')
        setError('Verification code has expired. Please request a new code.')
      } else {
        setTimeRemaining(Math.ceil(remaining / 1000)) // Convert to seconds
      }
    }

    updateTimer() // Initial update
    const interval = setInterval(updateTimer, 1000) // Update every second

    return () => clearInterval(interval)
  }, [otpSentTime, phoneVerified])

  const handleSendCode = async () => {
    if (!phone) {
      setError('Please enter your phone number first')
      return
    }

    const supabase = createClient()
    setIsSendingCode(true)
    setError(null)

    try {
      // Send SMS OTP
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      })

      if (error) throw error

      setOtpSent(true)
      // SECURITY FIX: Record timestamp when OTP was sent for expiry validation
      setOtpSentTime(Date.now())
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (mobileOtp.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }

    // SECURITY FIX: Validate OTP timestamp - codes expire after 10 minutes
    if (otpSentTime) {
      const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes in milliseconds
      const elapsedTime = Date.now() - otpSentTime

      if (elapsedTime > OTP_EXPIRY_MS) {
        setError('Verification code has expired. Please request a new code.')
        setOtpSent(false)
        setOtpSentTime(null)
        setMobileOtp('')
        return
      }
    }

    const supabase = createClient()
    setIsVerifying(true)
    setError(null)

    try {
      // Verify the phone OTP
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: mobileOtp,
        type: 'sms',
      })

      if (error) throw error

      setPhoneVerified(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to verify code')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!phoneVerified) {
      setError('Please verify your phone number first')
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
      // Create the account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            marketing_consent: marketingConsent,
          },
        },
      })

      if (signUpError) throw signUpError

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

  const handleSwitchToLogin = () => {
    onClose()
    onSwitchToLogin()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] !bg-[#1a2024] border-slate-600 px-6 py-4 sm:py-6 relative overflow-hidden max-h-[95vh]">
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
        <div className="flex justify-center mb-2 sm:mb-4 pt-1 sm:pt-6 relative z-10">
          <img
            src="/logo.webp"
            alt="MyPokies"
            className="h-10 sm:h-16 w-auto object-contain"
          />
        </div>

        <DialogHeader className="relative z-10 mb-2">
          <DialogTitle className="text-xl sm:text-2xl text-white text-center">
            Sign up
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 text-center">
            Create your account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4 mt-2 sm:mt-4 relative z-10">
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
          {/* Phone Number Row */}
          <div className="space-y-2">
            <Label htmlFor="signup-phone" className="text-gray-300">Mobile Number</Label>
            <div className="flex gap-2">
              <Input
                id="signup-phone"
                type="tel"
                placeholder="+61 400 000 000"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={phoneVerified}
                className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold placeholder-gray-500 placeholder:text-xs py-5 px-6 h-12 flex-1"
              />
              <Button
                type="button"
                onClick={handleSendCode}
                disabled={!phone || otpSent || isSendingCode || phoneVerified}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-4 h-12 whitespace-nowrap transition-all hover:shadow-[0_0_10px_rgba(234,179,8,0.4)]"
              >
                {isSendingCode ? 'Sending...' : otpSent ? 'Code Sent' : 'Send Code'}
              </Button>
            </div>
          </div>

          {/* Verification Code Row - Always visible */}
          {!phoneVerified && (
            <div className="space-y-2">
              <Label htmlFor="signup-otp" className="text-gray-300">Verification Code</Label>
              <div className="flex gap-2">
                <Input
                  id="signup-otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  required
                  maxLength={6}
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                  className="bg-[#0f1419] border-2 border-[#2a3439] text-white font-semibold placeholder-gray-500 placeholder:text-xs py-2 px-3 h-12 text-center text-2xl tracking-widest flex-1"
                  disabled={!otpSent}
                />
                <Button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={!otpSent || mobileOtp.length !== 6 || isVerifying}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 h-12 whitespace-nowrap transition-all hover:shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
              {otpSent && timeRemaining !== null && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 text-center">
                    Check your phone ({phone}) for the verification code
                  </p>
                  <p className="text-xs text-center font-medium" style={{
                    color: timeRemaining < 60 ? '#ef4444' : '#fbbf24'
                  }}>
                    Code expires in {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success indicator - shown after verification */}
          {phoneVerified && (
            <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-500 font-medium">Phone number verified successfully!</span>
            </div>
          )}

          {/* Error message - show immediately after phone verification section */}
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
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all hover:shadow-[0_0_10px_rgba(234,179,8,0.4)]"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
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
      <DialogContent className="sm:max-w-[425px] !bg-[#1a2024] border-slate-600 p-6 sm:p-16 relative overflow-hidden">
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
          <img
            src="/logo.webp"
            alt="MyPokies"
            className="h-12 sm:h-16 w-auto object-contain"
          />
        </div>

        <DialogHeader className="relative z-10">
          <DialogTitle className="text-2xl text-white text-center">Reset Password</DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            {success ? 'Check your email for the reset link' : 'Enter your email to reset your password'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="mt-4 relative z-10">
            <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-500 font-medium">Password reset email sent!</span>
            </div>
            <p className="text-sm text-gray-400 text-center mb-4">
              We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>. Please check your inbox and follow the instructions.
            </p>
            <Button
              onClick={handleSwitchToLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all hover:shadow-[0_0_10px_rgba(234,179,8,0.4)]"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4 relative z-10">
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
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 transition-all hover:shadow-[0_0_10px_rgba(234,179,8,0.4)]"
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
