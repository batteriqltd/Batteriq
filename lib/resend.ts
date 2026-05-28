import { Resend } from 'resend'
import type { Order } from './supabase/types'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendOrderConfirmationEmail(order: Order) {
  const resend = getResend()
  const items = order.items as Array<{
    name: string
    quantity: number
    price_kes: number
  }>

  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">KES ${item.price_kes.toLocaleString()}</td>
        </tr>`
    )
    .join('')

  const to = order.guest_email ?? ''
  if (!to) return

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Order Confirmed — ${order.order_number} | Batteriq`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Order Confirmation</title></head>
      <body style="font-family:DM Sans,system-ui,sans-serif;background:#f5f5f5;margin:0;padding:20px">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden">
          <div style="background:#000000;padding:24px;text-align:center">
            <h1 style="color:white;margin:0;font-size:24px">Batteriq</h1>
            <p style="color:#888;margin:4px 0 0">Guarantee your Uptime.</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#000;margin:0 0 8px">Order Confirmed!</h2>
            <p style="color:#666;margin:0 0 24px">Thank you, ${order.guest_name ?? 'valued customer'}. Your order has been received.</p>
            <div style="background:#f9f9f9;border-radius:6px;padding:16px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:#666">ORDER NUMBER</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;font-family:monospace;color:#0000ff">${order.order_number}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <thead>
                <tr style="background:#f5f5f5">
                  <th style="padding:8px;text-align:left;font-size:12px;color:#666">PRODUCT</th>
                  <th style="padding:8px;text-align:center;font-size:12px;color:#666">QTY</th>
                  <th style="padding:8px;text-align:right;font-size:12px;color:#666">PRICE</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding:12px 8px;font-weight:700">Total</td>
                  <td style="padding:12px 8px;text-align:right;font-weight:700;color:#0000ff;font-family:monospace">KES ${order.total_kes.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
            <div style="background:#f0f0ff;border-left:4px solid #0000ff;padding:12px 16px;margin-bottom:24px;border-radius:0 6px 6px 0">
              <p style="margin:0;font-weight:600;color:#000">Payment: ${order.payment_method === 'mpesa_now' ? '✅ M-Pesa Paid' : order.payment_method === 'cod_cash' ? '💵 Cash on Delivery' : '📱 M-Pesa on Delivery'}</p>
              ${order.mpesa_transaction_code ? `<p style="margin:4px 0 0;font-size:13px;color:#666">M-Pesa Code: <strong>${order.mpesa_transaction_code}</strong></p>` : ''}
            </div>
            <p style="color:#666;font-size:14px">Our team will contact you within 24 hours to confirm delivery details. For questions, reply to this email or WhatsApp us.</p>
          </div>
          <div style="background:#f5f5f5;padding:16px;text-align:center">
            <p style="margin:0;font-size:12px;color:#888">© 2025 Batteriq Solutions Ltd. Nairobi, Kenya.</p>
            <p style="margin:4px 0 0;font-size:12px;color:#888">Authorised EcoFlow & Bluetti Dealer</p>
          </div>
        </div>
      </body>
      </html>
    `,
  })
}

export async function sendContactEmail({
  firstName,
  lastName,
  email,
  phone,
  inquiryType,
  message,
}: {
  firstName: string
  lastName: string
  email: string
  phone?: string
  inquiryType?: string
  message: string
}) {
  const resend = getResend()
  const fullName = `${firstName} ${lastName}`

  // Notify team
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: 'info@batteriq.com',
    subject: `New Contact: ${inquiryType || 'General'} from ${fullName}`,
    html: `
      <div style="font-family:DM Sans,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px">
        <h2 style="color:#000">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr><td style="padding:8px 0;color:#666;width:140px">Name</td><td style="padding:8px 0;font-weight:600">${fullName}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0">${email}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Phone</td><td style="padding:8px 0">${phone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Inquiry Type</td><td style="padding:8px 0">${inquiryType || '—'}</td></tr>
        </table>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px">
          <p style="margin:0;color:#333;white-space:pre-wrap">${message}</p>
        </div>
        <p style="color:#888;font-size:12px">Submitted via batteriq.com/contact</p>
      </div>
    `,
  })

  // Auto-reply to customer
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'We received your message — Batteriq Kenya',
    html: `
      <div style="font-family:DM Sans,system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <div style="background:#000;padding:20px;border-radius:8px;text-align:center;margin-bottom:24px">
          <h1 style="color:#fff;margin:0;font-size:20px">BATTERIQ</h1>
          <p style="color:#888;margin:4px 0 0;font-size:12px">Guarantee your Uptime.</p>
        </div>
        <h2 style="color:#000">Hi ${firstName},</h2>
        <p style="color:#666">Thank you for contacting Batteriq Kenya. We&apos;ve received your message and our team will get back to you within <strong>2 hours</strong> during business hours (Mon–Sat, 8AM–6PM).</p>
        <div style="background:#f0f0ff;border-left:4px solid #0000ff;padding:12px 16px;border-radius:0 8px 8px 0;margin:24px 0">
          <p style="margin:0;font-size:14px;color:#333"><strong>Need urgent help?</strong> WhatsApp us at +254 700 000 000 for an instant response.</p>
        </div>
        <p style="color:#888;font-size:12px;margin-top:32px">© 2025 Batteriq Solutions Ltd, Nairobi, Kenya.</p>
      </div>
    `,
  })
}

export async function sendNewsletterWelcomeEmail(email: string, name?: string) {
  const resend = getResend()
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'Welcome to Batteriq — Exclusive Deals Incoming',
    html: `
      <div style="font-family:DM Sans,system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <h1 style="color:#000">Welcome${name ? `, ${name}` : ''}!</h1>
        <p>You're now subscribed to Batteriq's exclusive deals newsletter.</p>
        <p>As Kenya's authorised EcoFlow and Bluetti dealer, we'll send you:</p>
        <ul>
          <li>Exclusive price promotions</li>
          <li>New product launches</li>
          <li>Expert power backup guides</li>
          <li>Solar installation tips</li>
        </ul>
        <p>In the meantime, browse our full range at <a href="https://batteriq.com" style="color:#0000ff">batteriq.com</a></p>
        <p style="color:#888;font-size:12px;margin-top:32px">Batteriq Solutions Ltd, Nairobi, Kenya. <a href="https://batteriq.com/unsubscribe" style="color:#888">Unsubscribe</a></p>
      </div>
    `,
  })
}
