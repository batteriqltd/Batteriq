// ─────────────────────────────────────────────────────────────────────────────
// Reconciles a Paystack transaction against our orders table.
//
// This is the single source of truth for "did the card payment go through?".
// The webhook and the browser callback page both call it, and it is safe to call
// any number of times for the same reference.
//
// It never trusts the notification or the URL: the transaction is always
// re-fetched from Paystack with the secret key before anything is written.
//
// Paystack data lives in the existing card columns from migration 005:
//   pesapal_merchant_reference — our reference for the latest attempt
//   pesapal_confirmation_code  — the reference that actually paid
//   pesapal_payment_method     — card brand
//   pesapal_status_description — latest status, or the mismatch flag
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { isCardPaymentMethod } from '@/lib/cardFee'
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
  pesapal_merchant_reference: string | null
  pesapal_status_description: string | null
  card_fee_kes: number | string | null
  total_charged_kes: number | string | null
}

const MISMATCH_PREFIX = 'AMOUNT MISMATCH'

async function findOrder(reference: string, transaction: PaystackTransaction): Promise<OrderRow | null> {
  const supabase = createAdminClient()

  const byReference = await supabase
    .from('orders')
    .select('*')
    .eq('pesapal_merchant_reference', reference)
    .maybeSingle()
  if (byReference.error) throw new PaystackError(`Order lookup failed: ${byReference.error.message}`)
  if (byReference.data) return byReference.data as unknown as OrderRow

  // A retry overwrites the stored reference, but an earlier attempt can still be
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
  if (!isCardPaymentMethod(order.payment_method)) {
    throw new PaystackError(`Order ${order.order_number} is not a card order.`, 'order_not_found')
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
    if (transaction.status === 'success' && order.pesapal_merchant_reference !== reference) {
      console.error(
        `[PAYSTACK] Possible double charge on ${order.order_number}: ${reference} succeeded, order was paid by ${order.pesapal_merchant_reference}`
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
    if (!order.pesapal_status_description?.startsWith(MISMATCH_PREFIX)) {
      const { error } = await supabase
        .from('orders')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ pesapal_status_description: description } as any)
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
        pesapal_merchant_reference: reference,
        pesapal_confirmation_code: reference,
        pesapal_payment_method: transaction.authorization?.brand?.trim() || null,
        pesapal_status_description: reason,
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
  if (order.pesapal_merchant_reference !== reference) {
    return { ...base, status: 'pending', applied: false }
  }

  const updates: Record<string, unknown> = { pesapal_status_description: reason }
  if (assessment === 'failed' || assessment === 'refunded') updates.payment_status = assessment

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('orders').update(updates as any).eq('id', order.id)
  if (error) throw new PaystackError(`Could not update order ${order.order_number}: ${error.message}`)

  return { ...base, status: assessment, applied: false }
}
