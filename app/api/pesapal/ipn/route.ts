// Pesapal IPN listener — the server-to-server source of truth for card payments.
//
// Pesapal calls this with OrderTrackingId + OrderMerchantReference. We ignore
// any status in the notification and re-fetch it from Pesapal before touching
// the order (see lib/pesapalSync.ts). Processing is idempotent, so Pesapal may
// safely retry.
//
// Register this URL once with POST /api/pesapal/register-ipn and put the
// returned id in PESAPAL_IPN_ID.

import { NextResponse } from 'next/server'
import { syncPesapalTransaction } from '@/lib/pesapalSync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Notification = {
  orderTrackingId: string | null
  merchantReference: string | null
  notificationType: string
}

function readQuery(url: URL): Notification {
  return {
    orderTrackingId: url.searchParams.get('OrderTrackingId'),
    merchantReference: url.searchParams.get('OrderMerchantReference'),
    notificationType: url.searchParams.get('OrderNotificationType') || 'IPNCHANGE',
  }
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url)
  let notification = readQuery(url)

  // Pesapal can be configured for GET or POST; accept both shapes.
  if (request.method === 'POST' && !notification.orderTrackingId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json().catch(() => ({}))
    notification = {
      orderTrackingId: body?.OrderTrackingId ?? body?.orderTrackingId ?? null,
      merchantReference: body?.OrderMerchantReference ?? body?.orderMerchantReference ?? null,
      notificationType: body?.OrderNotificationType ?? notification.notificationType,
    }
  }

  const { orderTrackingId, merchantReference, notificationType } = notification

  // Pesapal expects this envelope back on every notification.
  const ack = (status: 200 | 500) => ({
    orderNotificationType: notificationType,
    orderTrackingId,
    orderMerchantReference: merchantReference,
    status,
  })

  if (!orderTrackingId) {
    console.error('[PESAPAL IPN] Notification without an OrderTrackingId — ignoring.')
    return NextResponse.json(ack(500), { status: 500 })
  }

  try {
    const result = await syncPesapalTransaction({ orderTrackingId, merchantReference })
    console.log(
      `[PESAPAL IPN] ${result.orderNumber} → ${result.status}${result.applied ? ' (newly paid)' : ''}`
    )
    return NextResponse.json(ack(200), { status: 200 })
  } catch (err) {
    // A 500 tells Pesapal to retry, which is what we want for a transient fault.
    console.error('[PESAPAL IPN] Processing failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(ack(500), { status: 500 })
  }
}

export const GET = handle
export const POST = handle
