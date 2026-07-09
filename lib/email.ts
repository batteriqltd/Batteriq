import { Resend } from 'resend'
import { generateReceiptPDF, type ReceiptData } from './pdf-receipt'

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')

function resolveEmail(email: string): string {
  return email
}

const FROM_ORDERS = 'Batteriq Orders <sales@batteriq.com>'
const FROM_SUPPORT = 'Batteriq Support <info@batteriq.com>'

const ORDER_EMAILS = ['sales@batteriq.com', 'info@batteriq.com']
const SUPPORT_EMAILS = ['info@batteriq.com', 'sales@batteriq.com']

function fmt(n: number | string): string {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`
}

function paymentLabel(m: string): string {
  const map: Record<string, string> = {
    mpesa_now: 'M-Pesa STK Push',
    cod_cash: 'Cash on Delivery',
    cod_mpesa: 'M-Pesa at Doorstep',
    sales_confirmation: 'Reserve Order — Pay After Confirmation',
    mpesa: 'M-Pesa',
    cash: 'Cash',
  }
  return map[m] ?? m
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function wrapEmail(content: string, headerText: string, headerSubtext: string, headerColor = '#00004d'): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${headerText}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#333}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
  .hdr{background:${headerColor};padding:28px 36px}
  .hdr h1{color:#fff;font-size:20px;font-weight:800;margin:0;letter-spacing:-.3px}
  .hdr p{color:rgba(255,255,255,.7);font-size:12px;margin:4px 0 0}
  .body{padding:28px 36px}
  .section-title{font-size:13px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:.08em;margin:20px 0 10px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
  .info-box{background:#f8f9ff;border:1px solid #e0e7ff;border-radius:10px;padding:12px 14px}
  .info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#999;margin-bottom:4px}
  .info-val{font-size:13px;font-weight:600;color:#111}
  .order-num-box{background:#eff6ff;border:2px solid #0000ff;border-radius:12px;padding:16px 20px;margin:16px 0}
  .order-num{font-size:26px;font-weight:900;color:#0000ff;font-family:monospace;letter-spacing:1px}
  .items-table{width:100%;border-collapse:collapse;margin:12px 0}
  .items-table th{background:#f8f9ff;padding:9px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#666;border-bottom:2px solid #e0e7ff}
  .items-table td{padding:10px;font-size:13px;color:#333;border-bottom:1px solid #f5f5f5;vertical-align:top}
  .brand{font-size:10px;font-weight:800;color:#0000ff;text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:2px}
  .totals-box{background:#f8f9ff;border-radius:10px;padding:14px 16px;margin:14px 0}
  .t-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#666}
  .t-total{display:flex;justify-content:space-between;padding:10px 0 0;margin-top:8px;border-top:2px solid #e0e7ff;font-size:18px;font-weight:900;color:#0000ff}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
  .badge-paid{background:#dcfce7;color:#166534}
  .badge-pending{background:#fef3c7;color:#92400e}
  .badge-shipped{background:#dbeafe;color:#1e40af}
  .badge-delivered{background:#dcfce7;color:#065f46}
  .cta{display:inline-block;background:linear-gradient(135deg,#0000ff,#00004d);color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:800;font-size:14px;margin:16px 0}
  .tip-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px 16px;margin:16px 0;font-size:12px;color:#92400e}
  .footer-bar{background:#00004d;padding:16px 36px}
  .footer-bar p{color:rgba(255,255,255,.55);font-size:11px;margin:2px 0}
  .divider{border:none;border-top:1px solid #f0f0f0;margin:20px 0}
  .track-bar{background:#eff6ff;border-radius:10px;padding:10px 16px;margin:16px 0;text-align:center;font-size:12px;color:#0000ff;font-weight:700}
  @media(max-width:600px){.info-grid{grid-template-columns:1fr}.body{padding:20px 18px}}
</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>${headerText}</h1><p>${headerSubtext}</p></div>
  <div class="body">${content}</div>
  <div class="footer-bar">
    <p>© 2025 Batteriq Solutions Ltd. · Kenya's Official Authorised EcoFlow Distributor</p>
    <p>batteriq.com · info@batteriq.com · Nairobi, Kenya</p>
  </div>
</div></body></html>`
}

