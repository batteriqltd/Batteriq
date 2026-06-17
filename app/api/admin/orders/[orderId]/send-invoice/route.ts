import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
const FROM = 'orders@batteriq.com'

export async function POST(
  _req: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = createAdminClient()

    // Fetch full order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error } = await (supabase.from('orders') as any)
      .select('*')
      .eq('id', params.orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.guest_email) {
      return NextResponse.json({ error: 'Order has no email address' }, { status: 400 })
    }

    // Generate high-end invoice PDF
    const pdfBase64 = await generateInvoicePDF({
      orderNumber: order.order_number,
      invoiceDate: order.created_at,
      customerName: order.guest_name ?? 'Customer',
      customerEmail: order.guest_email,
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
      totalPaid: order.payment_status === 'paid' ? Number(order.total_kes) || 0 : 0,
      totalDue: order.payment_status === 'paid' ? 0 : Number(order.total_kes) || 0,
    })

    const isPaid = order.payment_status === 'paid'
    const total = Number(order.total_kes) || 0
    const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`
    const orderRef = order.order_number ?? `#${params.orderId.slice(0, 8).toUpperCase()}`

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${orderRef} — Batteriq Kenya</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#00003a 0%,#00004d 100%);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.03em">BATTERIQ<span style="font-size:14px;vertical-align:super;color:rgba(255,255,255,0.5)">™</span></div>
    <div style="font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:.15em;text-transform:uppercase;margin-top:4px">Guarantee Your Uptime</div>
    <div style="margin-top:20px;font-size:13px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:.1em">Invoice</div>
    <div style="font-size:22px;font-weight:900;color:#fff;margin-top:4px;font-family:monospace">${orderRef}</div>
  </div>

  <!-- Status banner -->
  <div style="background:${isPaid ? '#f0fdf4' : '#fffbeb'};border:1.5px solid ${isPaid ? '#86efac' : '#fcd34d'};border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
    <div style="width:36px;height:36px;border-radius:10px;background:${isPaid ? '#22c55e' : '#f59e0b'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <span style="color:#fff;font-size:18px;font-weight:900">${isPaid ? '✓' : '!'}</span>
    </div>
    <div>
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:${isPaid ? '#15803d' : '#92400e'}">
        ${isPaid ? 'Payment Confirmed' : 'Payment Pending'}
      </div>
      <div style="font-size:13px;color:${isPaid ? '#166534' : '#78350f'};margin-top:2px">
        ${isPaid
          ? `Amount paid: <strong style="font-family:monospace">${fmt(total)}</strong>${order.mpesa_transaction_code ? ` · M-Pesa Ref: <strong style="font-family:monospace">${order.mpesa_transaction_code}</strong>` : ''}`
          : `Amount due: <strong style="font-family:monospace">${fmt(total)}</strong>`
        }
      </div>
    </div>
  </div>

  <!-- Billing details -->
  <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #f0f0f0">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#aaa;margin-bottom:12px">Bill To</div>
    <div style="font-size:15px;font-weight:800;color:#111">${order.guest_name ?? 'Customer'}</div>
    ${order.guest_email ? `<div style="font-size:12px;color:#666;margin-top:3px">${order.guest_email}</div>` : ''}
    ${order.guest_phone ? `<div style="font-size:12px;color:#666;margin-top:2px">${order.guest_phone}</div>` : ''}
    ${order.delivery_address?.street || order.delivery_address?.city ? `<div style="font-size:12px;color:#666;margin-top:2px">${[order.delivery_address.street, order.delivery_address.city, order.delivery_address.county].filter(Boolean).join(', ')}</div>` : ''}
  </div>

  <!-- Items table -->
  <div style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:16px;border:1px solid #f0f0f0">
    <div style="background:#fafafa;padding:12px 20px;border-bottom:1px solid #f0f0f0">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#aaa">Product</td>
          <td style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#aaa;text-align:center;width:50px">Qty</td>
          <td style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#aaa;text-align:right;width:120px">Amount</td>
        </tr>
      </table>
    </div>
    ${(order.items ?? []).map((item: { brand?: string; name: string; quantity: number; price_kes: number | string }) => `
    <div style="padding:14px 20px;border-bottom:1px solid #f9f9f9">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top">
            ${item.brand ? `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#0000ff;margin-bottom:3px">${item.brand}</div>` : ''}
            <div style="font-size:13px;font-weight:700;color:#111">${item.name}</div>
            <div style="font-size:11px;color:#999;margin-top:2px">${fmt(Number(item.price_kes))} × ${item.quantity}</div>
          </td>
          <td style="text-align:center;vertical-align:top;width:50px;font-size:13px;font-weight:700;color:#333;padding-top:2px">${item.quantity}</td>
          <td style="text-align:right;vertical-align:top;width:120px;font-family:monospace;font-size:14px;font-weight:800;color:#0000ff;padding-top:2px">${fmt(Number(item.price_kes) * Number(item.quantity))}</td>
        </tr>
      </table>
    </div>`).join('')}
    <!-- Totals -->
    <div style="padding:16px 20px;background:#fafafa">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#999;padding:3px 0">Subtotal</td>
          <td style="text-align:right;font-family:monospace;font-size:12px;color:#666">${fmt(Number(order.subtotal_kes ?? order.total_kes) || 0)}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#999;padding:3px 0">Tax</td>
          <td style="text-align:right;font-size:12px;color:#999">N/A</td>
        </tr>
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:10px;margin-top:8px"></td></tr>
        <tr>
          <td style="font-size:15px;font-weight:900;color:#111;padding-top:8px">Total</td>
          <td style="text-align:right;font-family:monospace;font-size:18px;font-weight:900;color:#0000ff;padding-top:8px">${fmt(total)}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#999;padding-top:6px">Total Paid</td>
          <td style="text-align:right;font-family:monospace;font-size:13px;font-weight:800;color:${isPaid ? '#16a34a' : '#999'};padding-top:6px">${isPaid ? fmt(total) : 'KES 0'}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#999;padding-top:4px">Balance Due</td>
          <td style="text-align:right;font-family:monospace;font-size:13px;font-weight:800;color:${isPaid ? '#999' : '#dc2626'};padding-top:4px">${isPaid ? 'KES 0' : fmt(total)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0">
    <div style="font-size:12px;color:#bbb">Batteriq Solutions Ltd · Kijabe Street Block 17, Nairobi</div>
    <div style="font-size:11px;color:#bbb;margin-top:4px">+254 716 822 014 · info@batteriq.com · batteriq.com</div>
    <div style="font-size:11px;color:#bbb;margin-top:8px">An eTIMS KRA invoice will be issued within 24 hours of payment confirmation.</div>
  </div>

</div>
</body></html>`

    const result = await resend.emails.send({
      from: FROM,
      to: order.guest_email,
      subject: `Invoice ${orderRef} — Batteriq Kenya`,
      html,
      attachments: pdfBase64 ? [{
        filename: `Batteriq-Invoice-${orderRef}.pdf`,
        content: Buffer.from(pdfBase64, 'base64'),
      }] : [],
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: result.data?.id, to: order.guest_email })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
