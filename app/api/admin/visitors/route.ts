import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'

// Admin-only. Returns every visitor session seen in the last 60 seconds plus
// today's order count. The admin Live Visitors page polls this every few
// seconds. Reads go through the service-role client (bypasses RLS).
export const dynamic = 'force-dynamic'

const ACTIVE_WINDOW_MS = 60_000

export async function GET() {
  if (!getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString()

  // Active visitor sessions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase.from('visitor_sessions') as any)
    .select('visitor_id, page, page_label, device, referrer, entered_at, last_seen')
    .gte('last_seen', cutoff)
    .order('last_seen', { ascending: false })

  const visitors = (rows ?? []).map((r: {
    visitor_id: string
    page: string | null
    page_label: string | null
    device: string | null
    referrer: string | null
    entered_at: string | null
    last_seen: string | null
  }) => ({
    visitorId: r.visitor_id,
    page: r.page ?? '/',
    pageLabel: r.page_label ?? 'Other',
    device: r.device ?? 'Desktop',
    referrer: r.referrer ?? 'Direct',
    enteredAt: r.entered_at ?? r.last_seen ?? new Date().toISOString(),
    lastSeen: r.last_seen ?? new Date().toISOString(),
  }))

  // Orders placed today (server-side, service role)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: ordersToday } = await (supabase.from('orders') as any)
    .select('id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  return NextResponse.json({ visitors, ordersToday: ordersToday ?? 0 })
}
