// POST /api/pesapal/checkout
//
// Starts a Visa / Mastercard payment for an order that already exists in our
// database. The browser sends nothing but an order id — every amount is read
// from the stored order and the 2% card fee is recomputed here, so a tampered
// client cannot change what the customer is charged.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitOrderRequest, PesapalError } from '@/lib/pesapal'
import { calculateCardFee } from '@/lib/cardFee'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Pesapal rejects a merchant reference it has already seen, so a retry after a
 *  failed attempt gets a short unique suffix. */
function buildMerchantReference(orderNumber: string, isRetry: boolean): string {
  if (!isRetry) return orderNumber
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `${orderNumber}-R${suffix}`
}

function resolveSiteUrl(requestUrl: string): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (configured && /^https?:\/\//.test(configured)) return configured
  // Local development fallback so the flow is testable before the env var is set.
  const origin = new URL(requestUrl).origin
  return /^https?:\/\//.test(origin) ? origin : null
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { allowed } = rateLimit(`pesapal-checkout:${ip}`, 5, 60 * 1000)
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
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }
    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'This order has already been paid.' }, { status: 409 })
    }
    if (order.payment_method !== 'pesapal_card') {
      return NextResponse.json(
        { error: 'This order is not a card payment.' },
        { status: 400 }
      )
    }

    const siteUrl = resolveSiteUrl(req.url)
    if (!siteUrl) {
      console.error('[PESAPAL] NEXT_PUBLIC_SITE_URL is not a valid absolute URL.')
      return NextResponse.json(
        { error: 'Card payments are temporarily unavailable. Please use M-Pesa or contact us.' },
        { status: 500 }
      )
    }

    // ── Authoritative fee maths, server-side, from the stored order value ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderRow = order as any
    const fee = calculateCardFee(orderRow.total_kes)

    const merchantReference = buildMerchantReference(
      orderRow.order_number,
      Boolean(orderRow.pesapal_order_tracking_id)
    )

    const address = (orderRow.delivery_address ?? {}) as Record<string, string>

    const pesapal = await submitOrderRequest({
      merchantReference,
      amountKes: fee.totalChargedKes,
      description: `Batteriq order ${orderRow.order_number}`,
      callbackUrl: `${siteUrl}/checkout/pesapal/callback`,
      cancellationUrl: `${siteUrl}/checkout?payment=cancelled`,
      customer: {
        name: orderRow.guest_name || 'Customer',
        email: orderRow.guest_email || '',
        phone: orderRow.guest_phone || '',
        street: address.street || '',
        city: address.city || '',
        county: address.county || '',
      },
    })

    // Store the tracking id BEFORE the customer leaves, so the IPN can always
    // be reconciled back to this order even if the browser never returns.
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pesapal_order_tracking_id: pesapal.order_tracking_id,
        pesapal_merchant_reference: merchantReference,
        card_fee_rate: fee.rate,
        card_fee_kes: fee.feeKes,
        total_charged_kes: fee.totalChargedKes,
        payment_status: 'pending',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .eq('id', orderRow.id)

    if (updateError) {
      console.error('[PESAPAL] Could not save tracking id for', orderRow.order_number, updateError.message)
      return NextResponse.json(
        { error: 'We could not start the card payment. Please try again or use M-Pesa.' },
        { status: 500 }
      )
    }

    console.log(
      `[PESAPAL] Checkout started for ${orderRow.order_number} — tracking ${pesapal.order_tracking_id}, charging KES ${fee.totalChargedKes} (order ${fee.subtotalKes} + fee ${fee.feeKes})`
    )

    return NextResponse.json({
      redirectUrl: pesapal.redirect_url,
      orderTrackingId: pesapal.order_tracking_id,
      subtotalKes: fee.subtotalKes,
      cardFeeKes: fee.feeKes,
      totalChargedKes: fee.totalChargedKes,
    })
  } catch (err) {
    const message = err instanceof PesapalError ? err.message : 'Unable to start card payment.'
    console.error('[PESAPAL] Checkout failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: `${message} You can also pay with M-Pesa or contact us on WhatsApp 0716 822 014.` },
      { status: 502 }
    )
  }
}