// ── EMAIL 1 — CUSTOMER ORDER CONFIRMATION ──
// Sent immediately when order is placed. Includes PDF receipt attachment.
export async function emailOrderConfirmation(order: {
  order_number: string
  guest_name: string
  guest_email: string
  guest_phone: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]
  total_kes: number
  payment_method: string
  payment_status: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delivery_address: any
  created_at: string
}) {
  const isPaid = order.payment_status === 'paid'
  const total = Number(order.total_kes) || 0

  const itemRows = order.items.map((i: { brand?: string; name: string; quantity: number; price_kes: number | string }) => `
  <tr>
    <td style="padding:12px 10px;border-bottom:1px solid #f5f5f5;vertical-align:top">
      <span style="font-size:10px;font-weight:800;color:#0000ff;text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:3px">${i.brand ?? ''}</span>
      <span style="font-size:14px;font-weight:700;color:#111">${i.name}</span>
    </td>
    <td style="text-align:center;padding:12px 10px;border-bottom:1px solid #f5f5f5;font-size:14px;font-weight:700;color:#333;vertical-align:top">${i.quantity}</td>
    <td style="text-align:right;padding:12px 10px;border-bottom:1px solid #f5f5f5;font-family:monospace;font-size:13px;color:#666;vertical-align:top">${fmt(i.price_kes)}</td>
    <td style="text-align:right;padding:12px 10px;border-bottom:1px solid #f5f5f5;font-family:monospace;font-size:14px;font-weight:800;color:#0000ff;vertical-align:top">${fmt(Number(i.price_kes) * i.quantity)}</td>
  </tr>`).join('')

  const etims = `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:12px 16px;margin:16px 0">
  <div style="font-size:11px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">eTIMS KRA Invoice</div>
  <div style="font-size:12px;color:#6d28d9;line-height:1.5">An official eTIMS KRA invoice will be issued and sent to your email within 24 hours of payment confirmation. This receipt serves as your proof of purchase in the meantime.</div>
</div>`

  const content = `
    <p style="font-size:17px;font-weight:700;color:#111;margin-bottom:6px">Hi ${order.guest_name}!</p>
    <p style="color:#555;line-height:1.6;margin-bottom:8px">
      ${isPaid
        ? 'Your payment is confirmed and your order is being prepared. Find your PDF receipt attached.'
        : "Your order has been placed! We'll confirm payment and begin processing shortly. Your PDF receipt is attached."}
    </p>

    <div class="order-num-box">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#666;margin-bottom:4px">Your Order Number</div>
      <div class="order-num">${order.order_number}</div>
      <div style="font-size:12px;color:#666;margin-top:6px">Use this to track at <strong>batteriq.com/track-order</strong></div>
    </div>

    <div class="info-grid">
      <div class="info-box"><div class="info-label">Date</div><div class="info-val">${fmtDate(order.created_at)}</div></div>
      <div class="info-box"><div class="info-label">Payment</div><div class="info-val">${paymentLabel(order.payment_method)}</div></div>
      <div class="info-box"><div class="info-label">Status</div><div class="info-val"><span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${isPaid ? 'Paid' : 'Pending'}</span></div></div>
      <div class="info-box"><div class="info-label">Delivery</div><div class="info-val">${order.delivery_address?.city ?? 'Nairobi'}, ${order.delivery_address?.county ?? ''}</div></div>
    </div>

    <div class="section-title">Items Ordered</div>
    <table class="items-table">
      <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals-box">
      <div class="t-row"><span>Subtotal</span><span style="font-family:monospace;font-weight:700">${fmt(total)}</span></div>
      <div class="t-row"><span>Delivery</span><span style="color:#059669;font-weight:600">Calculated on delivery</span></div>
      <div class="t-total"><span>Total</span><span style="font-family:monospace">${fmt(total)}</span></div>
    </div>

    <div class="track-bar">Track your order: batteriq.com/track-order · Order No: ${order.order_number}</div>

    <p style="color:#555;font-size:13px;line-height:1.6;margin-top:16px">
      Questions? Email <a href="mailto:sales@batteriq.com" style="color:#0000ff">sales@batteriq.com</a>
    </p>
    ${etims}
    <a href="https://batteriq.com/track-order" class="cta">Track My Order</a>
  `

  const receiptData: ReceiptData = {
    orderNumber: order.order_number,
    customerName: order.guest_name,
    customerEmail: order.guest_email,
    customerPhone: order.guest_phone,
    items: order.items,
    totalKes: total,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    deliveryAddress: order.delivery_address ?? {},
    createdAt: order.created_at,
  }

  let pdfBase64 = ''
  try {
    pdfBase64 = await generateReceiptPDF(receiptData)
  } catch (e) {
    console.error('PDF generation failed:', e)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailPayload: any = {
    from: FROM_ORDERS,
    to: resolveEmail(order.guest_email),
    subject: `Order Received — ${order.order_number} | Batteriq Kenya`,
    html: wrapEmail(content, 'BATTERIQ™ — Order Received', `Order ${order.order_number} · Awaiting Payment Confirmation`),
  }

  if (pdfBase64) {
    emailPayload.attachments = [{
      filename: `Batteriq-Receipt-${order.order_number}.pdf`,
      content: pdfBase64,
      type: 'application/pdf',
      disposition: 'attachment',
    }]
  }

  const result = await resend.emails.send(emailPayload)
  console.log('✅ Customer order email sent:', result)
  return result
}

// ── EMAIL 2 — ADMIN NEW ORDER ALERT ──
// Sent to company emails on every new order.
export async function emailAdminNewOrder(order: {
  order_number: string
  guest_name: string
  guest_email: string
  guest_phone: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]
  total_kes: number
  payment_method: string
  payment_status: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delivery_address: any
  created_at: string
}) {
  const total = Number(order.total_kes) || 0
  const isPaid = order.payment_status === 'paid'
  const itemCount = order.items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)

  const itemRows = order.items.map((i: { brand?: string; name: string; quantity: number; price_kes: number | string }) => `
    <tr>
      <td><span class="brand">${i.brand ?? ''}</span>${i.name}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right;font-family:monospace">${fmt(i.price_kes)}</td>
      <td style="text-align:right;font-family:monospace;font-weight:700;color:#0000ff">${fmt(Number(i.price_kes) * i.quantity)}</td>
    </tr>`).join('')

  const content = `
    <div style="background:#fff8f0;border:2px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:.1em">Order Number</div>
          <div style="font-size:24px;font-weight:900;color:#ea580c;font-family:monospace">${order.order_number}</div>
          <div style="font-size:12px;color:#666;margin-top:4px">${fmtDate(order.created_at)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:.1em">Order Total</div>
          <div style="font-size:30px;font-weight:900;color:#0000ff;font-family:monospace">${fmt(total)}</div>
          <span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${isPaid ? 'PAID' : 'PENDING PAYMENT'}</span>
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box"><div class="info-label">Customer Name</div><div class="info-val">${order.guest_name}</div></div>
      <div class="info-box"><div class="info-label">Phone (M-Pesa)</div><div class="info-val" style="font-family:monospace">${order.guest_phone}</div></div>
      <div class="info-box"><div class="info-label">Email</div><div class="info-val" style="word-break:break-all;font-size:12px">${order.guest_email}</div></div>
      <div class="info-box"><div class="info-label">Payment Method</div><div class="info-val">${paymentLabel(order.payment_method)}</div></div>
      <div class="info-box"><div class="info-label">Delivery To</div><div class="info-val">${order.delivery_address?.city ?? 'Nairobi'}, ${order.delivery_address?.county ?? ''}</div></div>
      <div class="info-box"><div class="info-label">Items</div><div class="info-val">${itemCount} item${itemCount !== 1 ? 's' : ''}</div></div>
    </div>

    <div class="section-title">Items Ordered</div>
    <table class="items-table">
      <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals-box">
      <div class="t-total"><span>Order Total</span><span style="font-family:monospace">${fmt(total)}</span></div>
    </div>

    <div class="section-title">Delivery Address</div>
    <div class="info-box">
      <div class="info-val">${order.delivery_address?.street ?? 'Not provided'}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">${order.delivery_address?.city ?? ''}, ${order.delivery_address?.county ?? ''}</div>
      ${order.delivery_address?.instructions ? `<div style="font-size:12px;color:#888;margin-top:4px;font-style:italic">Note: ${order.delivery_address.instructions}</div>` : ''}
    </div>

    ${order.payment_method === 'cod_mpesa' ? `
      <div class="tip-box">⚡ <strong>M-Pesa on Delivery order</strong> — Remember to trigger the STK push from the admin dashboard when you arrive at the customer's door.</div>
    ` : ''}
    ${order.payment_method === 'cod_cash' ? `
      <div class="tip-box">💵 <strong>Cash on Delivery order</strong> — Collect ${fmt(total)} in cash upon delivery.</div>
    ` : ''}

    <a href="https://batteriq.com/admin/orders" class="cta" style="background:linear-gradient(135deg,#00004d,#000080)">View in Admin Dashboard</a>
  `

  await Promise.allSettled(
    ORDER_EMAILS.map(email =>
      resend.emails.send({
        from: FROM_ORDERS,
        to: resolveEmail(email),
        subject: `New Order ${order.order_number} — ${fmt(total)} | Batteriq Admin`,
        html: wrapEmail(content, `New Order — ${order.order_number}`, `${isPaid ? 'PAYMENT CONFIRMED' : 'Awaiting Payment'} · ${fmt(total)}`, '#1e3a5f'),
      })
    )
  )

  console.log('✅ Admin order alerts sent')
}

