import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

export const dynamic = 'force-dynamic'

interface InItem { brand?: string; name: string; quantity: number | string; unitPrice: number | string }

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE')}`

function genInvoiceNumber(): string {
  const d = new Date()
  const date =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 900000 + 100000)
  return `BQ-INV-${date}-${rand}`
}

function buildEmailHtml(opts: {
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  items: Array<{ brand: string; name: string; quantity: number; unitPrice: number; total: number }>
  subtotal: number
  total: number
  isPaid: boolean
  notes?: string
}): string {
  const { invoiceNumber, customerName, customerEmail, customerPhone, customerAddress, items, subtotal, total, isPaid, notes } = opts
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${invoiceNumber} — Batteriq Kenya</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">

  <div style="background:linear-gradient(135deg,#00003a 0%,#00004d 100%);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.03em">BATTERIQ<span style="font-size:14px;vertical-align:super;color:rgba(255,255,255,0.5)">™</span></div>
    <div style="font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:.15em;text-transform:uppercase;margin-top:4px">Guarantee Your Uptime</div>
    <div style="margin-top:20px;font-size:13px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:.1em">Invoice</div>
    <div style="font-size:22px;font-weight:900;color:#fff;margin-top:4px;font-family:monospace">${invoiceNumber}</div>
  </div>

  <div style="background:${isPaid ? '#f0fdf4' : '#fffbeb'};border:1.5px solid ${isPaid ? '#86efac' : '#fcd34d'};border-radius:14px;padding:16px 20px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:${isPaid ? '#15803d' : '#92400e'}">
      ${isPaid ? 'Payment Confirmed' : 'Payment Pending'}
    </div>
    <div style="font-size:13px;color:${isPaid ? '#166534' : '#78350f'};margin-top:2px">
      ${isPaid ? `Amount paid: <strong style="font-family:monospace">${fmt(total)}</strong>` : `Amount due: <strong style="font-family:monospace">${fmt(total)}</strong>`}
    </div>
  </div>

  <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #f0f0f0">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#aaa;margin-bottom:12px">Bill To</div>
    <div style="font-size:15px;font-weight:800;color:#111">${customerName}</div>
    ${customerEmail ? `<div style="font-size:12px;color:#666;margin-top:3px">${customerEmail}</div>` : ''}
    ${customerPhone ? `<div style="font-size:12px;color:#666;margin-top:2px">${customerPhone}</div>` : ''}
    ${customerAddress ? `<div style="font-size:12px;color:#666;margin-top:2px">${customerAddress}</div>` : ''}
  </div>

  <div style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:16px;border:1px solid #f0f0f0">
    <div style="background:#fafafa;padding:12px 20px;border-bottom:1px solid #f0f0f0">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#aaa">Product</td>
        <td style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#aaa;text-align:center;width:50px">Qty</td>
        <td style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#aaa;text-align:right;width:120px">Amount</td>
      </tr></table>
    </div>
    ${items.map(item => `
    <div style="padding:14px 20px;border-bottom:1px solid #f9f9f9">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top">
          ${item.brand ? `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#0000ff;margin-bottom:3px">${item.brand}</div>` : ''}
          <div style="font-size:13px;font-weight:700;color:#111">${item.name}</div>
          <div style="font-size:11px;color:#999;margin-top:2px">${fmt(item.unitPrice)} × ${item.quantity}</div>
        </td>
        <td style="text-align:center;vertical-align:top;width:50px;font-size:13px;font-weight:700;color:#333;padding-top:2px">${item.quantity}</td>
        <td style="text-align:right;vertical-align:top;width:120px;font-family:monospace;font-size:14px;font-weight:800;color:#0000ff;padding-top:2px">${fmt(item.total)}</td>
      </tr></table>
    </div>`).join('')}
    <div style="padding:16px 20px;background:#fafafa">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#999;padding:3px 0">Subtotal</td><td style="text-align:right;font-family:monospace;font-size:12px;color:#666">${fmt(subtotal)}</td></tr>
        <tr><td style="font-size:12px;color:#999;padding:3px 0">Tax</td><td style="text-align:right;font-size:12px;color:#999">N/A</td></tr>
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:10px"></td></tr>
        <tr><td style="font-size:15px;font-weight:900;color:#111;padding-top:8px">Total</td><td style="text-align:right;font-family:monospace;font-size:18px;font-weight:900;color:#0000ff;padding-top:8px">${fmt(total)}</td></tr>
      </table>
    </div>
  </div>

  <div style="background:#fff;border-radius:16px;padding:16px 20px;margin-bottom:16px;border:1px solid #f0f0f0">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#aaa;margin-bottom:6px">Notes</div>
    <div style="font-size:12px;color:#555;line-height:1.6">${notes && notes.trim() ? notes.trim() : 'This invoice is valid for 14 days. Pay via M-Pesa or contact us to place your order. An official eTIMS KRA invoice will be issued within 24 hours of payment.'}</div>
  </div>

  <div style="text-align:center;padding:16px 0">
    <div style="font-size:12px;color:#bbb">Batteriq Solutions Ltd · Kijabe Street Block 17, Nairobi</div>
    <div style="font-size:11px;color:#bbb;margin-top:4px">+254 716 822 014 · info@batteriq.com · batteriq.com</div>
  </div>

</div></body></html>`
}

export async function POST(req: Request) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      customerName, customerEmail, customerPhone, customerAddress,
      items, notes, paymentStatus, action,
    } = body as {
      customerName?: string
      customerEmail?: string
      customerPhone?: string
      customerAddress?: string
      items?: InItem[]
      notes?: string
      paymentStatus?: string
      action?: 'download' | 'email'
    }

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Add at least one line item' }, { status: 400 })
    }

    const cleanItems = items
      .filter(i => i.name && String(i.name).trim())
      .map(i => {
        const quantity = Math.max(1, Number(i.quantity) || 1)
        const unitPrice = Math.max(0, Number(i.unitPrice) || 0)
        return {
          brand: (i.brand ?? '').trim(),
          name: String(i.name).trim(),
          quantity,
          unitPrice,
          total: unitPrice * quantity,
        }
      })

    if (cleanItems.length === 0) {
      return NextResponse.json({ error: 'Line items need a product name' }, { status: 400 })
    }

    const subtotal = cleanItems.reduce((s, i) => s + i.total, 0)
    const total = subtotal
    const isPaid = paymentStatus === 'paid'
    const invoiceNumber = genInvoiceNumber()
    const invoiceDate = new Date().toISOString()

    const pdfBase64 = await generateInvoicePDF({
      orderNumber: invoiceNumber,
      invoiceDate,
      customerName: customerName.trim(),
      customerEmail: (customerEmail ?? '').trim(),
      customerPhone: (customerPhone ?? '').trim(),
      customerAddress: (customerAddress ?? '').trim() || 'Kenya',
      items: cleanItems,
      subtotal,
      total,
      paymentStatus: isPaid ? 'paid' : 'pending',
      totalPaid: isPaid ? total : 0,
      totalDue: isPaid ? 0 : total,
      notes: notes,
    })

    // Track the invoice (best-effort — works without the table too)
    try {
      const supabase = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('manual_invoices') as any).insert({
        invoice_number: invoiceNumber,
        customer_name: customerName.trim(),
        customer_email: (customerEmail ?? '').trim() || null,
        customer_phone: (customerPhone ?? '').trim() || null,
        items: cleanItems,
        subtotal_kes: subtotal,
        total_kes: total,
        payment_status: isPaid ? 'paid' : 'pending',
        notes: notes ?? null,
      })
    } catch { /* table may not exist yet — invoice still generated */ }

    if (action === 'email') {
      const to = (customerEmail ?? '').trim()
      if (!to) return NextResponse.json({ error: 'Customer email is required to send' }, { status: 400 })

      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
      const from = process.env.RESEND_FROM_EMAIL ?? 'orders@batteriq.com'

      const html = buildEmailHtml({
        invoiceNumber,
        customerName: customerName.trim(),
        customerEmail: to,
        customerPhone: (customerPhone ?? '').trim(),
        customerAddress: (customerAddress ?? '').trim(),
        items: cleanItems,
        subtotal,
        total,
        isPaid,
        notes,
      })

      const result = await resend.emails.send({
        from: `Batteriq Kenya <${from}>`,
        to,
        subject: `Invoice ${invoiceNumber} — Batteriq Kenya`,
        html,
        attachments: [{ filename: `Batteriq-Invoice-${invoiceNumber}.pdf`, content: Buffer.from(pdfBase64, 'base64') }],
      })
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
      return NextResponse.json({ success: true, invoiceNumber, to })
    }

    // Default: return the PDF for download
    return NextResponse.json({
      success: true,
      invoiceNumber,
      pdf: pdfBase64,
      filename: `Batteriq-Invoice-${invoiceNumber}.pdf`,
    })
  } catch (err) {
    console.error('[invoices] create failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create invoice' }, { status: 500 })
  }
}

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('manual_invoices') as any)
      .select('id, invoice_number, customer_name, customer_email, total_kes, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ invoices: data ?? [] })
  } catch {
    return NextResponse.json({ invoices: [] })
  }
}
