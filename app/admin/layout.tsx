import { AdminSidebar, AdminTopBar } from '@/components/admin/Sidebar'
import { AutoLogoutProvider } from '@/components/admin/AutoLogoutProvider'
import { AdminNotifyProvider } from '@/components/admin/AdminNotify'
import { getAdminSession } from '@/lib/admin-auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: 'noindex, nofollow, noarchive',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getAdminSession()
  if (!session) return <>{children}</>

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8f9fa' }}>

      {/* Sidebar */}
      <AdminSidebar adminName={session.email} adminRole={session.role} />

      {/* Right column — must start after 260px sidebar on desktop */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        minWidth: 0,
        marginLeft: '260px', // desktop: push right of sidebar
      }} className="max-lg:!ml-0"> {/* mobile: no margin since sidebar is a drawer overlay */}

        <AutoLogoutProvider />

        {/* TOP BAR — permanently fixed, never scrolls */}
        <div style={{ flexShrink: 0, zIndex: 20 }}>
          <AdminTopBar />
        </div>

        {/* CONTENT — only this area scrolls */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch' as const,
        }}>
          <AdminNotifyProvider>
            {children}
          </AdminNotifyProvider>
        </div>

      </div>
    </div>
  )
}
