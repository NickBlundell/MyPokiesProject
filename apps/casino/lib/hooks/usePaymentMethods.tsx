import { useState } from 'react'
import type { JSX } from 'react'
import { CreditCard, Bitcoin, DollarSign } from 'lucide-react'

export type PaymentMethodIcon = 'dollar' | 'card' | 'usdt' | 'btc' | 'eth'

export interface PaymentMethod {
  id: string
  label: string
  caption: string
  icon: PaymentMethodIcon
  category: 'fiat' | 'crypto'
}

export interface UsePaymentMethodsReturn {
  paymentMethods: PaymentMethod[]
  selectedPaymentMethod: string | null
  setSelectedPaymentMethod: (methodId: string) => void
  fiatMethods: PaymentMethod[]
  cryptoMethods: PaymentMethod[]
  renderPaymentMethodIcon: (icon: PaymentMethodIcon) => JSX.Element | null
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'payid', label: 'Pay ID', caption: 'Instant transfer', icon: 'dollar', category: 'fiat' },
  { id: 'card', label: 'Card', caption: 'Visa • Mastercard', icon: 'card', category: 'fiat' },
  { id: 'usdt', label: 'USDT', caption: 'Tether (TRC20 • ERC20)', icon: 'usdt', category: 'crypto' },
  { id: 'btc', label: 'Bitcoin', caption: 'BTC Network', icon: 'btc', category: 'crypto' },
  { id: 'eth', label: 'Ethereum', caption: 'ETH Network', icon: 'eth', category: 'crypto' },
]

export function usePaymentMethods(): UsePaymentMethodsReturn {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(PAYMENT_METHODS[0].id)

  const fiatMethods = PAYMENT_METHODS.filter(method => method.category === 'fiat')
  const cryptoMethods = PAYMENT_METHODS.filter(method => method.category === 'crypto')

  const renderPaymentMethodIcon = (icon: PaymentMethodIcon) => {
    switch (icon) {
      case 'dollar':
        return <DollarSign className="w-5 h-5 text-blue-500" />
      case 'card':
        return <CreditCard className="w-5 h-5 text-green-500" />
      case 'btc':
        return <Bitcoin className="w-5 h-5 text-orange-500" />
      case 'usdt':
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            ₮
          </div>
        )
      case 'eth':
        return (
          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 256 417" fill="currentColor">
              <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity=".6" />
              <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fillOpacity=".45" />
              <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity=".6" />
              <path d="M127.962 416.905v-104.72L0 236.585z" fillOpacity=".45" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  return {
    paymentMethods: PAYMENT_METHODS,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    fiatMethods,
    cryptoMethods,
    renderPaymentMethodIcon
  }
}
