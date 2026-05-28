import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { orderNumber, email } = await req.json()

    if (!orderNumber?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Order number and email are required.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        'order_number, fulfillment_status, payment_status, payment_method, items, total_kes, created_at, updated_at, guest_name, guest_email, delivery_address, mpesa_transaction_code'
      )
      .eq('order_number', orderNumber.trim().toUpperCase())
      .eq('guest_email', email.trim().toLowerCase())
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'No order found with that order number and email combination. Please check your details and try again.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      found: true,
      order: {
        orderNumber: order.order_number,
        fulfillmentStatus: order.fulfillment_status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        items: order.items,
        totalKes: order.total_kes,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        customerName: order.guest_name,
        deliveryAddress: order.delivery_address,
        mpesaRef: order.mpesa_transaction_code,
      },
    })
  } catch (err) {
    console.error('Track order error:', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
