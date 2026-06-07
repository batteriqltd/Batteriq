import { AdminSidebar, AdminTopBar } from '@/components/admin/Sidebar'
import { AutoLogoutProvider } from '@/components/admin/AutoLogoutProvider'
import { getAdminSession } from '@/lib/admin-auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: 'noindex, nofollow, noarchive',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getAdminSession()

  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <AdminSidebar adminName={session.email} adminRole={session.role} />

      {/* Main content column — offset by sidebar width on desktop */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        <AutoLogoutProvider />

        {/* TOP BAR — sticky, stays at top when scrolling */}
        <div className="sticky top-0 z-20 flex-shrink-0">
          <AdminTopBar />
        </div>

        {/* Page content — scrolls beneath the sticky top bar */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
