// ─────────────────────────────────────────────────────────────────────────────
// Reconciles a Pesapal transaction against our orders table.
//
// This is the single source of truth for "did the card payment go through?".
// Both the server-to-server IPN listener and the browser callback page call it,
// and it is safe to call any number of times for the same transaction.
//
// It never trusts the notification body: the status is always re-fetched from
// Pesapal with GetTransactionStatus before anything is written.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin'
import { markOrderPaid, type PayableOrder } from '@/lib/orderPayments'
import { getTransactionStatus, mapPesapalStatus, PesapalError } from '@/lib/pesapal'

export type PesapalSyncResult = {
  orderId: string
  orderNumber: string
  /** Our payment_status after this sync. */
  status: 'paid' | 'failed' | 'refunded' | 'pending'
  /** True when this call is the one that flipped the order to paid. */
  applied: boolean
  confirmationCode: string | null
  statusDescription: string | null
}

type OrderRow = PayableOrder & {
  payment_status: string | null
  pesapal_order_tracking_id: string | null
  pesapal_merchant_reference: string | null
  card_fee_kes: number | string | null
  total_charged_kes: number | string | null
}

/** Retry attempts append a short suffix to keep the Pesapal merchant reference
 *  unique, e.g. BQ-20260820-123456-R4F2A. Strip it to recover the order number. */
function baseOrderNumber(reference: string): string {
  return reference.replace(/-R[0-9A-Z]{3,8}$/i, '')
}

async function findOrder(
  orderTrackingId: string,
  merchantReference: string | null
): Promise<OrderRow | null> {
  const supabase = createAdminClient()
  const columns = '*'

  // 1. Tracking id is the strongest link — we store it before redirecting.
  const byTracking = await supabase
    .from('orders')
    .select(columns)
    .eq('pesapal_order_tracking_id', orderTrackingId)
    .maybeSingle()
  if (byTracking.data) return byTracking.data as unknown as OrderRow

  if (!merchantReference) return null

  // 2. The exact reference we submitted for this attempt.
  const byReference = await supabase
    .from('orders')
    .select(columns)
    .eq('pesapal_merchant_reference', merchantReference)
    .maybeSingle()
  if (byReference.data) return byReference.data as unknown as OrderRow

  // 3. Fall back to the order number the reference was derived from.
  const byNumber = await supabase
    .from('orders')
    .select(columns)
    .eq('order_number', baseOrderNumber(merchantReference))
    .maybeSingle()
  return (byNumber.data as unknown as OrderRow) ?? null
}

export async function syncPesapalTransaction(params: {
  orderTrackingId: string
  merchantReference?: string | null
}): Promise<PesapalSyncResult> {
  const orderTrackingId = params.orderTrackingId?.trim()
  if (!orderTrackingId) throw new PesapalError('Missing Pesapal OrderTrackingId.')

  // Authoritative status straight from Pesapal — the notification body is only
  // ever used to work out WHICH transaction to look up.
  const transaction = await getTransactionStatus(orderTrackingId)
  const merchantReference =
    params.merchantReference?.trim() || transaction.merchant_reference?.trim() || null

  const order = await findOrder(orderTrackingId, merchantReference)
  if (!order) {
    throw new PesapalError(
      `No Batteriq order matches Pesapal transaction ${orderTrackingId} (reference ${merchantReference ?? 'unknown'}).`
    )
  }

  const status = mapPesapalStatus(transaction)
  const confirmationCode = transaction.confirmation_code?.trim() || null
  const statusDescription =
    transaction.payment_status_description?.trim() ||
    transaction.description?.trim() ||
    null

  // Written on every sync so support can see the latest provider state even
  // while a payment is still in flight.
  const providerFields: Record<string, unknown> = {
    pesapal_order_tracking_id: orderTrackingId,
    pesapal_merchant_reference: merchantReference ?? order.pesapal_merchant_reference,
    pesapal_payment_method: transaction.payment_method?.trim() || null,
    pesapal_confirmation_code: confirmationCode,
    pesapal_status_description: statusDescription,
  }

  const supabase = createAdminClient()

  if (status === 'paid') {
    const expectedCharge = Number(order.total_charged_kes) || Number(order.total_kes) || 0
    const reportedAmount = Number(transaction.amount)
    if (Number.isFinite(reportedAmount) && Math.abs(reportedAmount - expectedCharge) > 1) {
      // The money has moved, so the order is still paid — but flag the mismatch
      // loudly for accounting instead of silently accepting it.
      console.error(
        `[PESAPAL] Amount mismatch on ${order.order_number}: expected KES ${expectedCharge}, Pesapal reported KES ${reportedAmount}`
      )
      providerFields.pesapal_status_description =
        `${statusDescription ?? 'Completed'} — AMOUNT MISMATCH: charged ${reportedAmount}, expected ${expectedCharge}`
    }

    const { applied } = await markOrderPaid({
      order,
      reference: confirmationCode,
      updates: providerFields,
      amountKes: expectedCharge,
      cardFeeKes: Number(order.card_fee_kes) || 0,
      pushTitle: '💳 Card Payment Received',
    })

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: 'paid',
      applied,
      confirmationCode,
      statusDescription,
    }
  }

  // Never downgrade an order that is already paid — a late or duplicated
  // notification for an abandoned earlier attempt must not undo a real payment.
  if (order.payment_status === 'paid') {
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: 'paid',
      applied: false,
      confirmationCode,
      statusDescription,
    }
  }

  // Only the customer's current attempt may record a failure. A stale IPN from
  // a cancelled earlier attempt is recorded but must not fail the live one.
  const isCurrentAttempt =
    !order.pesapal_order_tracking_id || order.pesapal_order_tracking_id === orderTrackingId

  const updates: Record<string, unknown> = { ...providerFields }
  if ((status === 'failed' || status === 'refunded') && isCurrentAttempt) {
    updates.payment_status = status
  }

  const { error } = await supabase.from('orders').update(updates).eq('id', order.id)
  if (error) {
    console.error('[PESAPAL] Failed to update order', order.order_number, error.message)
    throw new PesapalError(`Could not update order ${order.order_number}.`)
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    status: updates.payment_status ? status : 'pending',
    applied: false,
    confirmationCode,
    statusDescription,
  }
}
