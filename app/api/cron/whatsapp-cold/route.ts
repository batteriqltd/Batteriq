import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { runWahaColdTick } from '@/lib/outreach/waha-queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function bearerMatches(header: string, secret: string | undefined): boolean {
  const s = secret?.trim()
  if (!s) return false
  const expected = `Bearer ${s}`
  if (header.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected))
}

/**
 * Cold WhatsApp queue tick — sends at most one intro, never more than 1/minute.
 * Called every minute by Supabase pg_cron (Bearer WHATSAPP_QUEUE_SECRET), by
 * Vercel cron (Bearer CRON_SECRET), or by a logged-in admin's open console.
 */
async function handle(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const isMachine =
    bearerMatches(auth, process.env.WHATSAPP_QUEUE_SECRET) || bearerMatches(auth, process.env.CRON_SECRET)
  if (!isMachine && !getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runWahaColdTick({ jitter: isMachine })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cold queue tick failed'
    await logOutreachEvent({ module: 'whatsapp', level: 'error', event: 'waha_cold_tick_failed', message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
