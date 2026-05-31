import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function productEmailHtml(products: Array<{
  name: string
  brand: string
  slug: string
  price_kes: number
  images: string[]
  specs: Record<string, string>
  description: string | null
}>, subject: string, introText: string) {
  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE')}`

  const productCards = products.map(p => {
    const imageUrl = p.images?.[0]
      ? `https://batteriq.com/products/${p.images[0]}`
      : 'https://batteriq.com/logo.png'
    const productUrl = `https://batteriq.com/${p.brand.toLowerCase()}/${p.slug}`
    const specEntries = Object.entries(p.specs ?? {}).slice(0, 4)

    return `
      <div style="background:#f8f9ff;border-radius:16px;padding:24px;margin-bottom:20px;border:1px solid #e8eaf6;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="120" valign="top" style="padding-right:20px;">
              <img src="${imageUrl}" alt="${p.name}" width="100" height="100"
                style="border-radius:12px;object-fit:contain;background:#fff;border:1px solid #eee;" />
            </td>
            <td valign="top">
              <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;">${p.brand}</p>
              <h2 style="margin:0 0 8px;font-size:18px;font-weight:900;color:#00004d;line-height:1.2;">${p.name}</h2>
              ${specEntries.map(([k, v]) => `
                <span style="display:inline-block;background:#fff;border:1px solid #e0e7ff;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:#4f46e5;margin:0 4px 4px 0;">${v}</span>
              `).join('')}
              <p style="margin:10px 0 4px;font-size:22px;font-weight:900;color:#0000ff;font-family:monospace;">${formatKES(p.price_kes)}</p>
              ${p.description ? `<p style="margin:6px 0 12px;font-size:13px;color:#555;line-height:1.5;">${p.description.slice(0, 120)}${p.description.length > 120 ? '...' : ''}</p>` : ''}
              <a href="${productUrl}" style="display:inline-block;background:#0000ff;color:#fff;font-weight:800;font-size:13px;padding:10px 22px;border-radius:10px;text-decoration:none;">
                Shop Now →
              </a>
            </td>
          </tr>
        </table>
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f0f2f8;font-family:system-ui,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#00004d,#0000ff);border-radius:20px;padding:32px;text-align:center;margin-bottom:24px;">
          <img src="https://batteriq.com/logo.png" alt="Batteriq" height="40" style="margin-bottom:16px;" />
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;line-height:1.2;">${subject}</h1>
          <p style="margin:12px 0 0;color:#a5b4fc;font-size:14px;">${introText}</p>
        </div>

        <!-- Products -->
        <div style="background:#fff;border-radius:20px;padding:24px;margin-bottom:20px;">
          <p style="margin:0 0 20px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;">🔥 New Arrivals</p>
          ${productCards}
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://batteriq.com" style="display:inline-block;background:#0000ff;color:#fff;font-weight:900;font-size:16px;padding:16px 40px;border-radius:14px;text-decoration:none;">
            View All Products →
          </a>
        </div>

        <!-- Trust -->
        <div style="background:#fff;border-radius:16px;padding:20px;text-align:center;margin-bottom:20px;">
          <p style="margin:0;font-size:12px;color:#888;">
            ✅ Official EcoFlow & BLUETTI Dealer &nbsp;·&nbsp; 📱 M-Pesa Accepted &nbsp;·&nbsp; 🚚 Same-Day Nairobi Delivery &nbsp;·&nbsp; 🛡️ 24-Month Warranty
          </p>
        </div>

        <!-- Footer -->
        <p style="text-align:center;font-size:11px;color:#aaa;margin:0;">
          Batteriq Solutions Ltd, Nairobi, Kenya &nbsp;·&nbsp;
          <a href="https://batteriq.com" style="color:#aaa;">batteriq.com</a> &nbsp;·&nbsp;
          <a href="https://batteriq.com/unsubscribe" style="color:#aaa;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `
}

export async function POST(request: NextRequest) {
  try {
    const { subject, introText, productIds, testEmail } = await request.json()

    if (!subject || !introText || !productIds?.length) {
      return NextResponse.json({ error: 'subject, introText and productIds are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get selected products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products } = await (supabase.from('products') as any)
      .select('name, brand, slug, price_kes, images, specs, description')
      .in('id', productIds)

    if (!products?.length) {
      return NextResponse.json({ error: 'No products found' }, { status: 400 })
    }

    const html = productEmailHtml(products, subject, introText)

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')

    // Test mode — send to single email
    if (testEmail) {
      await resend.emails.send({
        from: `Batteriq Kenya <${process.env.RESEND_FROM_EMAIL ?? 'sales@batteriq.com'}>`,
        to: testEmail,
        subject,
        html,
      })
      return NextResponse.json({ sent: 1, mode: 'test' })
    }

    // Get all active subscribers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subscribers } = await (supabase.from('newsletter_subscribers') as any)
      .select('email, name')
      .eq('status', 'active')

    if (!subscribers?.length) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 })
    }

    // Send in batches of 50
    let sent = 0
    const batchSize = 50
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      await Promise.all(batch.map((sub: { email: string; name?: string }) =>
        resend.emails.send({
          from: `Batteriq Kenya <${process.env.RESEND_FROM_EMAIL ?? 'sales@batteriq.com'}>`,
          to: sub.email,
          subject,
          html,
        }).catch(() => {}) // don't fail entire batch for one bad email
      ))
      sent += batch.length
    }

    // Log the broadcast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('newsletter_broadcasts') as any).insert({
      subject,
      intro_text: introText,
      product_ids: productIds,
      sent_count: sent,
    }).catch(() => {})

    return NextResponse.json({ sent, total: subscribers.length })
  } catch (err) {
    console.error('[Newsletter Broadcast]', err)
    return NextResponse.json({ error: 'Broadcast failed' }, { status: 500 })
  }
}

export async function GET() {
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

  return NextResponse.json({
    subscribers: subscribers ?? [],
    broadcasts: broadcasts ?? [],
  })
}
