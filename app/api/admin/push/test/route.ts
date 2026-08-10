import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { sendAdminPush } from '@/lib/push'

export const dynamic = 'force-dynamic'

// Sends a test push to every registered admin device. Used by the
// "Send test" button so notifications can be verified end-to-end.
export async function POST() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await sendAdminPush({
    title: '🔔 Test Notification',
    body: 'Push notifications are working. You will get alerts for orders, payments and messages.',
    tag: 'test',
    id: `test-${Date.now()}`,
    url: '/admin',
  }).catch(() => null)

  if (!result || result.error) {
    // Surface the real reason rather than a green tick that proves nothing.
    const reason =
      result?.error === 'vapid_missing' ? 'Push keys are not configured on the server.'
      : result?.error === 'table_unreadable' ? 'The push_subscriptions table is unreachable — run DATABASE_SETUP.sql.'
      : result?.error === 'no_devices' ? 'No devices are registered for notifications yet.'
      : 'Could not send the test notification.'
    return NextResponse.json({ success: false, error: reason, result }, { status: 200 })
  }

  return NextResponse.json({ success: result.sent > 0, result })
}
