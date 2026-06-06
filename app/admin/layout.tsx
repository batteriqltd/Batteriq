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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar — fixed on desktop, drawer on mobile/tablet */}
      <AdminSidebar adminName={session.email} adminRole={session.role} />

      {/* Main content — full width on mobile, offset on desktop */}
      <main className="flex-1 lg:ml-[260px] min-h-screen overflow-x-hidden">
        <AutoLogoutProvider />
        <AdminTopBar />
        {/* Content area — responsive padding */}
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
