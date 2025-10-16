'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Bitcoin, CreditCard, DollarSign, LogOut, Wallet, X } from 'lucide-react'

interface AccountDropdownProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  realBalance: number
  user?: {
    email?: string
    user_metadata?: {
      first_name?: string
    }
  } | null
}

export function AccountDropdown({
  isOpen,
  onClose,
  onLogout,
  realBalance,
  user
}: AccountDropdownProps) {
  const [view, setView] = useState<'main' | 'withdraw'>('main')
  const [amount, setAmount] = useState('')
  const withdrawQuickAmounts = ['20', '50', '100', '250', '500', 'Max']

  useEffect(() => {
    if (!isOpen) {
      setView('main')
      setAmount('')
    }
  }, [isOpen])

  const handleClose = () => {
    setView('main')
    setAmount('')
    onClose()
  }

  const handleWithdrawQuickAmount = (value: string) => {
    if (value === 'Max') {
      setAmount(realBalance.toFixed(2))
    } else {
      const currentAmount = parseFloat(amount) || 0
      const addAmount = parseFloat(value)
      const newAmount = currentAmount + addAmount
      setAmount(newAmount.toFixed(2))
    }
  }

  const userName = user?.user_metadata?.first_name
  const userEmail = user?.email

  if (!isOpen) return null

  return (
    <>
      <div className="absolute top-full right-0 mt-2 w-[95vw] max-w-[420px] bg-[#1a2024] border border-[#2a3439] rounded-xl shadow-2xl z-[201] overflow-hidden">
        {view === 'main' ? (
          <>
            <div className="p-4 border-b border-[#2a3439] flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Account</h3>
                {(userName || userEmail) && (
                  <p className="text-xs text-gray-400">
                    {userName ? `Welcome back, ${userName}!` : userEmail}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-[#2a3439] transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-[#0f1419] border border-[#2a3439] rounded-lg p-4">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Available Balance
                </div>
                <div className="text-2xl font-bold text-white">
                  ${realBalance.toFixed(2)}
                </div>
              </div>

              <button
                onClick={() => setView('withdraw')}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
              >
                Withdraw Funds
              </button>

              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#2a3439] hover:bg-[#3a4449] text-gray-300 hover:text-white rounded-lg font-semibold text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center p-4 pb-2">
              <button
                onClick={() => {
                  setView('main')
                  setAmount('')
                }}
                className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-[#2a3439] rounded-lg transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className="flex-1 text-center">
                <h3 className="text-white font-bold text-base">Withdraw</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-[#2a3439] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="p-4 pb-2">
              <div className="bg-[#0f1419] border border-[#2a3439] rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Withdrawal Amount
                </label>

                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#1a2024] border border-[#2a3439] rounded-lg pl-8 pr-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500 transition-colors"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {withdrawQuickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => handleWithdrawQuickAmount(quickAmount)}
                      className="py-2 bg-[#2a3439] hover:bg-[#3a4449] text-white text-sm font-semibold rounded-lg transition-all"
                    >
                      {quickAmount === 'Max' ? 'Max' : `$${quickAmount}`}
                    </button>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-[#2a3439] flex items-center justify-between text-xs">
                  <span className="text-gray-400">Available Balance</span>
                  <span className="text-white font-semibold">
                    ${realBalance.toFixed(2)}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-500 text-center">
                  Minimum withdrawal: $20
                </div>
              </div>
            </div>

            <div className="p-4 pt-2">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Select Withdrawal Method
              </label>

              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 lg:gap-3 p-2.5 lg:p-4 bg-[#2a3439] hover:bg-[#3a4449] rounded-lg transition-all group">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1a2024] rounded-lg flex items-center justify-center group-hover:bg-[#0f1419] flex-shrink-0">
                    <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-white font-semibold text-xs lg:text-sm">Bank Transfer</div>
                    <div className="text-gray-400 text-[10px] lg:text-xs">1-3 business days</div>
                  </div>
                </button>

                <button className="w-full flex items-center gap-2 lg:gap-3 p-2.5 lg:p-4 bg-[#2a3439] hover:bg-[#3a4449] rounded-lg transition-all group">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1a2024] rounded-lg flex items-center justify-center group-hover:bg-[#0f1419] flex-shrink-0">
                    <CreditCard className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-white font-semibold text-xs lg:text-sm">Card</div>
                    <div className="text-gray-400 text-[10px] lg:text-xs">Visa • Mastercard</div>
                  </div>
                </button>

                <div className="pt-1 lg:pt-2">
                  <div className="text-[10px] lg:text-xs font-medium text-gray-500 mb-1.5 lg:mb-2 px-1">
                    Cryptocurrency
                  </div>

                  <button className="w-full flex items-center gap-2 lg:gap-3 p-2.5 lg:p-4 bg-[#2a3439] hover:bg-[#3a4449] rounded-lg transition-all group mb-1.5 lg:mb-2">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1a2024] rounded-lg flex items-center justify-center group-hover:bg-[#0f1419] flex-shrink-0">
                      <div className="w-5 h-5 lg:w-6 lg:h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] lg:text-xs font-bold">
                        ₮
                      </div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white font-semibold text-xs lg:text-sm">USDT</div>
                      <div className="text-gray-400 text-[10px] lg:text-xs truncate">Tether (TRC20 • ERC20)</div>
                    </div>
                  </button>

                  <button className="w-full flex items-center gap-2 lg:gap-3 p-2.5 lg:p-4 bg-[#2a3439] hover:bg-[#3a4449] rounded-lg transition-all group mb-1.5 lg:mb-2">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1a2024] rounded-lg flex items-center justify-center group-hover:bg-[#0f1419] flex-shrink-0">
                      <Bitcoin className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white font-semibold text-xs lg:text-sm">Bitcoin</div>
                      <div className="text-gray-400 text-[10px] lg:text-xs">BTC Network</div>
                    </div>
                  </button>

                  <button className="w-full flex items-center gap-2 lg:gap-3 p-2.5 lg:p-4 bg-[#2a3439] hover:bg-[#3a4449] rounded-lg transition-all group">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1a2024] rounded-lg flex items-center justify-center group-hover:bg-[#0f1419] flex-shrink-0">
                      <div className="w-5 h-5 lg:w-6 lg:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" viewBox="0 0 256 417" fill="currentColor">
                          <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity=".6" />
                          <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fillOpacity=".45" />
                          <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity=".6" />
                          <path d="M127.962 416.905v-104.72L0 236.585z" fillOpacity=".45" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white font-semibold text-xs lg:text-sm">Ethereum</div>
                      <div className="text-gray-400 text-[10px] lg:text-xs">ETH Network</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0f1419] border-t border-[#2a3439]">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Wallet className="w-4 h-4" />
                <span>Withdrawals are processed based on your VIP tier priorities</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
