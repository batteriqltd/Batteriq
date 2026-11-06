// Starts a Paystack card payment for an order that already exists in our database.
// Shared by the customer checkout and the admin payment-link tool, so both charge
// the same way: the fee is computed here from the stored order value, and the
// reference is saved before Paystack is called, so a webhook can never arrive for
// a reference we have no record of.

import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializeTransaction, PaystackError, toSubunits } from '@/lib/paystack'
import { calculateCardFee, type CardFeeBreakdown } from '@/lib/cardFee'

export type StartableOrder = {
  id: string
  order_number: string
  guest_email: string
  total_kes: number | string
  user_id?: string | null
}

export function resolveSiteUrl(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  return configured && /^https?:\/\//.test(configured) ? configured : new URL(requestUrl).origin
}

export async function startCardPayment(
  order: StartableOrder,
  siteUrl: string
): Promise<{ authorizationUrl: string; reference: string; fee: CardFeeBreakdown }> {
  const fee = calculateCardFee(order.total_kes)
  const amountSubunits = toSubunits(fee.totalChargedKes)
  if (amountSubunits <= 0) {
    throw new PaystackError('This order has no amount to charge.', 'no_amount')
  }

  // Unique per attempt. The order number prefix lets a late result from an
  // earlier attempt still be traced back to this order.
  const reference = `${order.order_number}-${randomBytes(4).toString('hex')}`

  const { error } = await createAdminClient()
    .from('orders')
    .update({
      // Existing card columns — see lib/paystackSync.ts.
      pesapal_merchant_reference: reference,
      pesapal_status_description: null,
      card_fee_rate: fee.rate,
      card_fee_kes: fee.feeKes,
      total_charged_kes: fee.totalChargedKes,
      payment_status: 'pending',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .eq('id', order.id)

  if (error) {
    console.error('[PAYSTACK] Could not save reference for', order.order_number, error.message)
    throw new PaystackError('Could not save the payment reference.', 'save_failed')
  }

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

  return { authorizationUrl: paystack.authorization_url, reference, fee }
}
