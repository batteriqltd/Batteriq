import { sendAdminPush, type PushResult } from '@/lib/push'
import { getOutreachSettings } from './compliance'
import { createOutreachAdminClient } from './supabase'
import type { NotifyEvent } from './types'

const TITLES: Record<NotifyEvent, string> = {
  whatsapp_message: 'New WhatsApp message',
  client_reply: 'Client replied',
  hot_lead: 'Hot lead',
  batch_failed: 'Outreach batch had failures',
  autopilot_error: 'Autopilot error',
}

/**
 * Checks the current moment (Africa/Nairobi) against the workspace's
 * configured quiet hours. Handles a window that wraps past midnight
 * (e.g. 21:00–07:00).
 */
function isWithinQuietHours(start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  const now = new Date()
  const nairobiMinutes = (() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now)
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
    return h * 60 + m
  })()
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)
  if (startMin === endMin) return false
  if (startMin < endMin) {
    return nairobiMinutes >= startMin && nairobiMinutes < endMin
  }
  // Wraps past midnight, e.g. 21:00 -> 07:00
  return nairobiMinutes >= startMin || nairobiMinutes < endMin
}

/**
 * Fans out a push notification for an outreach event, gated by the
 * workspace's notification settings (which events are enabled, quiet hours).
 * Reuses the same Web Push delivery as the main site's admin alerts —
 * same push_subscriptions table, same devices, no separate opt-in needed.
 */
export async function sendOutreachNotification(params: {
  event: NotifyEvent
  body: string
  url: string
  id?: string
}): Promise<PushResult | { sent: 0; failed: 0; pruned: 0; devices: 0; error: 'skipped' }> {
  try {
    const supabase = createOutreachAdminClient()
    const settings = await getOutreachSettings(supabase)

    if (!settings.notify_events?.includes(params.event)) {
      return { sent: 0, failed: 0, pruned: 0, devices: 0, error: 'skipped' }
    }
    if (isWithinQuietHours(settings.quiet_hours_start, settings.quiet_hours_end)) {
      return { sent: 0, failed: 0, pruned: 0, devices: 0, error: 'skipped' }
    }

    return await sendAdminPush({
      title: TITLES[params.event],
      body: params.body,
      tag: params.event,
      url: params.url,
      id: params.id,
    })
  } catch (err) {
    console.error('[outreach notifications] send failed:', err)
    return { sent: 0, failed: 0, pruned: 0, devices: 0, error: 'skipped' }
  }
}
