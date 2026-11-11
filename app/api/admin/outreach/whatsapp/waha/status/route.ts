import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getWahaQrDataUrl, getWahaSession, isWahaConfigured, pingWaha } from '@/lib/waha'
import { wahaWebhookUrl } from '@/lib/outreach/waha-admin'
import { getColdCampaignStats, getWahaCampaignSettings } from '@/lib/outreach/waha-queue'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET — live WhatsApp (WAHA) status.
 *   ?qr=1   also returns the QR (data URL) while the session is waiting for a scan
 *   ?lite=1 only reports whether WAHA is configured (used by the inbox)
 */
export async function GET(req: NextRequest) {
  if (!getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configured = isWahaConfigured()
  const webhookSecretSet = Boolean(process.env.WHATSAPP_WEBHOOK_SECRET?.trim())
  if (req.nextUrl.searchParams.get('lite') === '1' || !configured) {
    return NextResponse.json({ configured, webhookSecretSet })
  }

  const webhookUrl = wahaWebhookUrl()
  const supabase = createOutreachAdminClient()

  const [ping, campaign, stats, lastEventAt] = await Promise.all([
    pingWaha(),
    getWahaCampaignSettings(supabase).catch(() => null),
    getColdCampaignStats(supabase).catch(() => null),
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('whatsapp_session_state') as any)
          .select('last_event_at')
          .eq('id', 'default')
          .maybeSingle()
        return (data?.last_event_at as string | undefined) || null
      } catch {
        return null
      }
    })(),
  ])

  let status = 'UNREACHABLE'
  let me: { id?: string; pushName?: string } | null = null
  let webhookRegistered = false
  let qr: string | null = null
  let error: string | undefined = ping.ok ? undefined : ping.error

  if (ping.ok) {
    try {
      const session = await getWahaSession()
      status = session?.status || 'NOT_CREATED'
      me = session?.me || null
      webhookRegistered = (session?.config?.webhooks || []).some((w) => w?.url === webhookUrl)
      if (status === 'SCAN_QR_CODE' && req.nextUrl.searchParams.get('qr') === '1') {
        qr = await getWahaQrDataUrl()
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Status check failed'
    }
  }

  return NextResponse.json({
    configured,
    webhookSecretSet,
    reachable: ping.ok,
    latencyMs: ping.latencyMs,
    status,
    me: me ? { id: me.id || null, pushName: me.pushName || null } : null,
    webhook: { url: webhookUrl, registered: webhookRegistered, lastEventAt },
    qr,
    campaign: campaign ? { ...campaign, ...(stats || {}) } : null,
    error,
  })
}
