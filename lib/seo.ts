// ─────────────────────────────────────────────────────────────────────────────
// Shared SEO builders for product pages.
//
// Before this existed, every product template built its own title from a
// template string and never read products.meta_title — so the hand-written
// meta titles in the database were dead weight. These helpers read the stored
// values first and only fall back to a generated string.
//
// Nothing here invents specs, prices or ratings. Every value comes from the
// product row; anything missing is omitted rather than guessed.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next'
import type { Product } from '@/lib/supabase/types'
import { BUSINESS, SITE_URL } from '@/lib/business'
import { formatSpecLabel } from '@/lib/utils'
import { productType } from '@/lib/productContent'

export { SITE_URL }

/** Used when a page has no image of its own (/og-image.jpg never existed). */
export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/heroes/hero-power-stations.jpg`,
  alt: 'Batteriq Kenya — EcoFlow and BLUETTI power stations',
}

/** Absolute, no query string, no trailing slash; the home page is the bare origin. */
export function canonicalUrl(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '')
  return clean ? `${SITE_URL}${clean.startsWith('/') ? '' : '/'}${clean}` : SITE_URL
}

function plainTitle(title: Metadata['title']): string | undefined {
  if (!title) return undefined
  if (typeof title === 'string') return title
  if ('absolute' in title && title.absolute) return title.absolute
  if ('default' in title && title.default) return title.default
  return undefined
}

/**
 * Gives a page a self-referencing canonical and an og:url that always equals it.
 * Open Graph fields the page sets itself win; the rest fall back to the page's
 * own title and description, so a share preview never shows the home page's.
 */
export function withCanonical(path: string, meta: Metadata): Metadata {
  const url = canonicalUrl(path)
  return {
    ...meta,
    alternates: { ...meta.alternates, canonical: url },
    openGraph: {
      type: 'website',
      locale: 'en_KE',
      siteName: 'Batteriq Kenya',
      title: plainTitle(meta.title),
      description: meta.description ?? undefined,
      images: [DEFAULT_OG_IMAGE],
      ...meta.openGraph,
      url,
    },
    // Without this every page inherited the home page's Twitter card from the root layout.
    twitter: {
      card: 'summary_large_image',
      title: plainTitle(meta.title),
      description: meta.description ?? undefined,
      images: [DEFAULT_OG_IMAGE.url],
      ...meta.twitter,
    },
  }
}

/** Google truncates around these lengths in the SERP. */
export const TITLE_MAX = 60
export const DESCRIPTION_MAX = 160

export type ProductSection = 'ecoflow' | 'bluetti' | 'accessories'

/** Parent page of each product section — shared by the visible breadcrumb and BreadcrumbList. */
export const SECTION_PARENT: Record<ProductSection, { name: string; path: string }> = {
  ecoflow: { name: 'EcoFlow Kenya', path: '/ecoflow-kenya' },
  bluetti: { name: 'Bluetti Kenya', path: '/bluetti' },
  accessories: { name: 'Accessories', path: '/accessories' },
}

export function productUrl(section: ProductSection, slug: string) {
  return `${SITE_URL}/${section}/${slug}`
}

function kes(n: number) {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`
}

/** Trims to a length without cutting a word in half. */
function clamp(text: string, max: number) {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,—-]+$/, '')
}

/**
 * "<product> Price in Kenya – KES <price> | Batteriq", generated from the live
 * row. When that passes 60 characters the price goes first, then the brand
 * suffix, never the model name. Stored meta_title is no longer used: most of it
 * carried prices that had gone stale.
 */
export function buildTitle(product: Product): string {
  const name = brandedName(product)
  const price = Number(product.price_kes) > 1 ? kes(product.price_kes) : null
  const candidates = [
    price && `${name} Price in Kenya – ${price} | Batteriq`,
    `${name} Price in Kenya | Batteriq`,
    `${name} Price in Kenya`,
  ].filter((c): c is string => !!c)
  return candidates.find(c => c.length <= TITLE_MAX) ?? clamp(`${name} Kenya`, TITLE_MAX)
}

/** "EcoFlow DELTA 3" stays as-is; "AC180" becomes "BLUETTI AC180". Avoids "EcoFlow EcoFlow …". */
export function brandedName(product: Pick<Product, 'brand' | 'name'>): string {
  const brand = product.brand === 'Bluetti' ? 'BLUETTI' : product.brand
  return product.name.toLowerCase().startsWith(product.brand.toLowerCase())
    ? product.name
    : `${brand} ${product.name}`
}

