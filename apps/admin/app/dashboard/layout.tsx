import Sidebar from '@/components/admin/sidebar'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import HeaderStats from '@/components/admin/header-stats'

async function getHeaderStats() {
  const supabase = await createAdminClient()

  let onlinePlayers = 0
  let todaysRevenue = 0

  try {
    // Get users with recent activity (last 15 minutes = online)
    const fifteenMinsAgo = new Date()
    fifteenMinsAgo.setMinutes(fifteenMinsAgo.getMinutes() - 15)

    // Try to count online players from last_sign_in_at or activity logs
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', fifteenMinsAgo.toISOString())

    onlinePlayers = userCount || 0

    // Get today's revenue from transactions
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const possibleTables = ['transactions', 'financial_transactions', 'payments']

    for (const tableName of possibleTables) {
      try {
        const { data: transactions } = await supabase
          .from(tableName)
          .select('type, subtype, amount')
          .gte('created_at', today.toISOString())

        if (transactions) {
          // Sum up bets/wagers as revenue
          todaysRevenue = transactions
            .filter(t => t.type === 'debit' && (t.subtype === 'bet' || t.subtype === 'wager'))
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)
          break
        }
      } catch {
        continue
      }
    }
  } catch (error) {
    logger.error('Error fetching header stats', error, {
      function: 'getHeaderStats',
    })
  }

  return { onlinePlayers, todaysRevenue }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { onlinePlayers, todaysRevenue } = await getHeaderStats()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
              <div className="flex items-center gap-4">
                {/* Quick Stats */}
                <HeaderStats onlinePlayers={onlinePlayers} todaysRevenue={todaysRevenue} />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