// ── EMAIL 3 — PAYMENT CONFIRMED ──
// Sent to customer + admin after M-Pesa callback confirms payment. Includes paid PDF receipt.
export async function emailPaymentConfirmed(order: {
  order_number: string
  guest_name: string
  guest_email: string
  guest_phone: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]
  total_kes: number
  payment_method: string
  mpesa_transaction_code?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delivery_address: any
  created_at: string
}) {
  const total = Number(order.total_kes) || 0

  const itemRows2 = order.items.map((i: { brand?: string; name: string; quantity: number; price_kes: number | string }) => `
  <tr>
    <td style="padding:10px;border-bottom:1px solid #f0fdf4;vertical-align:top">
      <span style="font-size:10px;font-weight:800;color:#059669;text-transform:uppercase;display:block;margin-bottom:2px">${i.brand ?? ''}</span>
      <span style="font-size:13px;font-weight:700;color:#111">${i.name}</span>
    </td>
    <td style="text-align:center;padding:10px;border-bottom:1px solid #f0fdf4;font-weight:700;color:#333">${i.quantity}</td>
    <td style="text-align:right;padding:10px;border-bottom:1px solid #f0fdf4;font-family:monospace;font-weight:800;color:#059669">${fmt(Number(i.price_kes) * i.quantity)}</td>
  </tr>`).join('')

  const content = `
    <p style="font-size:17px;font-weight:700;color:#111;margin-bottom:6px">Hi ${order.guest_name}!</p>
    <p style="color:#555;line-height:1.6">Your M-Pesa payment has been automatically verified and confirmed. Your order is now being prepared!</p>

    <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:16px 20px;margin:16px 0">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:.1em;margin-bottom:4px">Payment Confirmed</div>
      <div style="font-size:24px;font-weight:900;color:#059669;font-family:monospace">${order.order_number}</div>
      ${order.mpesa_transaction_code ? `
        <div style="margin-top:10px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:.1em">M-Pesa Reference</div>
          <div style="font-family:monospace;font-size:15px;font-weight:700;color:#065f46;margin-top:3px">${order.mpesa_transaction_code}</div>
        </div>` : ''}
      <div style="margin-top:10px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:.1em">Amount Paid</div>
        <div style="font-size:22px;font-weight:900;color:#059669;font-family:monospace;margin-top:3px">${fmt(total)}</div>
      </div>
    </div>

    <div class="track-bar">Track your order: batteriq.com/track-order · Order No: ${order.order_number}</div>

    <div class="section-title">Items You Paid For</div>
    <table class="items-table">
      <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemRows2}</tbody>
    </table>
    <div class="totals-box">
      <div class="t-total">
        <span>Total Paid</span>
        <span style="font-family:monospace;color:#059669">${fmt(total)}</span>
      </div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px 16px;margin:16px 0">
      <div style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">eTIMS KRA Invoice</div>
      <div style="font-size:12px;color:#166534;line-height:1.5">An official eTIMS KRA invoice will be issued and sent to your email within 24 hours. Your M-Pesa receipt above serves as payment proof.</div>
    </div>
    <a href="https://batteriq.com/track-order" class="cta" style="background:linear-gradient(135deg,#059669,#065f46)">Track My Order</a>
  `

  const receiptData: ReceiptData = {
    orderNumber: order.order_number,
    customerName: order.guest_name,
    customerEmail: order.guest_email,
    customerPhone: order.guest_phone,
    items: order.items,
    totalKes: total,
    paymentMethod: order.payment_method,
    paymentStatus: 'paid',
    mpesaRef: order.mpesa_transaction_code,
    deliveryAddress: order.delivery_address ?? {},
    createdAt: order.created_at,
  }

  let pdfBase64 = ''
  try {
    pdfBase64 = await generateReceiptPDF(receiptData)
  } catch (e) {
    console.error('PDF generation failed:', e)
  }

  const attachments = pdfBase64 ? [{
    filename: `Batteriq-PaidReceipt-${order.order_number}.pdf`,
    content: pdfBase64,
    type: 'application/pdf',
    disposition: 'attachment',
  }] : []

  await Promise.allSettled([
    resend.emails.send({
      from: FROM_ORDERS,
      to: resolveEmail(order.guest_email),
      subject: `Payment Confirmed ✅ — ${order.order_number} | Batteriq Kenya`,
      html: wrapEmail(content, 'Payment Confirmed!', `M-Pesa payment verified for Order ${order.order_number}`, '#065f46'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(attachments.length ? { attachments } : {}) as any,
    }),
    ...ORDER_EMAILS.map(email =>
      resend.emails.send({
        from: FROM_ORDERS,
        to: resolveEmail(email),
        subject: `Payment Received — ${order.order_number} | ${fmt(total)}`,
        html: wrapEmail(`
          <p style="font-size:16px;font-weight:700">M-Pesa payment auto-verified for order <strong>${order.order_number}</strong></p>
          <div class="info-grid">
            <div class="info-box"><div class="info-label">Customer</div><div class="info-val">${order.guest_name}</div></div>
            <div class="info-box"><div class="info-label">Amount</div><div class="info-val" style="color:#0000ff;font-size:18px;font-weight:900">${fmt(total)}</div></div>
            <div class="info-box"><div class="info-label">M-Pesa Ref</div><div class="info-val" style="font-family:monospace">${order.mpesa_transaction_code ?? 'N/A'}</div></div>
            <div class="info-box"><div class="info-label">Phone</div><div class="info-val" style="font-family:monospace">${order.guest_phone}</div></div>
          </div>
          <a href="https://batteriq.com/admin/orders" class="cta" style="background:linear-gradient(135deg,#00004d,#000080)">View in Admin</a>
        `, `Payment Received — ${order.order_number}`, `${fmt(total)} via M-Pesa · Auto-verified`, '#065f46'),
      })
    ),
  ])

  console.log('✅ Payment confirmed emails sent')
}

// ── EMAIL 4 — ORDER STATUS UPDATE ──
// Sent to customer when admin updates fulfillment status.
export async function emailStatusUpdate(order: {
  order_number: string
  guest_name: string
  guest_email: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]
  total_kes: number
  fulfillment_status: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delivery_address: any
}) {
  const statusMessages: Record<string, { title: string; subtitle: string; body: string; color: string; badge: string }> = {
    processing: {
      title: 'Your order is being processed',
      subtitle: "We're preparing your items for dispatch",
      body: "Great news! Your order is now being processed. Our team is preparing your items and will have them ready for dispatch soon.",
      color: '#1e40af',
      badge: 'badge-shipped',
    },
    shipped: {
      title: 'Your order is on its way!',
      subtitle: 'Out for delivery to you',
      body: "Exciting news — your order has been dispatched and is on its way to you! Our delivery team will contact you shortly to confirm the delivery time.",
      color: '#0369a1',
      badge: 'badge-shipped',
    },
    delivered: {
      title: 'Order Delivered!',
      subtitle: 'Your order has been successfully delivered',
      body: "Your order has been delivered! We hope you love your new EcoFlow product. Please register your warranty at batteriq.com/support/warranty to activate your official coverage.",
      color: '#065f46',
      badge: 'badge-delivered',
    },
  }

  const info = statusMessages[order.fulfillment_status] ?? {
    title: `Order Update — ${order.fulfillment_status}`,
    subtitle: 'Your order status has been updated',
    body: `Your order ${order.order_number} status has been updated to: ${order.fulfillment_status}`,
    color: '#00004d',
    badge: 'badge-pending',
  }

  const content = `
    <p style="font-size:17px;font-weight:700;color:#111;margin-bottom:6px">Hi ${order.guest_name}!</p>
    <p style="color:#555;line-height:1.6;margin-bottom:16px">${info.body}</p>

    <div class="order-num-box" style="border-color:${info.color}">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:.1em;margin-bottom:4px">Order Number</div>
      <div class="order-num" style="color:${info.color}">${order.order_number}</div>
      <div style="margin-top:8px">
        <span class="badge ${info.badge}">${order.fulfillment_status.toUpperCase()}</span>
      </div>
    </div>

    ${order.fulfillment_status === 'delivered' ? `
      <div class="tip-box" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af">
        Register your warranty at batteriq.com/support/warranty to activate your 24-month EcoFlow warranty.
      </div>
    ` : ''}

    <div class="track-bar">Track your order: batteriq.com/track-order · Order No: ${order.order_number}</div>
    <a href="https://batteriq.com/track-order" class="cta" style="background:linear-gradient(135deg,${info.color},#00004d)">Track My Order</a>

    <p style="color:#555;font-size:13px;margin-top:16px">
      Questions? Email <a href="mailto:sales@batteriq.com" style="color:#0000ff">sales@batteriq.com</a>
    </p>
  `

  await resend.emails.send({
    from: FROM_ORDERS,
    to: resolveEmail(order.guest_email),
    subject: `${info.title} — Order ${order.order_number} | Batteriq`,
    html: wrapEmail(content, info.title, info.subtitle, info.color),
  })

  console.log(`✅ Status update email sent: ${order.fulfillment_status}`)
}

