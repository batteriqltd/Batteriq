import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Save (or refresh) the push subscription for the logged-in admin device.
export async function POST(request: NextRequest) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let sub: { endpoint?: string }
  try {
    sub = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!sub?.endpoint) {
    return NextResponse.json({ error: 'Missing subscription endpoint' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('push_subscriptions') as any).upsert(
      {
        admin_user_id: session.id ?? null,
        endpoint: sub.endpoint,
        subscription_json: sub,
      },
      { onConflict: 'endpoint' }
    )
    if (error) {
      console.error('[push/subscribe] save failed:', error.message)
      return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[push/subscribe] fatal:', err)
    return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 })
  }
}

// Remove a subscription (admin turned notifications off on this device).
export async function DELETE(request: NextRequest) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let sub: { endpoint?: string }
  try {
    sub = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!sub?.endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('push_subscriptions') as any).delete().eq('endpoint', sub.endpoint)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not remove subscription' }, { status: 500 })
  }
}
