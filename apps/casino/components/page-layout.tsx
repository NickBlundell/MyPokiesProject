'use client'

import { Footer } from '@/components/footer'

interface PageLayoutProps {
  user?: {
    email?: string
    user_metadata?: {
      first_name?: string
      last_name?: string
    }
  } | null
  children: React.ReactNode
  title?: string
  icon?: React.ReactNode
}

export default function PageLayout({ children, title, icon }: PageLayoutProps) {
  return (
    <>
      <div className="relative py-6 md:py-10 flex-1 overflow-visible">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8">
          {/* Page Header */}
          {title && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                {icon && <div>{icon}</div>}
                <h1 className="text-4xl md:text-5xl font-bold text-white uppercase">{title}</h1>
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="max-w-none">
            <style jsx global>{`
              h2 {
                font-size: 0.75rem !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                color: white !important;
                margin-bottom: 0.75rem !important;
              }
              @media (min-width: 640px) {
                h2 {
                  font-size: 0.875rem !important;
                }
              }
            `}</style>
            {children}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </>
  )
}
