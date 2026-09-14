import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'

export async function DELETE(_req: Request, { params }: { params: { orderId: string } }) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = params.orderId?.trim()
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  try {
    const supabase = createAdminClient()

    // Verify order exists before deleting (so 404 is honest)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase.from('orders') as any)
      .select('id')
      .eq('id', orderId)
      .maybeSingle()

    if (fetchError) {
      console.error('Order delete fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
    }
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from('orders') as any)
      .delete()
      .eq('id', orderId)

    if (deleteError) {
      console.error('Order delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Order DELETE error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
