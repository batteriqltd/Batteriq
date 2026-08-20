// Safety net for card payments whose IPN never landed.
//
//   POST /api/pesapal/reconcile                      → re-check every unpaid card order
//   POST /api/pesapal/reconcile { "orderId": "..." } → re-check one order
//
// Re-asks Pesapal for the authoritative status of each unpaid card order and
// applies it through the same idempotent sync the IPN uses, so a recovered
// order still gets its receipt email, admin push and paid badge.
//
// Admin session required. Safe to run repeatedly — orders already paid are
// skipped and nothing is re-sent.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'
import { syncPesapalTransaction } from '@/lib/pesapalSync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : null

    const supabase = createAdminClient()
    let query = supabase
      .from('orders')
      .select('id, order_number, payment_status, pesapal_order_tracking_id, pesapal_merchant_reference')
      .eq('payment_method', 'pesapal_card')
      .not('pesapal_order_tracking_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (orderId) {
      query = query.eq('id', orderId)
    } else {
      // Only orders that have not settled yet — never touch a paid order.
      query = query.neq('payment_status', 'paid')
    }

    const { data: orders, error } = await query
    if (error) throw new Error(error.message)

    const results: Array<Record<string, unknown>> = []

    for (const row of orders ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order = row as any
      try {
        const result = await syncPesapalTransaction({
          orderTrackingId: order.pesapal_order_tracking_id,
          merchantReference: order.pesapal_merchant_reference,
        })
        results.push({
          order_number: result.orderNumber,
          was: order.payment_status,
          now: result.status,
          newly_paid: result.applied,
          reference: result.confirmationCode,
        })
        if (result.applied) {
          console.log(`[PESAPAL RECONCILE] ${result.orderNumber} recovered → paid (${result.confirmationCode})`)
        }
      } catch (err) {
        results.push({
          order_number: order.order_number,
          was: order.payment_status,
          error: err instanceof Error ? err.message : 'sync failed',
        })
      }
    }

    return NextResponse.json({
      checked: results.length,
      recovered: results.filter(r => r.newly_paid).length,
      results,
    })
  } catch (err) {
    console.error('[PESAPAL RECONCILE] failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Reconcile failed.' }, { status: 500 })
  }
}
