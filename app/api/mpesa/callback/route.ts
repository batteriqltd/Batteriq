import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractMpesaReceiptNumber } from '@/lib/mpesa'
import { emailPaymentConfirmed } from '@/lib/email'
import { sendAdminPush } from '@/lib/push'
import type { STKCallbackBody } from '@/lib/mpesa'

export async function POST(request: NextRequest) {
  let body: STKCallbackBody
  try {
    body = await request.json()
  } catch {
    console.error('[Callback] Invalid JSON body')
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  console.log('[Callback] Received:', JSON.stringify(body?.Body?.stkCallback ?? body))

  const callback = body?.Body?.stkCallback
  if (!callback) {
    console.error('[Callback] Missing stkCallback in body')
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const { CheckoutRequestID, ResultCode, ResultDesc } = callback
  console.log('[Callback] CheckoutRequestID:', CheckoutRequestID, '| ResultCode:', ResultCode, '| ResultDesc:', ResultDesc)

  const supabase = createAdminClient()

  // Find order by checkout request ID
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('mpesa_checkout_request_id', CheckoutRequestID)
    .single()

  if (error || !order) {
    console.error('[Callback] Order not found for CheckoutRequestID:', CheckoutRequestID)
    // Acknowledge to Safaricom regardless
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  if (ResultCode === 0) {
    const receiptNumber = extractMpesaReceiptNumber(body)
    console.log('[Callback] Payment successful — receipt:', receiptNumber, '| order:', order.id)

    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        mpesa_transaction_code: receiptNumber,
      })
      .eq('id', order.id)

    // Instant push alert to admin devices — fire-and-forget
    sendAdminPush({
      title: '💰 Payment Received',
      body: `KES ${Number(order.total_kes).toLocaleString('en-KE')} · ${order.guest_name ?? 'Customer'}`,
      tag: 'payment',
      url: `/admin/orders/${order.id}`,
    }).catch(() => {})

    // Send payment confirmation emails — non-blocking
    emailPaymentConfirmed({
      order_number: order.order_number,
      guest_name: order.guest_name ?? '',
      guest_email: order.guest_email ?? '',
      guest_phone: order.guest_phone ?? '',
      items: (order.items as Array<{ brand?: string; name: string; quantity: number; price_kes: number }>) ?? [],
      total_kes: order.total_kes,
      payment_method: order.payment_method,
      mpesa_transaction_code: receiptNumber ?? undefined,
      delivery_address: order.delivery_address ?? {},
      created_at: order.created_at,
    }).catch(e => console.error('Payment email failed:', e))
  } else {
    console.log('[Callback] Payment failed/cancelled for order:', order.id, '| Code:', ResultCode, '| Reason:', ResultDesc)

    const failureMessages: Record<number, string> = {
      1:    'The transaction was declined. Please try again.',
      17:   'M-Pesa system is busy. Please wait a moment and try again.',
      26:   'M-Pesa system is currently busy. Please try again in a few minutes.',
      1001: 'Wrong M-Pesa PIN entered. Please try again with the correct PIN.',
      1019: 'M-Pesa transaction timed out. The request expired.',
      1025: 'Wrong PIN entered too many times. Your M-Pesa is temporarily locked.',
      1032: 'Transaction cancelled by user.',
      2001: 'Wrong PIN entered. Please try again.',
    }
    const userMessage = failureMessages[ResultCode] ?? `Payment failed: ${ResultDesc}`

    await supabase
      .from('orders')
      .update({ payment_status: 'failed', mpesa_failure_reason: userMessage })
      .eq('id', order.id)

    console.log('[Callback] Order marked failed:', userMessage)
  }

  // ALWAYS return this to Safaricom
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
