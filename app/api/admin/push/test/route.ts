import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { sendAdminPush } from '@/lib/push'

export const dynamic = 'force-dynamic'

// Sends a test push to every registered admin device. Used by the
// "Send test" button so notifications can be verified end-to-end.
export async function POST() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sendAdminPush({
    title: '🔔 Test Notification',
    body: 'Push notifications are working. You will get alerts for orders, payments and messages.',
    tag: 'message',
    url: '/admin',
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
