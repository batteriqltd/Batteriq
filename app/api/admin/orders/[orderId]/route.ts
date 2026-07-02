import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Permanently delete an order (used to clean up test orders).
export async function DELETE(_req: Request, { params }: { params: { orderId: string } }) {
  if (!getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!params.orderId) {
    return NextResponse.json({ error: 'Missing order id' }, { status: 400 })
  }
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any).delete().eq('id', params.orderId)
    if (error) {
      console.error('[orders/delete] failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[orders/delete] fatal:', err)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
