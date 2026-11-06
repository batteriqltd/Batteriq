// POST /api/admin/paystack/payment-link
//
// Admin tool: enter an amount, get a Paystack card link to send to a client. It
// creates a real order so the webhook, the receipt and the admin orders list all
// work exactly as they do for a website order.

import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { CARD_PAYMENT_METHOD, parsePaymentLinkAmount, PAYMENT_LINK_MAX_KES, PAYMENT_LINK_MIN_KES } from '@/lib/cardFee'
import { resolveSiteUrl, startCardPayment } from '@/lib/paystackStart'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// A link has no client details, and Paystack requires an email. Receipts for these
// orders therefore go to the sales inbox.
const LINK_CLIENT = {
  guest_name: 'Payment link client',
  guest_email: 'sales@batteriq.com',
  guest_phone: '254716822014',
}

function orderNumber(): string {
  const now = new Date()
  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  return `BQ-${date}-${randomInt(100000, 1000000)}`
}

export async function POST(req: Request) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Outreach staff are limited to the Outreach section.
  if (session.role === 'outreach_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const amount = parsePaymentLinkAmount(body?.amount)
  if (amount === null) {
    return NextResponse.json(
      {
        error: `Enter a whole amount from KES ${PAYMENT_LINK_MIN_KES.toLocaleString('en-KE')} to ${PAYMENT_LINK_MAX_KES.toLocaleString('en-KE')}.`,
      },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...LINK_CLIENT,
      order_number: orderNumber(),
      items: [{ id: '', name: 'Card payment', brand: 'Batteriq', price_kes: amount, quantity: 1, image: null }],
      subtotal_kes: amount,
      delivery_fee_kes: 0,
      total_kes: amount,
      payment_method: CARD_PAYMENT_METHOD,
      payment_status: 'pending',
      fulfillment_status: 'unfulfilled',
      delivery_address: {
        street: 'To be confirmed with client',
        city: 'To be confirmed',
        county: 'To be confirmed',
        instructions: 'Created from an admin payment link. Confirm the client and delivery details.',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .select('id, order_number')
    .single()

  if (error || !data) {
    console.error('[PAYSTACK] Could not create payment-link order:', error?.message)
    return NextResponse.json({ error: 'Could not create the order. Please try again.' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = data as any

  try {
    const { authorizationUrl, reference, fee } = await startCardPayment(
      { id: order.id, order_number: order.order_number, guest_email: LINK_CLIENT.guest_email, total_kes: amount },
      resolveSiteUrl(req.url)
    )
    return NextResponse.json({
      authorizationUrl,
      reference,
      orderId: order.id,
      orderNumber: order.order_number,
      subtotalKes: fee.subtotalKes,
      cardFeeKes: fee.feeKes,
      totalChargedKes: fee.totalChargedKes,
    })
  } catch (err) {
    console.error('[PAYSTACK] Payment link failed:', err instanceof Error ? err.message : 'unknown error')
    // No link exists, so nobody can pay this order. Don't leave it in the orders list.
    await supabase.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Paystack could not create the link. Please try again.' }, { status: 502 })
  }
}
