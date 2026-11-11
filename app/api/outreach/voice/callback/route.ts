import { NextRequest } from 'next/server'
import { buildAfricasTalkingVoiceXml } from '@/lib/outreach/calling-stub'
import { recordPermanentOptOut } from '@/lib/outreach/compliance'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { sendOutreachNotification } from '@/lib/outreach/notifications'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import { normalizeKenyanPhone } from '@/lib/outreach/validators'
import { buildRingGroupXml, buildVoicemailXml, getVoiceReadiness } from '@/lib/outreach/voice'

export const dynamic = 'force-dynamic'

function xmlResponse(xml: string) {
  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } })
}

/**
 * POST /api/outreach/voice/callback
 *
 * Africa's Talking posts to this ONE URL at every stage of a call's life —
 * there's no separate URL per event. We tell stages apart by which fields
 * are present on a given POST:
 *   1. Fresh inbound call  → no dtmfDigits, no recordingUrl, isActive=1,
 *      and we have no outreach_calls row for this sessionId yet.
 *   2. DTMF digits         → caller pressed a key during the legacy AI
 *      disclosure flow (opt-out / transfer) — unrelated to ring-group calls
 *      but kept for backward compatibility with lib/outreach/calling-stub.ts.
 *   3. Recording complete  → recordingUrl present.
 *   4. Call ended          → isActive=0.
 *
 * NOTE: this sequence is built from Africa's Talking's documented parameter
 * names (sessionId, callerNumber, destinationNumber, isActive, dtmfDigits,
 * recordingUrl, durationInSeconds) but has not been exercised against a live
 * account yet — there is no AFRICASTALKING_API_KEY configured. "Who
 * answered" is reported separately and more reliably by the browser client
 * itself via POST /api/outreach/voice/events the moment it fires
 * `callaccepted`, rather than inferred from this webhook.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''
  let params: Record<string, string> = {}

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData().catch(() => null)
    if (form) for (const [k, v] of Array.from(form.entries())) params[k] = String(v)
  } else {
    const body = await req.json().catch(() => ({}))
    params = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
  }

  const sessionId = params.sessionId || ''
  const callerNumber = params.callerNumber || params.destinationNumber || ''
  const dtmfDigits = params.dtmfDigits || ''
  const recordingUrl = params.recordingUrl || ''
  const isActive = params.isActive
  const normalizedPhone = normalizeKenyanPhone(callerNumber, { source: 'form_or_whatsapp' })

  const supabase = createOutreachAdminClient()

  // ── 1. DTMF: legacy AI-disclosure opt-out / transfer (calling-stub.ts flow) ──
  if (dtmfDigits === '9' && normalizedPhone) {
    await recordPermanentOptOut(supabase, {
      phoneE164: normalizedPhone,
      reason: 'voice_dtmf_opt_out',
      channel: 'all',
      source: 'africas_talking_voice_callback',
    })
    return xmlResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say playBeep="false">You have been permanently opted out from Batteriq automated calls. Goodbye.</Say></Response>`
    )
  }
  if (dtmfDigits === '1') {
    const transferNumber = process.env.OUTREACH_HUMAN_TRANSFER_PHONE || '+254716822014'
    return xmlResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say playBeep="false">Connecting you to a Batteriq Kenya human specialist now.</Say><Dial phoneNumbers="${transferNumber}" /></Response>`
    )
  }

  // ── 2. Recording completed (either the ring-group Dial's own recording, or voicemail) ──
  if (recordingUrl && sessionId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: call } = await (supabase.from('outreach_calls') as any)
      .update({ recording_url: recordingUrl })
      .eq('session_id', sessionId)
      .select('id, answered_by_admin_id, lead_id')
      .maybeSingle()

    if (call) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_call_events') as any).insert({
        call_id: call.id,
        event_type: 'recording_complete',
        payload: { recordingUrl },
      })
      // A recording with nobody having answered is a voicemail, not a recorded conversation.
      if (!call.answered_by_admin_id) {
        sendOutreachNotification({
          event: 'voicemail',
          body: `New voicemail from ${callerNumber || 'an unknown number'}`,
          url: '/outreach-admin#calling',
          id: call.id,
        }).catch(() => {})
      }
    }
    return xmlResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  }

  // ── 3. Call ended ──
  if (isActive === '0' && sessionId) {
    const duration = Number(params.durationInSeconds) || 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: call } = await (supabase.from('outreach_calls') as any)
      .select('id, answered_by_admin_id')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (call) {
      const wasAnswered = Boolean(call.answered_by_admin_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_calls') as any)
        .update({
          status: wasAnswered ? 'completed' : duration > 0 ? 'completed' : 'missed',
          duration_seconds: duration,
          ended_at: new Date().toISOString(),
        })
        .eq('id', call.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_call_events') as any).insert({
        call_id: call.id,
        event_type: 'call_ended',
        payload: params,
      })

      if (!wasAnswered && duration === 0) {
        sendOutreachNotification({
          event: 'missed_call',
          body: `Missed call from ${callerNumber || 'an unknown number'}`,
          url: '/outreach-admin#calling',
          id: call.id,
        }).catch(() => {})
      }
    }
    return xmlResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  }

  // ── 4. Fresh inbound call — dispatch the ring group ──
  if (sessionId) {
    const readiness = getVoiceReadiness()
    let leadId: string | null = null
    if (normalizedPhone) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lead } = await (supabase.from('outreach_leads') as any)
        .select('id')
        .eq('phone_e164', normalizedPhone)
        .maybeSingle()
      leadId = lead?.id ?? null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_calls') as any).insert({
      direction: 'inbound',
      from_number: callerNumber || null,
      to_number: params.destinationNumber || readiness.callerId || null,
      status: 'ringing',
      session_id: sessionId,
      lead_id: leadId,
    })

    if (!readiness.configured) {
      return xmlResponse(buildVoicemailXml())
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: available } = await (supabase.from('agent_presence') as any)
      .select('admin_user_id')
      .eq('status', 'available')

    const availableIds = (available ?? []).map((a: { admin_user_id: string }) => a.admin_user_id)

    await logOutreachEvent({
      module: 'voice',
      level: 'info',
      event: 'inbound_call_dispatched',
      message: `Inbound call from ${callerNumber || 'unknown'}: ringing ${availableIds.length} available agent(s)`,
      metadata: { sessionId, callerNumber, availableCount: availableIds.length },
    })

    sendOutreachNotification({
      event: 'incoming_call',
      body: `Incoming call from ${callerNumber || 'an unknown number'}`,
      url: '/outreach-admin#calling',
      id: sessionId,
    }).catch(() => {})

    if (availableIds.length === 0) {
      return xmlResponse(buildVoicemailXml())
    }

    return xmlResponse(buildRingGroupXml({ availableAdminUserIds: availableIds, callerId: readiness.callerId || '' }))
  }

  // Fallback — shouldn't normally be reached, but never leave AT without a valid response.
  const xml = buildAfricasTalkingVoiceXml({})
  return xmlResponse(xml)
}
