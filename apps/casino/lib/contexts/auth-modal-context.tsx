'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface BonusInfo {
  type: string
  amount: number
  code?: string
  listName?: string
}

interface AuthModalContextType {
  isLoginOpen: boolean
  isSignUpOpen: boolean
  isForgotPasswordOpen: boolean
  isVerificationOpen: boolean
  verificationPhone: string | null
  verificationBonus: BonusInfo | null
  openLogin: () => void
  openSignUp: () => void
  openForgotPassword: () => void
  openVerification: (phone: string, bonus?: BonusInfo | null) => void
  closeLogin: () => void
  closeSignUp: () => void
  closeForgotPassword: () => void
  closeVerification: () => void
  switchToSignUp: () => void
  switchToLogin: () => void
  switchToForgotPassword: () => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [isVerificationOpen, setIsVerificationOpen] = useState(false)
  const [verificationPhone, setVerificationPhone] = useState<string | null>(null)
  const [verificationBonus, setVerificationBonus] = useState<BonusInfo | null>(null)

  const openLogin = () => setIsLoginOpen(true)
  const openSignUp = () => setIsSignUpOpen(true)
  const openForgotPassword = () => setIsForgotPasswordOpen(true)
  const openVerification = (phone: string, bonus?: BonusInfo | null) => {
    setVerificationPhone(phone)
    setVerificationBonus(bonus || null)
    setIsVerificationOpen(true)
  }

  const closeLogin = () => setIsLoginOpen(false)
  const closeSignUp = () => setIsSignUpOpen(false)
  const closeForgotPassword = () => setIsForgotPasswordOpen(false)
  const closeVerification = () => {
    setIsVerificationOpen(false)
    setVerificationPhone(null)
    setVerificationBonus(null)
  }

  const switchToSignUp = () => {
    setIsLoginOpen(false)
    setIsSignUpOpen(true)
  }

  const switchToLogin = () => {
    setIsSignUpOpen(false)
    setIsForgotPasswordOpen(false)
    setIsLoginOpen(true)
  }

  const switchToForgotPassword = () => {
    setIsLoginOpen(false)
    setIsForgotPasswordOpen(true)
  }

  return (
    <AuthModalContext.Provider
      value={{
        isLoginOpen,
        isSignUpOpen,
        isForgotPasswordOpen,
        isVerificationOpen,
        verificationPhone,
        verificationBonus,
        openLogin,
        openSignUp,
        openForgotPassword,
        openVerification,
        closeLogin,
        closeSignUp,
        closeForgotPassword,
        closeVerification,
        switchToSignUp,
        switchToLogin,
        switchToForgotPassword,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider')
  }
  return context
}