// ── EMAIL 5 — CONTACT FORM SUBMISSION ──
// Sent to company emails. Auto-reply sent to sender.
export async function emailContactFormSubmission(contact: {
  firstName: string
  lastName: string
  email: string
  phone?: string
  inquiryType?: string
  message: string
}) {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim()

  const companyContent = `
    <div class="order-num-box" style="border-color:#ea580c">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:.1em">New Contact Inquiry</div>
      <div style="font-size:18px;font-weight:900;color:#ea580c;margin-top:4px">${contact.inquiryType ?? 'General Inquiry'}</div>
    </div>

    <div class="info-grid">
      <div class="info-box"><div class="info-label">Name</div><div class="info-val">${fullName}</div></div>
      <div class="info-box"><div class="info-label">Email</div><div class="info-val" style="word-break:break-all">${contact.email}</div></div>
      ${contact.phone ? `<div class="info-box"><div class="info-label">Phone</div><div class="info-val" style="font-family:monospace">${contact.phone}</div></div>` : ''}
      <div class="info-box"><div class="info-label">Inquiry Type</div><div class="info-val">${contact.inquiryType ?? 'General'}</div></div>
    </div>

    <div class="section-title">Message</div>
    <div style="background:#f8f9ff;border:1px solid #e0e7ff;border-radius:10px;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#333">${contact.message}</div>

    <p style="margin-top:20px;color:#555;font-size:13px">
      Reply directly to this email to respond to <strong>${fullName}</strong> at <strong>${contact.email}</strong>
    </p>
    <a href="mailto:${contact.email}?subject=Re: Your inquiry to Batteriq" class="cta" style="background:linear-gradient(135deg,#00004d,#0000ff)">Reply to ${fullName}</a>
  `

  const autoReplyContent = `
    <p style="font-size:17px;font-weight:700;color:#111;margin-bottom:6px">Hi ${contact.firstName}!</p>
    <p style="color:#555;line-height:1.6">Thank you for reaching out to Batteriq. We've received your message and our team will get back to you within <strong>2 business hours</strong>.</p>

    <div style="background:#f8f9ff;border:1px solid #e0e7ff;border-radius:10px;padding:16px 20px;margin:16px 0">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:.1em;margin-bottom:8px">Your Message</div>
      <div style="font-size:13px;color:#555;line-height:1.6;white-space:pre-wrap">${contact.message}</div>
    </div>

    <div class="info-grid">
      <div class="info-box"><div class="info-label">Email</div><div class="info-val">info@batteriq.com</div></div>
      <div class="info-box"><div class="info-label">Hours</div><div class="info-val">Mon–Sat, 8AM–6PM</div></div>
    </div>

    <a href="https://batteriq.com" class="cta">Browse Products</a>
  `

  await Promise.allSettled([
    ...SUPPORT_EMAILS.map(email =>
      resend.emails.send({
        from: FROM_SUPPORT,
        to: resolveEmail(email),
        replyTo: contact.email,
        subject: `New Contact: ${contact.inquiryType ?? 'General'} from ${fullName}`,
        html: wrapEmail(companyContent, 'New Contact Form Submission', `${fullName} · ${contact.email}`, '#1e3a5f'),
      })
    ),
    resend.emails.send({
      from: FROM_SUPPORT,
      to: resolveEmail(contact.email),
      subject: `We received your message — Batteriq Kenya`,
      html: wrapEmail(autoReplyContent, 'Thank you for contacting Batteriq!', "We'll be in touch within 2 hours"),
    }),
  ])

  console.log('✅ Contact form emails sent')
}
