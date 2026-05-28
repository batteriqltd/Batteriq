import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('orders')
    .select('payment_status, fulfillment_status, order_number, mpesa_failure_reason')
    .eq('id', params.orderId)
    .single()
  return NextResponse.json({
    paymentStatus:    data?.payment_status    ?? 'pending',
    fulfillmentStatus: data?.fulfillment_status ?? 'unfulfilled',
    orderNumber:      data?.order_number      ?? null,
    failureReason:    (data as Record<string, unknown> | null)?.mpesa_failure_reason as string | null ?? null,
  })
}
