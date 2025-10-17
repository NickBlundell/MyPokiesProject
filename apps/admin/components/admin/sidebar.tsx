'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Gift,
  DollarSign,
  BarChart3,
  HeartHandshake,
  MessageSquare,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  UserCheck,
  Mail,
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    label: 'Players',
    href: '/dashboard/players',
    icon: Users,
    children: [
      {
        label: 'All Players',
        href: '/dashboard/players',
        icon: Users
      },
      {
        label: 'VIP Management',
        href: '/dashboard/players/vip',
        icon: UserCheck
      },
      {
        label: 'Player Segments',
        href: '/dashboard/players/segments',
        icon: ChevronRight
      }
    ]
  },
  {
    label: 'Promotions',
    href: '/dashboard/promotions',
    icon: Gift,
    children: [
      {
        label: 'Templates',
        href: '/dashboard/promotions',
        icon: Gift
      },
      {
        label: 'Active Offers',
        href: '/dashboard/promotions/active-offers',
        icon: Clock
      }
    ]
  },
  {
    label: 'Legacy Bonuses',
    href: '/dashboard/bonuses',
    icon: Calendar,
    children: [
      {
        label: 'Assign Bonus',
        href: '/dashboard/bonuses/assign',
        icon: ChevronRight
      },
      {
        label: 'Active Bonuses',
        href: '/dashboard/bonuses/active',
        icon: ChevronRight
      }
    ]
  },
  {
    label: 'Financials',
    href: '/dashboard/financials',
    icon: DollarSign,
    children: [
      {
        label: 'Transactions',
        href: '/dashboard/financials/transactions',
        icon: DollarSign
      },
      {
        label: 'Withdrawals',
        href: '/dashboard/financials/withdrawals',
        icon: ChevronRight
      },
      {
        label: 'Revenue',
        href: '/dashboard/financials/revenue',
        icon: TrendingUp
      }
    ]
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3
  },
  {
    label: 'SMS CRM',
    href: '/dashboard/crm',
    icon: HeartHandshake,
    children: [
      {
        label: 'Send Outbound',
        href: '/dashboard/crm/outbound',
        icon: Mail
      },
      {
        label: 'Conversations',
        href: '/dashboard/crm/conversations',
        icon: MessageSquare
      },
      {
        label: 'Lead Lists',
        href: '/dashboard/crm/leads',
        icon: Users
      },
      {
        label: 'Scheduled Messages',
        href: '/dashboard/crm/scheduled-messages',
        icon: Clock
      },
      {
        label: 'Campaigns',
        href: '/dashboard/crm/campaigns',
        icon: Mail
      },
      {
        label: 'Analytics',
        href: '/dashboard/crm/analytics',
        icon: TrendingUp
      },
      {
        label: 'Integrations',
        href: '/dashboard/crm/integrations',
        icon: ChevronRight
      }
    ]
  },
  {
    label: 'Support',
    href: '/dashboard/support',
    icon: MessageSquare,
    badge: '3'
  },
  {
    label: 'Compliance',
    href: '/dashboard/compliance',
    icon: Shield
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings
  }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800 flex flex-col items-center">
        <Image
          src="/mypokies-logo.webp"
          alt="MyPokies"
          width={200}
          height={64}
          className="h-16 w-auto mb-2"
          priority
        />
        <p className="text-xs text-gray-400">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <li key={item.href}>
                {/* If item has children, make it non-clickable */}
                {item.children ? (
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-md ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}

                {/* Sub-navigation - Always visible */}
                {item.children && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const childIsActive = pathname === child.href
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                              childIsActive
                                ? 'text-white bg-gray-800'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-gray-400">admin@mypokies.com</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  )
}