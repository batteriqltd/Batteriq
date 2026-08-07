import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// How far back a stale cursor is allowed to reach. A laptop waking from sleep
// should not dump a whole day of orders on screen at once.
const MAX_LOOKBACK_MS = 6 * 60 * 60 * 1000

export interface AdminAlert {
  kind: 'order' | 'message'
  id: string
  createdAt: string
  title: string
  subtitle: string
  url: string
  // Order-only extras — the popup renders these when present
  orderNumber?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  totalKes?: number
  paymentMethod?: string
  paymentStatus?: string
  itemCount?: number
  items?: { name: string; quantity: number }[]
}

export async function GET(req: Request) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Captured BEFORE the queries run. Anything inserted after this instant is
  // simply picked up by the next poll, so advancing the cursor to it is safe.
  const serverTime = new Date().toISOString()

  const since = new URL(req.url).searchParams.get('since')

  // First call of a session: hand back a cursor and nothing else, so a freshly
  // opened tab never replays orders the admin has already dealt with.
  if (!since) return NextResponse.json({ serverTime, alerts: [] })

  const sinceDate = new Date(since)
  if (isNaN(sinceDate.getTime())) return NextResponse.json({ serverTime, alerts: [] })

  const floor = Date.now() - MAX_LOOKBACK_MS
  const from = new Date(Math.max(sinceDate.getTime(), floor)).toISOString()

  try {
    const supabase = createAdminClient()

    const [ordersRes, messagesRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, guest_name, guest_phone, guest_email, items, total_kes, payment_method, payment_status, created_at')
        .gt('created_at', from)
        .order('created_at', { ascending: true })
        .limit(25),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('contact_submissions') as any)
        .select('id, first_name, last_name, email, phone, message, created_at')
        .gt('created_at', from)
        .order('created_at', { ascending: true })
        .limit(25),
    ])

    const alerts: AdminAlert[] = []

    if (ordersRes.error) {
      console.error('[ALERTS] orders query failed:', ordersRes.error.message)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const o of (ordersRes.data ?? []) as any[]) {
        const items = Array.isArray(o.items) ? o.items : []
        alerts.push({
          kind: 'order',
          id: String(o.id),
          createdAt: o.created_at,
          title: 'New Order Received',
          subtitle: `${o.guest_name ?? 'Customer'} · KES ${Number(o.total_kes || 0).toLocaleString('en-KE')}`,
          url: `/admin/orders/${o.id}`,
          orderNumber: o.order_number ?? undefined,
          customerName: o.guest_name ?? 'Customer',
          customerPhone: o.guest_phone ?? undefined,
          customerEmail: o.guest_email ?? undefined,
          totalKes: Number(o.total_kes || 0),
          paymentMethod: o.payment_method ?? undefined,
          paymentStatus: o.payment_status ?? undefined,
          itemCount: items.reduce((sum: number, it: { quantity?: number }) => sum + (Number(it?.quantity) || 1), 0),
          items: items.slice(0, 4).map((it: { name?: string; quantity?: number }) => ({
            name: String(it?.name ?? 'Product'),
            quantity: Number(it?.quantity) || 1,
          })),
        })
      }
    }

    if (messagesRes.error) {
      console.error('[ALERTS] messages query failed:', messagesRes.error.message)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const m of (messagesRes.data ?? []) as any[]) {
        const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'Website visitor'
        alerts.push({
          kind: 'message',
          id: String(m.id),
          createdAt: m.created_at,
          title: `New Message from ${name}`,
          subtitle: String(m.message ?? '').slice(0, 120),
          url: '/admin/messages',
          customerName: name,
          customerPhone: m.phone ?? undefined,
          customerEmail: m.email ?? undefined,
        })
      }
    }

    alerts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return NextResponse.json({ serverTime, alerts })
  } catch (err) {
    console.error('[ALERTS] Exception:', err)
    // Returning the cursor unchanged means the next poll retries the same
    // window rather than silently skipping past orders.
    return NextResponse.json({ serverTime: from, alerts: [] })
  }
}
