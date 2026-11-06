// POST /api/paystack/initialize
//
// Starts a Visa / Mastercard payment for an order that already exists in our
// database. The browser sends nothing but an order id — every amount is read from
// the stored order and the card fee is recomputed here, so a tampered client
// cannot change what the customer is charged.

import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializeTransaction, toSubunits } from '@/lib/paystack'
import { calculateCardFee } from '@/lib/cardFee'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function resolveSiteUrl(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  return configured && /^https?:\/\//.test(configured) ? configured : new URL(requestUrl).origin
}

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
    if (order.payment_method !== 'paystack_card') {
      return NextResponse.json({ error: 'This order is not a card payment.' }, { status: 400 })
    }
    if (!order.guest_email) {
      return NextResponse.json({ error: 'An email address is required to pay by card.' }, { status: 400 })
    }

    // ── Authoritative fee maths, server-side, from the stored order value ──
    const fee = calculateCardFee(order.total_kes)
    const amountSubunits = toSubunits(fee.totalChargedKes)
    if (amountSubunits <= 0) {
      return NextResponse.json({ error: 'This order has no amount to charge.' }, { status: 400 })
    }

    // Unique per attempt. The order number prefix lets a late result from an
    // earlier attempt still be traced back to this order.
    const reference = `${order.order_number}-${randomBytes(4).toString('hex')}`

    // Saved as pending BEFORE calling Paystack, so a webhook can never arrive for
    // a reference we have no record of.
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paystack_reference: reference,
        paystack_status_description: null,
        card_fee_rate: fee.rate,
        card_fee_kes: fee.feeKes,
        total_charged_kes: fee.totalChargedKes,
        payment_status: 'pending',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .eq('id', order.id)

    if (updateError) {
      console.error('[PAYSTACK] Could not save reference for', order.order_number, updateError.message)
      return NextResponse.json(
        { error: 'We could not start the card payment. Please try again or use M-Pesa.' },
        { status: 500 }
      )
    }

    const siteUrl = resolveSiteUrl(req.url)
    const paystack = await initializeTransaction({
      email: order.guest_email,
      amountSubunits,
      reference,
      callbackUrl: `${siteUrl}/payment/callback`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: order.user_id ?? null,
        cancel_action: `${siteUrl}/checkout?payment=cancelled`,
      },
    })

    console.log(
      `[PAYSTACK] Started ${reference} — charging KES ${fee.totalChargedKes} (order ${fee.subtotalKes} + fee ${fee.feeKes})`
    )

    return NextResponse.json({
      authorizationUrl: paystack.authorization_url,
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
