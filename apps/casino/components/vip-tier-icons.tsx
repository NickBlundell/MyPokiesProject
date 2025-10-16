/**
 * VIP Tier Icons Component
 * Custom SVG icons for each VIP tier
 */

interface TierIconProps {
  className?: string
  size?: number
}

export const BronzeIcon = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill="#CD7F32" stroke="#8B4513" strokeWidth="1.5"/>
    <path d="M12 6L14 10L18 10.5L15 13.5L16 17.5L12 15.5L8 17.5L9 13.5L6 10.5L10 10L12 6Z" fill="#8B4513" stroke="#5C2E00" strokeWidth="0.5"/>
    <text x="12" y="13" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">B</text>
  </svg>
)

export const SilverIcon = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill="#C0C0C0" stroke="#808080" strokeWidth="1.5"/>
    <path d="M12 6L14 10L18 10.5L15 13.5L16 17.5L12 15.5L8 17.5L9 13.5L6 10.5L10 10L12 6Z" fill="#E5E4E2" stroke="#808080" strokeWidth="0.5"/>
    <text x="12" y="13" fontSize="8" fill="#333" textAnchor="middle" fontWeight="bold">S</text>
  </svg>
)

export const GoldIcon = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#FFA500" strokeWidth="1.5"/>
    <path d="M12 6L14 10L18 10.5L15 13.5L16 17.5L12 15.5L8 17.5L9 13.5L6 10.5L10 10L12 6Z" fill="#FFA500" stroke="#FF8C00" strokeWidth="0.5"/>
    <text x="12" y="13" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">G</text>
  </svg>
)

export const PlatinumIcon = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="platinumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E5E4E2" />
        <stop offset="50%" stopColor="#BEC2CB" />
        <stop offset="100%" stopColor="#E5E4E2" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#platinumGradient)" stroke="#6B7280" strokeWidth="1.5"/>
    <path d="M12 6L14 10L18 10.5L15 13.5L16 17.5L12 15.5L8 17.5L9 13.5L6 10.5L10 10L12 6Z" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="0.5"/>
    <text x="12" y="13" fontSize="8" fill="#1F2937" textAnchor="middle" fontWeight="bold">P</text>
  </svg>
)

export const DiamondIcon = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#B9F2FF" />
        <stop offset="50%" stopColor="#6DD5FA" />
        <stop offset="100%" stopColor="#2980B9" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#diamondGradient)" stroke="#1E40AF" strokeWidth="1.5"/>
    <path d="M12 6L14 10L18 10.5L15 13.5L16 17.5L12 15.5L8 17.5L9 13.5L6 10.5L10 10L12 6Z" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="0.5"/>
    <path d="M12 8L9 11H15L12 8Z M9 11L12 16L15 11H9Z" fill="white" opacity="0.8"/>
    <text x="12" y="13" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">D</text>
  </svg>
)

// Alternative style - Shield badges
export const BronzeShield = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 2L4 7V11C4 16 7 20 12 21C17 20 20 16 20 11V7L12 2Z" fill="#CD7F32" stroke="#8B4513" strokeWidth="1.5"/>
    <path d="M12 6L13.5 9L16.5 9.5L14.25 11.75L14.75 14.75L12 13.25L9.25 14.75L9.75 11.75L7.5 9.5L10.5 9L12 6Z" fill="#8B4513"/>
  </svg>
)

export const SilverShield = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 2L4 7V11C4 16 7 20 12 21C17 20 20 16 20 11V7L12 2Z" fill="#C0C0C0" stroke="#808080" strokeWidth="1.5"/>
    <path d="M12 6L13.5 9L16.5 9.5L14.25 11.75L14.75 14.75L12 13.25L9.25 14.75L9.75 11.75L7.5 9.5L10.5 9L12 6Z" fill="#E5E4E2"/>
  </svg>
)

export const GoldShield = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 2L4 7V11C4 16 7 20 12 21C17 20 20 16 20 11V7L12 2Z" fill="#FFD700" stroke="#FFA500" strokeWidth="1.5"/>
    <path d="M12 6L13.5 9L16.5 9.5L14.25 11.75L14.75 14.75L12 13.25L9.25 14.75L9.75 11.75L7.5 9.5L10.5 9L12 6Z" fill="#FFA500"/>
  </svg>
)

export const PlatinumShield = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="platinumShieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E5E4E2" />
        <stop offset="50%" stopColor="#BEC2CB" />
        <stop offset="100%" stopColor="#E5E4E2" />
      </linearGradient>
    </defs>
    <path d="M12 2L4 7V11C4 16 7 20 12 21C17 20 20 16 20 11V7L12 2Z" fill="url(#platinumShieldGradient)" stroke="#6B7280" strokeWidth="1.5"/>
    <path d="M12 6L13.5 9L16.5 9.5L14.25 11.75L14.75 14.75L12 13.25L9.25 14.75L9.75 11.75L7.5 9.5L10.5 9L12 6Z" fill="#F3F4F6"/>
  </svg>
)

export const DiamondShield = ({ className = "", size = 24 }: TierIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="diamondShieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#B9F2FF" />
        <stop offset="50%" stopColor="#6DD5FA" />
        <stop offset="100%" stopColor="#2980B9" />
      </linearGradient>
    </defs>
    <path d="M12 2L4 7V11C4 16 7 20 12 21C17 20 20 16 20 11V7L12 2Z" fill="url(#diamondShieldGradient)" stroke="#1E40AF" strokeWidth="1.5"/>
    <path d="M12 6L13.5 9L16.5 9.5L14.25 11.75L14.75 14.75L12 13.25L9.25 14.75L9.75 11.75L7.5 9.5L10.5 9L12 6Z" fill="#DBEAFE"/>
    <path d="M12 8L9 11H15L12 8Z M9 11L12 15L15 11H9Z" fill="white" opacity="0.6"/>
  </svg>
)

// Export a tier icon selector component
export const VipTierIcon = ({ tier, className = "", size = 24, style = "medal" }: { tier: string, className?: string, size?: number, style?: "medal" | "shield" }) => {
  if (style === "shield") {
    switch (tier.toLowerCase()) {
      case 'bronze': return <BronzeShield className={className} size={size} />
      case 'silver': return <SilverShield className={className} size={size} />
      case 'gold': return <GoldShield className={className} size={size} />
      case 'platinum': return <PlatinumShield className={className} size={size} />
      case 'diamond': return <DiamondShield className={className} size={size} />
      default: return null
    }
  }

  switch (tier.toLowerCase()) {
    case 'bronze': return <BronzeIcon className={className} size={size} />
    case 'silver': return <SilverIcon className={className} size={size} />
    case 'gold': return <GoldIcon className={className} size={size} />
    case 'platinum': return <PlatinumIcon className={className} size={size} />
    case 'diamond': return <DiamondIcon className={className} size={size} />
    default: return null
  }
}