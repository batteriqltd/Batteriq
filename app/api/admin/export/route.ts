import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'orders'

  const supabase = createAdminClient()

  if (type === 'orders') {
    const { data } = await supabase
      .from('orders')
      .select('order_number, guest_name, guest_email, guest_phone, total_kes, payment_status, payment_method, fulfillment_status, created_at')
      .order('created_at', { ascending: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []).map((o: any) =>
      [
        o.order_number,
        `"${(o.guest_name ?? '').replace(/"/g, '""')}"`,
        o.guest_email ?? '',
        o.guest_phone ?? '',
        o.total_kes,
        o.payment_status,
        o.payment_method,
        o.fulfillment_status,
        `"${new Date(o.created_at).toLocaleString('en-KE')}"`,
      ].join(',')
    )

    const csv = ['Order Number,Customer Name,Email,Phone,Total KES,Payment Status,Payment Method,Fulfillment,Date', ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="batteriq-orders-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  if (type === 'products') {
    const { data } = await supabase
      .from('products')
      .select('name, brand, category, price_kes, in_stock, sku')
      .order('brand', { ascending: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []).map((p: any) =>
      [
        `"${(p.name ?? '').replace(/"/g, '""')}"`,
        p.brand ?? '',
        p.category ?? '',
        p.price_kes,
        p.in_stock ? 'In Stock' : 'Out of Stock',
        p.sku ?? '',
      ].join(',')
    )

    const csv = ['Product Name,Brand,Category,Price KES,Stock Status,SKU', ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="batteriq-products-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  if (type === 'invoice') {
    const orderId = searchParams.get('orderId')
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    return NextResponse.redirect(new URL(`/admin/orders/${orderId}`, req.url))
  }

  return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
}
