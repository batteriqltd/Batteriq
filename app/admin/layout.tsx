import { AdminSidebar, AdminTopBar } from '@/components/admin/Sidebar'
import { AutoLogoutProvider } from '@/components/admin/AutoLogoutProvider'
import { getAdminSession } from '@/lib/admin-auth'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getAdminSession()

  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar adminName={session.email} adminRole={session.role} />
      <main className="flex-1 ml-56 sm:ml-64 min-h-screen overflow-auto">
        <AutoLogoutProvider />
        <AdminTopBar />
        {children}
      </main>
    </div>
  )
}
