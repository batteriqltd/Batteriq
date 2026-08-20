// ─────────────────────────────────────────────────────────────────────────────
// "Mark this order as paid" — used by the Pesapal card flow.
//
// Mirrors, step for step, what app/api/mpesa/callback/route.ts already does on
// a successful M-Pesa payment: same payment_status update, same admin push,
// same confirmation email + PDF receipt. That is deliberate — it keeps the
// admin dashboard and the customer's receipt identical no matter how they paid.
//
// The M-Pesa callback keeps its own inline copy on purpose: that flow is live
// and working, and is not worth the regression risk of a refactor. If you ever
// change the paid-order side effects, change them in BOTH places.
//
// The update here is idempotent: it only matches rows that are not already
// paid, so a duplicated IPN cannot double-send receipts.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { emailPaymentConfirmed } from '@/lib/email'
import { sendAdminPush } from '@/lib/push'

export type PayableOrder = {
  id: string
  order_number: string
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  items?: unknown
  total_kes: number | string
  payment_method: string
  delivery_address?: unknown
  created_at: string
}

export type MarkOrderPaidOptions = {
  order: PayableOrder
  /** Provider reference shown to the customer (M-Pesa receipt or Pesapal confirmation code). */
  reference?: string | null
  /** Extra columns to write alongside payment_status, e.g. provider tracking ids. */
  updates?: Record<string, unknown>
  /** Amount actually collected. Defaults to the order total (M-Pesa behaviour). */
  amountKes?: number
  /** Pass-through card fee, for the receipt breakdown. Card orders only. */
  cardFeeKes?: number
  /** Push notification title. Defaults to the existing M-Pesa wording. */
  pushTitle?: string
}

/**
 * Returns `{ applied: true }` when this call is the one that flipped the order
 * to paid (emails and push were sent), or `{ applied: false }` when the order
 * was already paid and nothing was re-sent.
 */
export async function markOrderPaid(
  options: MarkOrderPaidOptions
): Promise<{ applied: boolean; error?: string }> {
  const { order, reference, updates, amountKes, cardFeeKes, pushTitle } = options
  const supabase = createAdminClient()

  const payload: Record<string, unknown> = {
    payment_status: 'paid',
    ...(updates ?? {}),
  }

  // Idempotency guard — only a row that is not yet paid is matched. The
  // `payment_status.is.null` arm covers legacy rows where the column is null,
  // which a bare `neq` would silently skip.
  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', order.id)
    .or('payment_status.is.null,payment_status.neq.paid')
    .select('id')

  if (error) {
    console.error('[PAID] Failed to mark order paid:', order.order_number, error.message)
    return { applied: false, error: error.message }
  }

  if (!data || data.length === 0) {
    console.log('[PAID] Order already marked paid — skipping duplicate notifications:', order.order_number)
    return { applied: false }
  }

  const collected = Number(amountKes ?? order.total_kes) || 0

  // Instant push alert to admin devices — fire-and-forget
  sendAdminPush({
    title: pushTitle ?? '💰 Payment Received',
    body: `KES ${collected.toLocaleString('en-KE')} · ${order.guest_name ?? 'Customer'}`,
    tag: 'payment',
    id: String(order.id),
    url: `/admin/orders/${order.id}`,
  }).catch(() => {})

  // Send payment confirmation emails — non-blocking
  emailPaymentConfirmed({
    order_number: order.order_number,
    guest_name: order.guest_name ?? '',
    guest_email: order.guest_email ?? '',
    guest_phone: order.guest_phone ?? '',
    items: (order.items as Array<{ brand?: string; name: string; quantity: number; price_kes: number }>) ?? [],
    total_kes: Number(order.total_kes) || 0,
    payment_method: order.payment_method,
    mpesa_transaction_code: reference ?? undefined,
    card_fee_kes: cardFeeKes,
    total_charged_kes: amountKes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delivery_address: (order.delivery_address ?? {}) as any,
    created_at: order.created_at,
  }).catch(e => console.error('Payment email failed:', e))

  return { applied: true }
}
