// Google Merchant Center product feed.
//
// Submitting this URL in Merchant Center (Products → Add products → Scheduled
// fetch) puts every product into Google's free Shopping listings: the Shopping
// tab, Google Images, and product panels in normal search, each with price and
// stock. It is read from the live products table, so price and stock changes
// flow through on the next fetch without any manual upload.
//
// Spec: https://support.google.com/merchants/answer/7052112

import { createAdminClient } from '@/lib/supabase/admin'
import { isDeprecatedDelta } from '@/lib/delta-series'
import { absoluteUrl, brandedName, productUrl, type ProductSection } from '@/lib/seo'
import type { Product } from '@/lib/supabase/types'

export const revalidate = 3600

function section(brand: string): ProductSection {
  return brand === 'EcoFlow' ? 'ecoflow' : brand === 'Bluetti' ? 'bluetti' : 'accessories'
}

function xml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Strip control characters that make the whole feed invalid XML.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function money(n: number): string {
  return `${Number(n).toFixed(2)} KES`
}

function item(p: Product): string | null {
  if (!p.price_kes || p.price_kes <= 0) return null
  const images = (p.images ?? []).filter(Boolean).map(absoluteUrl)
  if (images.length === 0) return null

  const link = productUrl(section(p.brand), p.slug)
  const title = brandedName(p).slice(0, 150)
  const description = (p.description?.trim() || `${title} — available in Kenya from Batteriq, the authorised ${p.brand} dealer. Pay by M-Pesa or card with delivery across Kenya.`).slice(0, 5000)
  const onSale = p.compare_price_kes && p.compare_price_kes > p.price_kes

  const fields = [
    `<g:id>${xml(p.sku || p.id)}</g:id>`,
    `<g:title>${xml(title)}</g:title>`,
    `<g:description>${xml(description)}</g:description>`,
    `<g:link>${xml(link)}</g:link>`,
    `<g:image_link>${xml(images[0])}</g:image_link>`,
    ...images.slice(1, 11).map(img => `<g:additional_image_link>${xml(img)}</g:additional_image_link>`),
    `<g:availability>${p.in_stock ? 'in_stock' : 'out_of_stock'}</g:availability>`,
    onSale
      ? `<g:price>${money(p.compare_price_kes as number)}</g:price><g:sale_price>${money(p.price_kes)}</g:sale_price>`
      : `<g:price>${money(p.price_kes)}</g:price>`,
    `<g:brand>${xml(p.brand === 'Bluetti' ? 'BLUETTI' : p.brand)}</g:brand>`,
    `<g:condition>new</g:condition>`,
    p.sku ? `<g:mpn>${xml(p.sku)}</g:mpn>` : '',
    // No GTIN/barcodes are stored; without this Google disapproves the items.
    `<g:identifier_exists>no</g:identifier_exists>`,
    `<g:product_type>${xml([p.brand, p.category, p.subcategory].filter(Boolean).join(' > '))}</g:product_type>`,
  ]
  return `<item>${fields.filter(Boolean).join('')}</item>`
}

export async function GET() {
  let products: Product[] = []
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('products').select('*').order('sort_order')
    products = ((data ?? []) as Product[]).filter(
      p => !isDeprecatedDelta({ slug: p.slug, name: p.name, brand: p.brand })
    )
  } catch {
    // Empty feed rather than a 500 — Merchant Center retries on its schedule.
  }

  const items = products.map(item).filter(Boolean).join('\n')
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Batteriq Kenya — EcoFlow &amp; BLUETTI</title>
<link>https://batteriq.com</link>
<description>Power stations, solar panels and accessories from Batteriq, the authorised EcoFlow dealer in Kenya.</description>
${items}
</channel>
</rss>
`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
