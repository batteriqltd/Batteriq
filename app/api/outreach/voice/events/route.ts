import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

/**
 * The browser WebRTC client knows who answered a call the instant its own
 * `callaccepted` event fires — far more reliable than trying to infer that
 * from Africa's Talking's server-side webhook, which has no clean "agent X
 * accepted the Dial" signal for WebRTC targets. The client reports it here.
 */
export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const sessionId = String(body.sessionId || '').trim()
  const event = String(body.event || '')
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const supabase = createOutreachAdminClient()

  if (event === 'answered') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: call } = await (supabase.from('outreach_calls') as any)
      .update({
        status: 'in_progress',
        answered_by_admin_id: session.id,
        answered_by_type: 'human',
        answered_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .is('answered_by_admin_id', null) // first to report wins — matches AT's own first-to-answer Dial behavior
      .select('id')
      .maybeSingle()

    if (call) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_call_events') as any).insert({
        call_id: call.id,
        event_type: 'answered',
        payload: { adminUserId: session.id, adminEmail: session.email },
      })
    }
    return NextResponse.json({ success: true })
  }

  if (event === 'call_started') {
    // Outbound call placed from the browser dialer — not yet in the DB
    // (the Africa's Talking webhook creates inbound rows; outbound rows are
    // created here since there's no "fresh call" webhook hit to hook for
    // a browser-initiated call).
    const toNumber = typeof body.toNumber === 'string' ? body.toNumber : null
    const leadId = typeof body.leadId === 'string' ? body.leadId : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_calls') as any).upsert(
      {
        session_id: sessionId,
        direction: 'outbound',
        to_number: toNumber,
        status: 'ringing',
        lead_id: leadId,
        answered_by_admin_id: session.id,
        answered_by_type: 'human',
      },
      { onConflict: 'session_id' }
    )
    return NextResponse.json({ success: true })
  }

  if (event === 'ended') {
    const notes = typeof body.notes === 'string' ? body.notes : null
    const outcome = typeof body.outcome === 'string' ? body.outcome : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: call } = await (supabase.from('outreach_calls') as any)
      .select('id, status, started_at')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (call && call.status !== 'completed') {
      const durationSeconds = Math.max(0, Math.round((Date.now() - new Date(call.started_at).getTime()) / 1000))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_calls') as any)
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          ...(notes ? { notes } : {}),
          ...(outcome ? { outcome } : {}),
        })
        .eq('id', call.id)
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unsupported event' }, { status: 400 })
}
