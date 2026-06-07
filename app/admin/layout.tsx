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
    <div className="min-h-screen bg-[#f8f9fa]">

      {/* Sidebar */}
      <AdminSidebar adminName={session.email} adminRole={session.role} />

      {/* Everything to the right of sidebar */}
      <div className="lg:ml-[260px]">
        <AutoLogoutProvider />

        {/* TOP BAR — sticks to top of viewport as page scrolls */}
        <div className="sticky top-0 z-20">
          <AdminTopBar />
        </div>

        {/* Page content — normal flow, scrolls with the page */}
        <main>
          {children}
        </main>

      </div>
    </div>
  )
}
