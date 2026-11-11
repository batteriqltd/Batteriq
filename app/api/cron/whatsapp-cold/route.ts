import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import { maybeTopUpLeads, runWahaColdTick } from '@/lib/outreach/waha-queue'
import { runAfterResponse } from '@/lib/outreach/whatsapp-transport'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
/**
 * Token generated inside the outreach database (table whatsapp_cron_auth,
 * RLS on, service role only) and sent by its pg_cron job. Read with the
 * service role and cached briefly so the per-minute tick stays cheap.
 */
let dbTokenCache: { value: string | null; at: number } | null = null
async function dbCronToken(): Promise<string | null> {
  if (dbTokenCache && Date.now() - dbTokenCache.at < 5 * 60 * 1000) return dbTokenCache.value
  try {
    const supabase = createOutreachAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('whatsapp_cron_auth') as any)
      .select('token')
      .eq('id', 1)
      .maybeSingle()
    const value = typeof data?.token === 'string' && data.token.length >= 32 ? data.token : null
    dbTokenCache = { value, at: Date.now() }
    return value
  } catch {
    return null
  }
}

async function handle(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const isMachine =
    bearerMatches(auth, process.env.WHATSAPP_QUEUE_SECRET) ||
    bearerMatches(auth, process.env.CRON_SECRET) ||
    (auth.startsWith('Bearer ') && bearerMatches(auth, (await dbCronToken()) ?? undefined))
  if (!isMachine && !getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runWahaColdTick({ jitter: isMachine })

    // Nothing was sent this minute → let the agent refill its own lead queue
    // (throttled in the DB to once per 2h). Runs after the response.
    if (isMachine && !result.sent && result.reason !== 'cold_campaign_disabled') {
      runAfterResponse(async () => {
        await maybeTopUpLeads()
      })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cold queue tick failed'
    await logOutreachEvent({ module: 'whatsapp', level: 'error', event: 'waha_cold_tick_failed', message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
