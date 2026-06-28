import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

export async function GET(
  _req: Request,
  { params }: { params: { orderId: string } }
) {
  if (!getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error } = await (supabase.from('orders') as any)
    .select('*')
    .eq('id', params.orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const orderRef = order.order_number ?? `BQ-${params.orderId.slice(0, 8).toUpperCase()}`
  const isPaid = order.payment_status === 'paid'

  const pdfBase64 = await generateInvoicePDF({
    orderNumber: orderRef,
    invoiceDate: order.created_at,
    customerName: order.guest_name ?? 'Customer',
    customerEmail: order.guest_email ?? '',
    customerPhone: order.guest_phone ?? '',
    customerAddress: (() => {
      const d = order.delivery_address ?? {}
      return [d.street, d.city, d.county].filter(Boolean).join(', ') || 'Kenya'
    })(),
    items: (order.items ?? []).map((i: {
      brand?: string; name: string; quantity: number; price_kes: number | string
    }) => ({
      brand: i.brand ?? '',
      name: i.name,
      quantity: Number(i.quantity) || 1,
      unitPrice: Number(i.price_kes) || 0,
      total: (Number(i.price_kes) || 0) * (Number(i.quantity) || 1),
    })),
    subtotal: Number(order.subtotal_kes ?? order.total_kes) || 0,
    total: Number(order.total_kes) || 0,
    paymentStatus: order.payment_status ?? 'pending',
    mpesaRef: order.mpesa_transaction_code ?? undefined,
    totalPaid: isPaid ? Number(order.total_kes) || 0 : 0,
    totalDue: isPaid ? 0 : Number(order.total_kes) || 0,
  })

  const pdfBuffer = Buffer.from(pdfBase64, 'base64')
  const filename = `Batteriq-Receipt-${orderRef}.pdf`

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'no-store',
    },
  })
}
