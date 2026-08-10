import type { PushSubscription } from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// Configure VAPID once per server instance
let configured = false

export interface AdminPushPayload {
  title: string
  body: string
  tag: 'order' | 'message' | 'payment' | string
  url: string
  /**
   * Unique id of the underlying record. The service worker builds its
   * notification tag from it, so three orders arriving together stack as three
   * notifications rather than each one silently replacing the last.
   */
  id?: string
}

export interface PushResult {
  /** Devices the push service accepted the message for. */
  sent: number
  /** Devices that errored for a reason other than being expired. */
  failed: number
  /** Dead subscriptions removed from the table during this send. */
  pruned: number
  /** Devices registered before this send ran. */
  devices: number
  /** Set when the send could not even be attempted. */
  error?: string
}

interface SubRow {
  endpoint: string
  subscription_json: PushSubscription
}

/**
 * How long the push service should hold a message for a device that is
 * offline. This is what makes an alert arrive the moment the phone comes back
 * online instead of being dropped — the WhatsApp-style catch-up.
 *
 * Kept deliberately short for tests: a test alert surfacing a day later is
 * noise, whereas a missed order is still worth knowing about.
 */
const TTL_BY_TAG: Record<string, number> = {
  order: 60 * 60 * 48,
  payment: 60 * 60 * 48,
  message: 60 * 60 * 24,
  test: 60 * 10,
}

// 'high' asks the push service to wake the device promptly rather than
// batching the message into the next maintenance window.
const URGENCY_BY_TAG: Record<string, 'very-low' | 'low' | 'normal' | 'high'> = {
  order: 'high',
  payment: 'high',
  message: 'normal',
  test: 'high',
}

/**
 * Fan a push notification out to every registered admin device.
 * Fire-and-forget: never throws, so callers can `.catch(() => {})` safely.
 * Expired subscriptions (404/410) are pruned automatically.
 *
 * web-push is imported dynamically (matching the codebase's `await import('resend')`
 * pattern) so it is never pulled into the build-time bundle.
 */
export async function sendAdminPush(payload: AdminPushPayload): Promise<PushResult> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:info@batteriq.com'
  if (!publicKey || !privateKey) {
    console.error('[push] VAPID keys missing — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY')
    return { sent: 0, failed: 0, pruned: 0, devices: 0, error: 'vapid_missing' }
  }

  const mod = await import('web-push')
  const webpush = mod.default ?? mod

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    configured = true
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs, error } = await (supabase.from('push_subscriptions') as any)
    .select('endpoint, subscription_json')

  if (error) {
    console.error('[push] could not read push_subscriptions:', error.message)
    return { sent: 0, failed: 0, pruned: 0, devices: 0, error: 'table_unreadable' }
  }
  if (!subs?.length) {
    console.warn('[push] no admin devices registered — nobody to notify')
    return { sent: 0, failed: 0, pruned: 0, devices: 0, error: 'no_devices' }
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    id: payload.id,
    url: payload.url,
    icon: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    // Lets the service worker advance its catch-up cursor past anything it
    // has already surfaced, so reconnecting does not double-notify.
    sentAt: new Date().toISOString(),
  })

  const options = {
    TTL: TTL_BY_TAG[payload.tag] ?? 60 * 60 * 24,
    urgency: URGENCY_BY_TAG[payload.tag] ?? 'normal',
  }

  let sent = 0
  let failed = 0
  let pruned = 0

  await Promise.all(
    (subs as SubRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription_json, body, options)
        sent++
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is dead — remove it so we stop trying
          pruned++
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('push_subscriptions') as any).delete().eq('endpoint', row.endpoint)
        } else {
          failed++
          console.error('[push] send failed:', statusCode, (err as { body?: string })?.body)
        }
      }
    })
  )

  console.log(`[push] ${payload.tag}: sent=${sent} failed=${failed} pruned=${pruned}`)
  return { sent, failed, pruned, devices: (subs as SubRow[]).length }
}
