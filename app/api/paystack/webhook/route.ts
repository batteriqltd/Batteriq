// POST /api/paystack/webhook — the server-to-server source of truth for card
// payments.
//
// The signature proves the event came from Paystack. Even so, nothing in the body
// is trusted beyond the reference: the transaction is re-verified with Paystack
// and checked against the stored order (see lib/paystackSync.ts). Processing is
// idempotent, so Paystack's retries are safe.

import { NextResponse } from 'next/server'
import { PaystackError, verifyWebhookSignature } from '@/lib/paystack'
import { syncPaystackTransaction } from '@/lib/paystackSync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: Request) {
  // The raw text, not req.json(): re-serialising the JSON breaks the signature.
  const rawBody = await req.text()

  const authentic = verifyWebhookSignature({
    rawBody,
    signedHeader: req.headers.get('paystack-signature'),
    legacyHeader: req.headers.get('x-paystack-signature'),
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
    secretKey: process.env.PAYSTACK_SECRET_KEY,
  })
  if (!authentic) {
    console.error('[PAYSTACK WEBHOOK] Rejected event with an invalid signature.')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    console.error('[PAYSTACK WEBHOOK] Signed event was not valid JSON.')
    return NextResponse.json({ received: true })
  }

  if (event?.event !== 'charge.success') return NextResponse.json({ received: true })

  const reference = typeof event?.data?.reference === 'string' ? event.data.reference : ''
  if (!reference) {
    console.error('[PAYSTACK WEBHOOK] charge.success without a reference — ignoring.')
    return NextResponse.json({ received: true })
  }

  try {
    const result = await syncPaystackTransaction(reference)
    console.log(
      `[PAYSTACK WEBHOOK] ${result.orderNumber} → ${result.status}${result.applied ? ' (newly paid)' : ''}`
    )
    return NextResponse.json({ received: true })
  } catch (err) {
    // A charge from outside this checkout (e.g. a Paystack payment page) will
    // never match an order, so retrying it for 72 hours would achieve nothing.
    if (err instanceof PaystackError && err.code === 'order_not_found') {
      console.error('[PAYSTACK WEBHOOK]', err.message)
      return NextResponse.json({ received: true })
    }
    // A 500 tells Paystack to retry, which is what we want for a transient fault.
    console.error('[PAYSTACK WEBHOOK] Processing failed:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
