import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// CRITICAL: force-dynamic prevents Next.js from caching this route.
// Without it, the checkout polling gets stale "pending" responses
// even after the M-Pesa callback marks the order as paid.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('orders')
    .select('payment_status, fulfillment_status, order_number, mpesa_failure_reason, mpesa_transaction_code')
    .eq('id', params.orderId)
    .single()

  return NextResponse.json(
    {
      paymentStatus:     data?.payment_status     ?? 'pending',
      fulfillmentStatus: data?.fulfillment_status ?? 'unfulfilled',
      orderNumber:       data?.order_number       ?? null,
      failureReason:     (data as Record<string, unknown> | null)?.mpesa_failure_reason as string | null ?? null,
      mpesaCode:         (data as Record<string, unknown> | null)?.mpesa_transaction_code as string | null ?? null,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    }
  )
}
