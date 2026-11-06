// POST /api/paystack/initialize
//
// Starts a Visa / Mastercard payment for an order that already exists in our
// database. The browser sends nothing but an order id — every amount is read from
// the stored order and the card fee is recomputed here, so a tampered client
// cannot change what the customer is charged.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PaystackError } from '@/lib/paystack'
import { isCardPaymentMethod } from '@/lib/cardFee'
import { resolveSiteUrl, startCardPayment } from '@/lib/paystackStart'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { allowed } = rateLimit(`paystack-initialize:${ip}`, 5, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many payment attempts. Please wait a minute.' }, { status: 429 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : ''
    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ error: 'A valid order id is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).single()
    if (error || !data) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = data as any
    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'This order has already been paid.' }, { status: 409 })
    }
    if (!isCardPaymentMethod(order.payment_method)) {
      return NextResponse.json({ error: 'This order is not a card payment.' }, { status: 400 })
    }
    if (!order.guest_email) {
      return NextResponse.json({ error: 'An email address is required to pay by card.' }, { status: 400 })
    }

    let started
    try {
      started = await startCardPayment(order, resolveSiteUrl(req.url))
    } catch (err) {
      if (err instanceof PaystackError && err.code === 'no_amount') {
        return NextResponse.json({ error: 'This order has no amount to charge.' }, { status: 400 })
      }
      if (err instanceof PaystackError && err.code === 'save_failed') {
        return NextResponse.json(
          { error: 'We could not start the card payment. Please try again or use M-Pesa.' },
          { status: 500 }
        )
      }
      throw err
    }
    const { authorizationUrl, reference, fee } = started

    return NextResponse.json({
      authorizationUrl,
      reference,
      subtotalKes: fee.subtotalKes,
      cardFeeKes: fee.feeKes,
      totalChargedKes: fee.totalChargedKes,
    })
  } catch (err) {
    console.error('[PAYSTACK] Initialize failed:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json(
      { error: 'Unable to start card payment. You can also pay with M-Pesa or contact us on WhatsApp 0716 822 014.' },
      { status: 502 }
    )
  }
}
