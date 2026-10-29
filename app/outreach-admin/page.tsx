import type { Metadata } from 'next'
import { OutreachConsole } from '@/components/admin/outreach/OutreachConsole'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Outreach Agent Console | Batteriq Admin',
  robots: 'noindex, nofollow, noarchive',
}

export default function StandaloneOutreachAdminPage() {
  return <OutreachConsole standalone={true} />
}
