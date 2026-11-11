import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { ensureWahaSessionStarted } from '@/lib/waha'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { wahaErrorResponse, wahaWebhookUrl } from '@/lib/outreach/waha-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** POST — create/start the `default` session and register the signed webhook. `{ force: true }` re-applies config. */
export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const hmacKey = process.env.WHATSAPP_WEBHOOK_SECRET?.trim()
  if (!hmacKey) {
    return NextResponse.json({ error: 'WHATSAPP_WEBHOOK_SECRET is not set on the server.' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  try {
    const info = await ensureWahaSessionStarted({
      webhookUrl: wahaWebhookUrl(),
      hmacKey,
      forceConfigUpdate: body?.force === true,
    })
    await logOutreachEvent({
      module: 'whatsapp',
      level: 'info',
      event: 'waha_connect',
      message: `WhatsApp session start requested by ${session.email}`,
      metadata: { status: info?.status || null },
    })
    return NextResponse.json({ success: true, status: info?.status || 'STARTING' })
  } catch (err) {
    return wahaErrorResponse(err, 'Could not start WhatsApp session')
  }
}
