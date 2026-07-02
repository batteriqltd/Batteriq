import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// Configure VAPID once per server instance
let configured = false
function configure(): boolean {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:info@batteriq.com'
  if (!publicKey || !privateKey) {
    console.error('[push] VAPID keys missing — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY')
    return false
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export interface AdminPushPayload {
  title: string
  body: string
  tag: 'order' | 'message' | 'payment' | string
  url: string
}

interface SubRow {
  endpoint: string
  subscription_json: webpush.PushSubscription
}

/**
 * Fan a push notification out to every registered admin device.
 * Fire-and-forget: never throws, so callers can `.catch(() => {})` safely.
 * Expired subscriptions (404/410) are pruned automatically.
 */
export async function sendAdminPush(payload: AdminPushPayload): Promise<void> {
  if (!configure()) return

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs, error } = await (supabase.from('push_subscriptions') as any)
    .select('endpoint, subscription_json')

  if (error) {
    console.error('[push] could not read push_subscriptions:', error.message)
    return
  }
  if (!subs?.length) return

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    url: payload.url,
    icon: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
  })

  await Promise.all(
    (subs as SubRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription_json, body)
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is dead — remove it so we stop trying
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('push_subscriptions') as any).delete().eq('endpoint', row.endpoint)
        } else {
          console.error('[push] send failed:', statusCode, (err as { body?: string })?.body)
        }
      }
    })
  )
}
