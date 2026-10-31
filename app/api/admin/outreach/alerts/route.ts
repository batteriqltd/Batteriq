import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

// Matches the 48h push TTL in lib/push.ts — see app/api/admin/alerts/route.ts
// for the identical reasoning on the main-site alerts feed this mirrors.
const MAX_LOOKBACK_MS = 48 * 60 * 60 * 1000

export interface OutreachAlert {
  kind: 'whatsapp_message' | 'hot_lead' | 'batch_failed' | 'autopilot_error'
  id: string
  createdAt: string
  title: string
  subtitle: string
  url: string
}

interface InboundMessageRow {
  id: string
  body: string
  created_at: string
  outreach_conversations: { contact_name: string | null; phone_e164: string } | null
}

export async function GET(req: Request) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serverTime = new Date().toISOString()
  const since = new URL(req.url).searchParams.get('since')

  if (!since) return NextResponse.json({ serverTime, alerts: [] })

  const sinceDate = new Date(since)
  if (isNaN(sinceDate.getTime())) return NextResponse.json({ serverTime, alerts: [] })

  const floor = Date.now() - MAX_LOOKBACK_MS
  const from = new Date(Math.max(sinceDate.getTime(), floor)).toISOString()

  try {
    const supabase = createOutreachAdminClient()

    const [hotLeadsRes, logsRes, messagesRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_leads') as any)
        .select('id, business_name, updated_at')
        .eq('status', 'hot')
        .gt('updated_at', from)
        .order('updated_at', { ascending: true })
        .limit(25),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_logs') as any)
        .select('id, module, event, message, level, created_at')
        .in('level', ['warn', 'error'])
        .gt('created_at', from)
        .order('created_at', { ascending: true })
        .limit(25),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_messages') as any)
        .select('id, body, created_at, outreach_conversations(contact_name, phone_e164)')
        .eq('direction', 'inbound')
        .gt('created_at', from)
        .order('created_at', { ascending: true })
        .limit(25),
    ])

    const alerts: OutreachAlert[] = []

    for (const m of (messagesRes.data ?? []) as InboundMessageRow[]) {
      const who = m.outreach_conversations?.contact_name || m.outreach_conversations?.phone_e164 || 'A client'
      alerts.push({
        kind: 'whatsapp_message',
        id: String(m.id),
        createdAt: m.created_at,
        title: 'New WhatsApp message',
        subtitle: `${who}: ${String(m.body ?? '').slice(0, 100)}`,
        url: '/outreach-admin#whatsapp',
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const l of (hotLeadsRes.data ?? []) as any[]) {
      alerts.push({
        kind: 'hot_lead',
        id: String(l.id),
        createdAt: l.updated_at,
        title: 'Hot lead',
        subtitle: l.business_name,
        url: '/outreach-admin#leads',
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const log of (logsRes.data ?? []) as any[]) {
      const kind = log.module === 'email_campaign' && log.event === 'campaign_run_completed'
        ? 'batch_failed'
        : 'autopilot_error'
      alerts.push({
        kind,
        id: String(log.id),
        createdAt: log.created_at,
        title: kind === 'batch_failed' ? 'Outreach batch had failures' : 'Autopilot error',
        subtitle: String(log.message ?? '').slice(0, 140),
        url: kind === 'batch_failed' ? '/outreach-admin#sent' : '/outreach-admin#logs',
      })
    }

    alerts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return NextResponse.json({ serverTime, alerts })
  } catch (err) {
    console.error('[OUTREACH ALERTS] Exception:', err)
    return NextResponse.json({ serverTime: from, alerts: [] })
  }
}
