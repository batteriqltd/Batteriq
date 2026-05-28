import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, payment_status, fulfillment_status, total_kes, created_at')
    .eq('id', params.orderId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
