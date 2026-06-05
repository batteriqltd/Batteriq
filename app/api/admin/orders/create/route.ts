import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'

function generateOrderNumber(): string {
  const now = new Date()
  const date = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 900000 + 100000).toString()
  return `BQ-${date}-${random}`
}

export async function POST(request: NextRequest) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { guestName, guestPhone, guestEmail, items, total, paymentMethod } = await request.json()

    if (!guestName?.trim() || !guestPhone?.trim() || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Name, phone, and at least one item are required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const orderNumber = generateOrderNumber()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error } = await (supabase.from('orders') as any)
      .insert({
        order_number: orderNumber,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        guest_email: guestEmail?.trim() || null,
        items,
        subtotal_kes: total,
        total_kes: total,
        payment_method: paymentMethod === 'cash' ? 'cod_cash' : 'mpesa_now',
        payment_status: paymentMethod === 'cash' ? 'paid' : 'pending',
        fulfillment_status: 'unfulfilled',
        order_source: 'walk_in',
      })
      .select('id, order_number')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
