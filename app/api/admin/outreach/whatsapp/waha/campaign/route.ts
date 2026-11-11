import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import { getWahaCampaignSettings } from '@/lib/outreach/waha-queue'

export const dynamic = 'force-dynamic'

/** PATCH — update the cold WhatsApp campaign settings. */
export async function PATCH(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  if (typeof body.waha_cold_enabled === 'boolean') {
    updates.waha_cold_enabled = body.waha_cold_enabled
    if (body.waha_cold_enabled) updates.waha_cold_paused_until = null
  }
  if (typeof body.waha_cold_message === 'string') {
    updates.waha_cold_message = body.waha_cold_message.trim().slice(0, 1500) || null
  }
  const int = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : undefined
  const cap = int(body.waha_cold_daily_cap, 1, 1000)
  const start = int(body.waha_cold_start_hour, 0, 23)
  const end = int(body.waha_cold_end_hour, 1, 24)
  if (cap !== undefined) updates.waha_cold_daily_cap = cap
  if (start !== undefined) updates.waha_cold_start_hour = start
  if (end !== undefined) updates.waha_cold_end_hour = end
  if (body.clear_pause === true) updates.waha_cold_paused_until = null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const supabase = createOutreachAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('outreach_settings') as any).update(updates).eq('id', 'default')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logOutreachEvent({
    module: 'whatsapp',
    level: 'info',
    event: 'waha_campaign_updated',
    message: `WhatsApp cold campaign settings updated by ${session.email}`,
    metadata: { fields: Object.keys(updates) },
  })

  return NextResponse.json({ success: true, campaign: await getWahaCampaignSettings(supabase) })
}
