'use client'

export default function HeaderStats({ onlinePlayers, todaysRevenue }: { onlinePlayers: number, todaysRevenue: number }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="flex items-center gap-6 text-sm">
      <div>
        <span className="text-gray-500">Online Players:</span>
        <span className="ml-2 font-semibold text-green-600">{onlinePlayers.toLocaleString()}</span>
      </div>
      <div>
        <span className="text-gray-500">Today&apos;s Revenue:</span>
        <span className="ml-2 font-semibold text-blue-600">{formatCurrency(todaysRevenue)}</span>
      </div>
    </div>
  )
}