const PRODUCT_TYPE: Record<string, string> = {
  'Power Stations': 'portable power station',
  'Solar Panels': 'solar panel',
  'Batteries': 'battery',
  'Solar Home Systems': 'solar home system',
  'Power Banks': 'power bank',
}

/**
 * Describes the picture: "{Brand} {Model} {product type}". Extra gallery images
 * say which image they are; we have no per-image view data, so we don't guess one.
 */
export function productImageAlt(
  product: Pick<Product, 'brand' | 'name' | 'category'>,
  index = 0,
  total = 1
): string {
  const name = brandedName(product)
  const type = PRODUCT_TYPE[product.category]
  const base = type && !name.toLowerCase().includes(type) ? `${name} ${type}` : name
  return total > 1 && index > 0 ? `${base}, image ${index + 1} of ${total}` : base
}

/** Google ignores relative image URLs in structured data and feeds. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

/** Leading number of a "4096Wh" / "4000W (Surge 8000W)" spec, or null. */
function leadingNumber(value: unknown, unit: 'Wh' | 'W'): number | null {
  if (typeof value !== 'string') return null
  const m = value.match(unit === 'Wh' ? /(\d+(?:\.\d+)?)\s*Wh\b/i : /(\d+(?:\.\d+)?)\s*W\b/i)
  return m ? Number(m[1]) : null
}

/**
 * "<Name> <type>: <capacity> LiFePO4, <watts> AC output. In stock in Nairobi.
 * KES <price>, M-Pesa or card, 24-month warranty." Every fact is read from the
 * live row and left out when missing; optional facts drop off the end until it
 * fits 160 characters. Stock and price are never stored, so they cannot go stale.
 */
export function buildDescription(product: Product): string {
  const specs = (product.specs ?? {}) as Record<string, unknown>
  const name = brandedName(product)
  const rawType = productType(product)?.toLowerCase() ?? null
  const type = rawType && !name.toLowerCase().includes(rawType) ? rawType : null

  const facts: string[] = []
  const capacityText = typeof specs.capacity === 'string' ? specs.capacity : ''
  // "3072Wh with B300S" is the capacity with a battery the price does not include.
  const wh = /\bwith\b/i.test(capacityText) ? null : leadingNumber(capacityText, 'Wh')
  const chemistry = /lifepo4|\blfp\b/i.test(String(specs.battery_type ?? specs.chemistry ?? '')) ? 'LiFePO4' : null
  if (wh) facts.push([`${wh}Wh`, chemistry].filter(Boolean).join(' '))
  const acW = leadingNumber(specs.ac_output ?? specs.power_output, 'W')
  if (acW) facts.push(`${acW}W ${product.category === 'Power Stations' ? 'AC output' : 'output'}`)
  const panelW = product.category === 'Solar Panels' ? leadingNumber(specs.power ?? specs.wattage, 'W') : null
  if (panelW && !name.includes(`${panelW}W`)) facts.push(`${panelW}W`)
  if (/^yes/i.test(String(specs.ups_mode ?? specs.ups ?? ''))) facts.push('automatic switch-over')

  const stock = product.in_stock ? 'In stock in Nairobi.' : 'Out of stock – reserve on WhatsApp.'
  const price = Number(product.price_kes) > 1 ? kes(product.price_kes) : null
  // Owner-confirmed: every product, accessories included, has the same warranty.
  const after = `${BUSINESS.warrantyMonths}-month warranty`
  const close = [price, 'M-Pesa or card', after].filter(Boolean).join(', ') + '.'

  for (let n = facts.length; n >= 0; n--) {
    const head = [name, type].filter(Boolean).join(' ')
    const lead = n ? `${head}: ${facts.slice(0, n).join(', ')}.` : `${head}.`
    const text = `${lead} ${stock} ${close}`
    if (text.length <= DESCRIPTION_MAX || n === 0) return clamp(text, DESCRIPTION_MAX)
  }
  return clamp(name, DESCRIPTION_MAX)
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────

/** How each brand writes its own name. */
function brandDisplay(brand: string): string {
  return brand === 'Bluetti' ? 'BLUETTI' : brand
}

/** "{Brand} {Model}" with the brand spelled the brand's way, never doubled. */
export function productDisplayName(product: Pick<Product, 'brand' | 'name'>): string {
  const brand = brandDisplay(product.brand)
  const name = product.name.trim()
  return name.toLowerCase().startsWith(product.brand.toLowerCase())
    ? `${brand}${name.slice(product.brand.length)}`
    : `${brand} ${name}`
}

/** Plain text for schema.org: no HTML, no markdown markers, collapsed spaces. */
export function plainText(text: string, max: number): string {
  const t = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_#`>]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  return clamp(t, max)
}

/** Spec keys that are bookkeeping or identifiers, not product properties. */
const NON_PROPERTY_SPEC = /^(source_|barcode$|gtin|ean$|upc$|mpn$)/i

/** Spec value under any of these keys, as a trimmed string. */
function specString(specs: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = specs[k]
    if ((typeof v === 'string' || typeof v === 'number') && String(v).trim()) return String(v).trim()
  }
  return null
}

