import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'

interface EmailProduct {
  name: string
  brand: string
  slug: string
  price_kes: number
  images: string[]
  specs: Record<string, string>
  description: string | null
  customImage?: string // base64 or URL uploaded by admin
}

function productEmailHtml(
  products: EmailProduct[],
  subject: string,
  introText: string,
  footerNote?: string
) {
  const formatKES = (n: number) =>
    'KES ' + Number(n).toLocaleString('en-KE')

  const productCards = products.map(p => {
    const imageUrl = p.customImage
      || (p.images?.[0] ? `https://batteriq.com/products/${p.images[0]}` : 'https://batteriq.com/logo.png')
    const productUrl = `https://batteriq.com/${p.brand.toLowerCase()}/${p.slug}`
    const specEntries = Object.entries(p.specs ?? {}).slice(0, 5)

    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border-bottom:1px solid #f0f0f0;padding-bottom:32px;">
        <tr>
          <td width="160" valign="top" style="padding-right:28px;">
            <img src="${imageUrl}" alt="${p.name}" width="140" height="140"
              style="border-radius:12px;object-fit:contain;background:#f7f8fc;border:1px solid #eaecf4;display:block;" />
          </td>
          <td valign="top">
            <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;font-family:system-ui,sans-serif;">${p.brand}</p>
            <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:800;color:#0a0a23;line-height:1.25;font-family:system-ui,sans-serif;">${p.name}</h2>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
              <tr>
                ${specEntries.map(([, v]) => `
                  <td style="padding-right:6px;padding-bottom:6px;">
                    <span style="display:inline-block;background:#f0f2ff;border:1px solid #dde1ff;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;color:#3730a3;font-family:system-ui,sans-serif;">${v}</span>
                  </td>
                `).join('')}
              </tr>
            </table>
            ${p.description ? `<p style="margin:0 0 14px 0;font-size:13px;color:#6b7280;line-height:1.6;font-family:system-ui,sans-serif;">${p.description.slice(0, 140)}${p.description.length > 140 ? '...' : ''}</p>` : ''}
            <p style="margin:0 0 16px 0;font-size:26px;font-weight:900;color:#0000cc;font-family:system-ui,sans-serif;letter-spacing:-0.02em;">${formatKES(p.price_kes)}</p>
            <a href="${productUrl}"
              style="display:inline-block;background:#0000ff;color:#ffffff;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;letter-spacing:0.02em;">
              View Product
            </a>
          </td>
        </tr>
      </table>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f9;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:40px 20px;">

    <!-- Logo bar -->
    <div style="text-align:center;margin-bottom:28px;">
      <img src="https://batteriq.com/logo.png" alt="Batteriq" height="36"
        style="display:inline-block;" />
    </div>

    <!-- Hero card -->
    <div style="background:#0a0a23;border-radius:16px;padding:40px 36px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.14em;">Batteriq Kenya — New Arrival</p>
      <h1 style="margin:0 0 16px 0;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;letter-spacing:-0.02em;">${subject}</h1>
      <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">${introText}</p>
    </div>

    <!-- Products -->
    <div style="background:#ffffff;border-radius:16px;padding:36px;margin-bottom:20px;">
      <p style="margin:0 0 28px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;border-bottom:1px solid #f0f0f0;padding-bottom:16px;">Featured Products</p>
      ${productCards}
    </div>

    <!-- CTA -->
    <div style="background:#ffffff;border-radius:16px;padding:32px;text-align:center;margin-bottom:20px;">
      <p style="margin:0 0 20px 0;font-size:16px;font-weight:700;color:#0a0a23;">Browse our full range at batteriq.com</p>
      <a href="https://batteriq.com"
        style="display:inline-block;background:#0000ff;color:#ffffff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;">
        Shop All Products
      </a>
    </div>

    <!-- Trust bar -->
    <div style="background:#ffffff;border-radius:16px;padding:20px 24px;margin-bottom:28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;border-right:1px solid #f0f0f0;padding:8px;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#374151;">Authorised Dealer</p>
            <p style="margin:2px 0 0 0;font-size:10px;color:#9ca3af;">EcoFlow &amp; BLUETTI</p>
          </td>
          <td style="text-align:center;border-right:1px solid #f0f0f0;padding:8px;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#374151;">M-Pesa Accepted</p>
            <p style="margin:2px 0 0 0;font-size:10px;color:#9ca3af;">Instant STK Push</p>
          </td>
          <td style="text-align:center;border-right:1px solid #f0f0f0;padding:8px;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#374151;">Same-Day Delivery</p>
            <p style="margin:2px 0 0 0;font-size:10px;color:#9ca3af;">Nairobi orders</p>
          </td>
          <td style="text-align:center;padding:8px;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#374151;">24-Month Warranty</p>
            <p style="margin:2px 0 0 0;font-size:10px;color:#9ca3af;">Manufacturer backed</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;">
      ${footerNote ? `<p style="margin:0 0 10px 0;font-size:13px;color:#6b7280;">${footerNote}</p>` : ''}
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.8;">
        Batteriq Solutions Ltd, Nairobi, Kenya<br>
        <a href="https://batteriq.com" style="color:#9ca3af;">batteriq.com</a>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <a href="https://batteriq.com/unsubscribe" style="color:#9ca3af;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { subject, introText, footerNote, productIds, customImages, testEmail } = body

    if (!subject || !introText || !productIds?.length) {
      return NextResponse.json({ error: 'subject, introText and productIds are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products } = await (supabase.from('products') as any)
      .select('id, name, brand, slug, price_kes, images, specs, description')
      .in('id', productIds)

    if (!products?.length) {
      return NextResponse.json({ error: 'No products found' }, { status: 400 })
    }

    // Attach custom images if provided
    const productsWithImages = products.map((p: EmailProduct & { id: string }) => ({
      ...p,
      customImage: customImages?.[p.id] || undefined,
    }))

    const html = productEmailHtml(productsWithImages, subject, introText, footerNote)

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'sales@batteriq.com'

    if (testEmail) {
      await resend.emails.send({ from: `Batteriq Kenya <${fromEmail}>`, to: testEmail, subject, html })
      return NextResponse.json({ sent: 1, mode: 'test' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subscribers } = await (supabase.from('newsletter_subscribers') as any)
      .select('email, name')
      .eq('status', 'active')

    if (!subscribers?.length) {
      return NextResponse.json({ error: 'No active subscribers found' }, { status: 400 })
    }

    let sent = 0
    const batchSize = 50
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      await Promise.all(batch.map((sub: { email: string }) =>
        resend.emails.send({ from: `Batteriq Kenya <${fromEmail}>`, to: sub.email, subject, html })
          .catch(() => {})
      ))
      sent += batch.length
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('newsletter_broadcasts') as any)
      .insert({ subject, intro_text: introText, product_ids: productIds, sent_count: sent })
      .catch(() => {})

    return NextResponse.json({ sent, total: subscribers.length })
  } catch (err) {
    console.error('[Newsletter Broadcast]', err)
    return NextResponse.json({ error: 'Broadcast failed' }, { status: 500 })
  }
}

export async function GET() {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscribers } = await (supabase.from('newsletter_subscribers') as any)
    .select('id, email, name, created_at, status')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: broadcasts } = await (supabase.from('newsletter_broadcasts') as any)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
    .catch(() => ({ data: [] }))

  return NextResponse.json({ subscribers: subscribers ?? [], broadcasts: broadcasts ?? [] })
}
