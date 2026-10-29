import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getOutreachSettings } from '@/lib/outreach/compliance'
import { runDailyEmailCampaignJob } from '@/lib/outreach/email-campaign'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createOutreachAdminClient()
  const settings = await getOutreachSettings(supabase)
  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const updates: Record<string, unknown> = { id: 'default' }

    if (typeof body.campaign_paused === 'boolean') {
      updates.campaign_paused = body.campaign_paused
    }
    if (typeof body.review_before_send === 'boolean') {
      updates.review_before_send = body.review_before_send
    }
    if (typeof body.auto_attach_proforma === 'boolean') {
      updates.auto_attach_proforma = body.auto_attach_proforma
    }
    if (typeof body.autopilot_enabled === 'boolean') {
      updates.autopilot_enabled = body.autopilot_enabled
    }
    if (
      typeof body.autopilot_interval_minutes === 'number' &&
      Number.isFinite(body.autopilot_interval_minutes)
    ) {
      updates.autopilot_interval_minutes = Math.min(
        1440,
        Math.max(5, Math.round(body.autopilot_interval_minutes))
      )
    }
    if (typeof body.auto_cold_whatsapp === 'boolean') {
      updates.auto_cold_whatsapp = body.auto_cold_whatsapp
    }
    if (typeof body.whatsapp_cold_template === 'string' && body.whatsapp_cold_template.trim()) {
      updates.whatsapp_cold_template = body.whatsapp_cold_template.trim()
    }
    if (typeof body.daily_email_limit === 'number' && Number.isFinite(body.daily_email_limit)) {
      updates.daily_email_limit = Math.min(500, Math.max(1, Math.round(body.daily_email_limit)))
    }
    if (typeof body.followup_days === 'number' && Number.isFinite(body.followup_days)) {
      updates.followup_days = Math.min(90, Math.max(1, Math.round(body.followup_days)))
    }
    if (typeof body.sender_name === 'string' && body.sender_name.trim()) {
      updates.sender_name = body.sender_name.trim().slice(0, 120)
    }
    if (typeof body.sender_email === 'string' && body.sender_email.trim()) {
      updates.sender_email = body.sender_email.trim().toLowerCase()
    }
    if (typeof body.reply_to_email === 'string') {
      updates.reply_to_email = body.reply_to_email.trim().toLowerCase()
    }
    if (typeof body.whatsapp_followup_template === 'string' && body.whatsapp_followup_template.trim()) {
      updates.whatsapp_followup_template = body.whatsapp_followup_template.trim()
    }
    if (typeof body.whatsapp_default_template === 'string' && body.whatsapp_default_template.trim()) {
      updates.whatsapp_default_template = body.whatsapp_default_template.trim()
    }
    if (Array.isArray(body.target_categories)) {
      const cats = body.target_categories.map((c: unknown) => String(c).trim()).filter(Boolean)
      if (cats.length > 0) updates.target_categories = cats
    }
    if (Array.isArray(body.target_cities)) {
      const cities = body.target_cities.map((c: unknown) => String(c).trim()).filter(Boolean)
      if (cities.length > 0) updates.target_cities = cities
    }
    if (typeof body.calling_enabled === 'boolean') {
      updates.calling_enabled = body.calling_enabled
    }

    const supabase = createOutreachAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('outreach_settings') as any)
      .upsert(updates, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logOutreachEvent({
      module: 'email_campaign',
      level: 'info',
      event: 'settings_updated',
      message: `Outreach settings updated by ${session.email}`,
      metadata: { updatedFields: Object.keys(updates).filter((k) => k !== 'id') },
    })

    // When Review Mode is turned OFF (Auto-Send turned ON), automatically dispatch queued drafts & ready leads right away!
    let autoDispatchResult: { sentNow: number } | null = null
    if (body.review_before_send === false && !data.campaign_paused && body.trigger_auto_send !== false) {
      try {
        const res = await runDailyEmailCampaignJob({ maxToProcess: 6 })
        autoDispatchResult = { sentNow: res.sentNow }
      } catch {
        // Non-fatal; settings update itself succeeded
      }
    }

    return NextResponse.json({
      success: true,
      settings: data,
      autoDispatchResult,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update settings' },
      { status: 500 }
    )
  }
}
