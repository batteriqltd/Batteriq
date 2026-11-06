// ─────────────────────────────────────────────────────────────────────────────
// Reconciles a Paystack transaction against our orders table.
//
// This is the single source of truth for "did the card payment go through?".
// The webhook and the browser callback page both call it, and it is safe to call
// any number of times for the same reference.
//
// It never trusts the notification or the URL: the transaction is always
// re-fetched from Paystack with the secret key before anything is written.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { markOrderPaid, type PayableOrder } from '@/lib/orderPayments'
import { sendAdminPush } from '@/lib/push'
import {
  assessTransaction,
  PaystackError,
  readMetadata,
  toSubunits,
  verifyTransaction,
  type PaystackTransaction,
} from '@/lib/paystack'

export type PaystackSyncResult = {
  orderId: string
  orderNumber: string
  /** `review` — the money moved but did not match the order. A human must look. */
  status: 'paid' | 'failed' | 'refunded' | 'pending' | 'review'
  /** True when this call is the one that flipped the order to paid. */
  applied: boolean
  reason: string | null
}

type OrderRow = PayableOrder & {
  payment_status: string | null
  paystack_reference: string | null
  paystack_status_description: string | null
  card_fee_kes: number | string | null
  total_charged_kes: number | string | null
}

const MISMATCH_PREFIX = 'AMOUNT MISMATCH'

async function findOrder(reference: string, transaction: PaystackTransaction): Promise<OrderRow | null> {
  const supabase = createAdminClient()

  const byReference = await supabase
    .from('orders')
    .select('*')
    .eq('paystack_reference', reference)
    .maybeSingle()
  if (byReference.error) throw new PaystackError(`Order lookup failed: ${byReference.error.message}`)
  if (byReference.data) return byReference.data as unknown as OrderRow

  // A retry overwrites paystack_reference, but an earlier attempt can still be
  // paid in another tab. Those references embed the order number.
  const orderId = readMetadata(transaction.metadata).order_id
  if (typeof orderId !== 'string') return null

  const byId = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (byId.error) throw new PaystackError(`Order lookup failed: ${byId.error.message}`)

  const order = byId.data as unknown as OrderRow | null
  return order && reference.startsWith(`${order.order_number}-`) ? order : null
}

function alertAdmin(order: OrderRow, title: string, body: string) {
  return sendAdminPush({
    title,
    body,
    tag: 'payment',
    id: String(order.id),
    url: `/admin/orders/${order.id}`,
  }).catch(() => {})
}

export async function syncPaystackTransaction(reference: string): Promise<PaystackSyncResult> {
  const transaction = await verifyTransaction(reference)

  const order = await findOrder(reference, transaction)
  if (!order) {
    throw new PaystackError(`No Batteriq order matches Paystack reference ${reference}.`, 'order_not_found')
  }
  if (order.payment_method !== 'paystack_card') {
    throw new PaystackError(`Order ${order.order_number} is not a Paystack card order.`, 'order_not_found')
  }

  const expectedKes = Number(order.total_charged_kes) || 0
  const assessment = assessTransaction(transaction, {
    reference,
    amountSubunits: toSubunits(expectedKes),
  })
  const reason = transaction.gateway_response?.trim() || null
  const base = { orderId: order.id, orderNumber: order.order_number, reason }

  // An order that is already paid is never changed, whatever arrives next. A
  // second successful charge is real money though, so it gets flagged.
  if (order.payment_status === 'paid') {
    if (transaction.status === 'success' && order.paystack_reference !== reference) {
      console.error(
        `[PAYSTACK] Possible double charge on ${order.order_number}: ${reference} succeeded, order was paid by ${order.paystack_reference}`
      )
      await alertAdmin(order, '⚠️ Possible double card charge', `${order.order_number} · reference ${reference}`)
    }
    return { ...base, status: 'paid', applied: false }
  }

  const supabase = createAdminClient()

  if (assessment === 'mismatch') {
    const description =
      `${MISMATCH_PREFIX}: Paystack reported ${transaction.currency} ${Number(transaction.amount) / 100} ` +
      `for ${reference}, expected KES ${expectedKes}`
    console.error(`[PAYSTACK] ${order.order_number} NOT marked paid — ${description}`)

    // Callback refreshes and webhook retries must not repeat the alert.
    if (!order.paystack_status_description?.startsWith(MISMATCH_PREFIX)) {
      const { error } = await supabase
        .from('orders')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ paystack_status_description: description } as any)
        .eq('id', order.id)
      if (error) throw new PaystackError(`Could not flag order ${order.order_number}: ${error.message}`)
      await alertAdmin(order, '⚠️ Card payment needs review', `${order.order_number} · ${description}`)
    }
    return { ...base, status: 'review', applied: false, reason: description }
  }

  if (assessment === 'paid') {
    const { applied, error } = await markOrderPaid({
      order,
      reference,
      updates: {
        paystack_reference: reference,
        paystack_transaction_id: transaction.id != null ? String(transaction.id) : null,
        paystack_card_type: transaction.authorization?.brand?.trim() || null,
        paystack_status_description: reason,
      },
      amountKes: expectedKes,
      cardFeeKes: Number(order.card_fee_kes) || 0,
      pushTitle: '💳 Card Payment Received',
    })
    // Thrown so the webhook answers 500 and Paystack retries.
    if (error) throw new PaystackError(`Could not mark order ${order.order_number} paid: ${error}`)
    return { ...base, status: 'paid', applied }
  }

  // Only the customer's current attempt may change the order. A stale result from
  // an abandoned earlier attempt must not fail the live one.
  if (order.paystack_reference !== reference) {
    return { ...base, status: 'pending', applied: false }
  }

  const updates: Record<string, unknown> = { paystack_status_description: reason }
  if (assessment === 'failed' || assessment === 'refunded') updates.payment_status = assessment

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('orders').update(updates as any).eq('id', order.id)
  if (error) throw new PaystackError(`Could not update order ${order.order_number}: ${error.message}`)

  return { ...base, status: assessment, applied: false }
}