/** GTIN-8/12/13/14 with a valid check digit, or null. */
export function validGtin(raw: string | null): { key: 'gtin8' | 'gtin12' | 'gtin13' | 'gtin14'; value: string } | null {
  const digits = (raw ?? '').replace(/\s/g, '')
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return null
  const body = digits.slice(0, -1).split('').reverse().map(Number)
  const sum = body.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  if ((10 - (sum % 10)) % 10 !== Number(digits.at(-1))) return null
  return { key: `gtin${digits.length}` as 'gtin8' | 'gtin12' | 'gtin13' | 'gtin14', value: digits }
}

/**
 * The manufacturer part number. Anker, Soundcore and Eufy SKUs are their own
 * model codes (A3947H11, T8910021); our EcoFlow numeric codes and BLUETTI-…,
 * PKIT-…, SKU-… values are internal, so they are not an MPN. A code stored as
 * specs.mpn always wins.
 */
export function manufacturerPartNumber(product: Pick<Product, 'brand' | 'sku' | 'specs'>): string | null {
  const stored = specString((product.specs ?? {}) as Record<string, unknown>, ['mpn'])
  if (stored) return stored
  const sku = product.sku?.trim() ?? ''
  if (['Anker', 'Soundcore', 'Eufy'].includes(product.brand) && /^[A-Z][A-Z0-9]{6,9}$/.test(sku) && /\d/.test(sku)) {
    return sku
  }
  return null
}

export function productJsonLd(product: Product, section: ProductSection) {
  const url = productUrl(section, product.slug)
  const specs = (product.specs ?? {}) as Record<string, unknown>
  // Google warns when an Offer has no priceValidUntil. Prices are re-read from
  // the database on every request, so a rolling one-year window is accurate.
  const validUntil = new Date()
  validUntil.setFullYear(validUntil.getFullYear() + 1)

  const mpn = manufacturerPartNumber(product)
  const gtin = validGtin(specString(specs, ['barcode', 'gtin', 'gtin13', 'ean']))
  const properties = Object.entries(specs)
    .filter(([key, value]) => !NON_PROPERTY_SPEC.test(key) && (typeof value === 'string' || typeof value === 'number') && String(value).trim())
    .map(([key, value]) => ({ '@type': 'PropertyValue', name: formatSpecLabel(key), value: String(value).trim() }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: productDisplayName(product),
    url,
    // The same gallery the page shows.
    image: Array.from(new Set((product.images ?? []).filter(Boolean).map(absoluteUrl))),
    description: plainText(product.description || buildDescription(product), 500),
    brand: { '@type': 'Brand', name: brandDisplay(product.brand) },
    category: product.category,
    sku: product.sku,
    ...(mpn ? { mpn } : {}),
    ...(gtin ? { [gtin.key]: gtin.value } : {}),
    ...(properties.length ? { additionalProperty: properties } : {}),
    ...(Number(product.price_kes) > 0 ? { offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'KES',
      // A number, exactly the price the page shows.
      price: Number(product.price_kes),
      priceValidUntil: validUntil.toISOString().slice(0, 10),
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: BUSINESS.name },
      // shippingDetails: omitted until delivery times per county are confirmed.
      // hasMerchantReturnPolicy: belongs on the organization once the policy is supplied.
    } } : {}),
    // No aggregateRating or review. products.schema_rating / schema_review_count
    // are seeded defaults, not customer reviews, and no product page shows
    // reviews. Google requires rating markup to match reviews visible on the page.
  }
}

