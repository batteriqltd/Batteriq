import { AdminSidebar, AdminTopBar } from '@/components/admin/Sidebar'
import { AutoLogoutProvider } from '@/components/admin/AutoLogoutProvider'
import { getAdminSession } from '@/lib/admin-auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: 'noindex, nofollow, noarchive',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getAdminSession()
  if (!session) return <>{children}</>

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#f8f9fa',
    }}>
      {/* Sidebar — fixed height, no scroll on outer */}
      <AdminSidebar adminName={session.email} adminRole={session.role} />

      {/* Right column — fixed height column */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        marginLeft: 0,
      }} className="lg:ml-[260px]">

        <AutoLogoutProvider />

        {/* TOP BAR — never moves, always at top */}
        <div style={{ flexShrink: 0, zIndex: 20, position: 'relative' }}>
          <AdminTopBar />
        </div>

        {/* CONTENT — only this scrolls */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch' as const,
        }}>
          {children}
        </div>

      </div>
    </div>
  )
}
