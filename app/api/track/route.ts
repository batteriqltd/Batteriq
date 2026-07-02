import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public heartbeat endpoint. The site's VisitorTracker calls this every ~15s
// (and on every page change) so the admin Live Visitors page can show who is
// currently browsing and on which page. Writes go through the service-role
// client, so RLS on visitor_sessions stays locked to the server only.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: {
    visitorId?: string
    page?: string
    pageLabel?: string
    device?: string
    referrer?: string
    enteredAt?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const visitorId = (body.visitorId || '').slice(0, 80)
  if (!visitorId) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('visitor_sessions') as any).upsert(
      {
        visitor_id: visitorId,
        page: (body.page || '/').slice(0, 300),
        page_label: (body.pageLabel || 'Other').slice(0, 80),
        device: (body.device || 'Desktop').slice(0, 20),
        referrer: (body.referrer || 'Direct').slice(0, 40),
        entered_at: body.enteredAt || new Date().toISOString(),
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'visitor_id' }
    )
    return NextResponse.json({ ok: true })
  } catch {
    // Never let tracking break the visitor's experience
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