export function breadcrumbJsonLd(product: Product, section: ProductSection) {
  const parent = SECTION_PARENT[section]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: parent.name, item: `${SITE_URL}${parent.path}` },
      { '@type': 'ListItem', position: 3, name: product.name, item: productUrl(section, product.slug) },
    ],
  }
}

// ── FAQ ──────────────────────────────────────────────────────────────────────

export type Faq = { question: string; answer: string }

/**
 * Builds three FAQs from real product data, targeting the "People Also Ask"
 * shapes Kenyan buyers use. These are rendered visibly on the page — Google
 * requires FAQ schema to match on-page content, so never emit the JSON-LD
 * without also showing these.
 */
function specValue(specs: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = specs[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

/** Joins sentences, skipping any whose data was missing. */
function sentences(...parts: (string | null | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function buildProductFaqs(product: Product): Faq[] {
  const specs = (product.specs ?? {}) as Record<string, unknown>
  const price = Number(product.price_kes) > 0 ? kes(product.price_kes) : 'a price quoted for your site'
  const brand = product.brand === 'Bluetti' ? 'BLUETTI' : product.brand
  const dealer = `Kenya's authorised ${brand} dealer`
  const warrantySentence = `It is covered by a ${BUSINESS.warrantyMonths}-month warranty.`

  // "In stock" only when we actually hold units. A listed product with no
  // tracked quantity can still be ordered, but we don't claim stock for it.
  const hasStock = product.in_stock && typeof product.stock_qty === 'number' && product.stock_qty > 0
  const delivery = 'We deliver across Nairobi and ship nationwide to all 47 counties, and you will get an official eTIMS KRA invoice with your order.'

  const faqs: Faq[] = [
    {
      question: `How much is the ${product.name} in Kenya?`,
      answer: `The ${product.name} costs ${price} at Batteriq, ${dealer}. You can pay instantly with M-Pesa or by Visa/Mastercard at checkout. ${warrantySentence}`,
    },
    {
      question: `Is the ${product.name} available in Nairobi?`,
      answer: !product.in_stock
        ? `The ${product.name} is currently out of stock. Message us on WhatsApp and we will confirm the next delivery date and reserve one for you.`
        : hasStock
          ? `Yes — the ${product.name} is in stock and ready to ship. ${delivery}`
          : `Yes — you can order the ${product.name} now. ${delivery}`,
    },
  ]

  if (product.category === 'Power Stations' || product.category === 'Batteries') {
    const capacity = specValue(specs, 'capacity')
    const chemistry = specValue(specs, 'battery_type', 'chemistry')
    const acOutput = specValue(specs, 'ac_output', 'power_output')

    let storage: string | null = null
    if (capacity && chemistry) storage = `It stores ${capacity} in a long-life ${chemistry} battery`
    else if (capacity) storage = `It stores ${capacity}`
    else if (chemistry) storage = `It uses a long-life ${chemistry} battery`

    const specSentence = storage
      ? `${storage}${acOutput ? ` and delivers ${acOutput}` : ''}.`
      : acOutput
        ? `It delivers ${acOutput}.`
        : null

    faqs.push({
      question: `Can the ${product.name} keep my home running during a KPLC blackout?`,
      answer: sentences(
        'Yes — that is what it is designed for.',
        specSentence,
        'Runtime depends on what you connect, so send us your appliance list on WhatsApp and we will size it for you.',
        warrantySentence,
      ),
    })
  } else if (product.category === 'Solar Panels') {
    faqs.push({
      question: `Does the ${product.name} work with my power station?`,
      answer: sentences(
        'It connects to compatible EcoFlow and BLUETTI power stations for solar charging.',
        'Send us your power station model on WhatsApp and we will confirm the right cable and setup before you buy.',
        warrantySentence,
      ),
    })
  } else {
    faqs.push({
      question: `Is the ${product.name} genuine and covered by warranty?`,
      answer: sentences(
        `Yes. Batteriq is ${dealer}, so every unit is genuine stock supported locally.`,
        warrantySentence,
        'Keep your Batteriq receipt as proof of purchase for any warranty claim.',
      ),
    })
  }

  return faqs
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}
