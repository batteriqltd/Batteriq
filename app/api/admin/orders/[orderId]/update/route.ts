import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailStatusUpdate } from '@/lib/email'

export async function PATCH(req: Request, { params }: { params: { orderId: string } }) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { fulfillment_status, payment_status } = body

    const updateData: Record<string, string> = {}
    if (fulfillment_status) updateData.fulfillment_status = fulfillment_status
    if (payment_status) updateData.payment_status = payment_status

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabase.from('orders') as any)
      .update(updateData)
      .eq('id', params.orderId)
      .select('*')
      .single()

    if (error || !updated) {
      console.error('Order update error:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 400 })
    }

    if (fulfillment_status && ['processing', 'shipped', 'delivered'].includes(fulfillment_status)) {
      emailStatusUpdate({
        order_number: updated.order_number,
        guest_name: updated.guest_name ?? '',
        guest_email: updated.guest_email ?? '',
        items: updated.items ?? [],
        total_kes: updated.total_kes,
        fulfillment_status,
        delivery_address: updated.delivery_address,
      }).catch((e: unknown) => console.error('Status email failed:', e))
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
