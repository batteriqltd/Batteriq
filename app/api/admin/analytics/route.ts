import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminDb = createAdminClient()
  const { data: adminUser } = await adminDb.from('admin_users').select('role').eq('id', user.id).single()
  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: totalRevenue },
    { data: ordersToday },
    { data: activeProducts },
    { data: recentOrders },
    { count: chatCount },
  ] = await Promise.all([
    adminDb.from('orders').select('total_kes').eq('payment_status', 'paid'),
    adminDb.from('orders').select('id').gte('created_at', todayStart),
    adminDb.from('products').select('id').eq('in_stock', true),
    adminDb.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
    adminDb.from('ai_chat_sessions').select('*', { count: 'exact', head: true }).gte('started_at', todayStart),
  ])

  const revenue = ((totalRevenue ?? []) as Array<{ total_kes: number }>).reduce((sum, o) => sum + o.total_kes, 0)

  return NextResponse.json({
    totalRevenue: revenue,
    ordersToday: ordersToday?.length ?? 0,
    activeProducts: activeProducts?.length ?? 0,
    chatSessionsToday: chatCount ?? 0,
    recentOrders: recentOrders ?? [],
  })
}
