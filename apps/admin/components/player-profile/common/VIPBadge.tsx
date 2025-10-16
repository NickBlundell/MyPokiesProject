import React from 'react'

interface VIPBadgeProps {
  tier: string
}

export function VIPBadge({ tier }: VIPBadgeProps) {
  const tierColors: Record<string, string> = {
    Bronze: 'bg-orange-100 text-orange-800',
    Silver: 'bg-gray-100 text-gray-800',
    Gold: 'bg-yellow-100 text-yellow-800',
    Platinum: 'bg-purple-100 text-purple-800',
    Diamond: 'bg-blue-100 text-blue-800'
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${tierColors[tier] || 'bg-gray-100 text-gray-800'}`}>
      {tier}
    </span>
  )
}