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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa' }}>

      {/* Sidebar — fixed left column */}
      <AdminSidebar adminName={session.email} adminRole={session.role} />

      {/* Right column — fills remaining width */}
      <div style={{
        flex: 1,
        marginLeft: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflow: 'hidden',
      }} className="lg:ml-[260px]">

        <AutoLogoutProvider />

        {/* STICKY TOP BAR — never scrolls */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 25,
          flexShrink: 0,
        }}>
          <AdminTopBar />
        </div>

        {/* SCROLLABLE CONTENT — scrolls under the sticky bar */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch' as const,
        }}>
          {children}
        </main>

      </div>
    </div>
  )
}
