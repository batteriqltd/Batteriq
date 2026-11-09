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

/** Matches a written-in price such as "KES 291,399" or "Ksh 9,699". */
const PRICE_IN_TEXT = /\b(?:KES|KSh|Ksh)\s?[\d,]+/i

/**
 * A stored SEO override is used only when it carries no price. Prices written
 * into meta_title / meta_description go stale the moment the live price
 * changes, so those fall back to the generated text, which reads price_kes.
 */
function storedOverride(value: string | null | undefined): string | null {
  const v = value?.trim()
  return v && !PRICE_IN_TEXT.test(v) ? v : null
}

/**
 * Stored meta_title wins unless it contains a price. The generated fallback leads with the model name and
 * price because that is what Kenyan buyers actually search
 * ("ecoflow delta 2 price kenya"), and drops the brand suffix rather than the
 * model name when it has to fit 60 characters.
 */
export function buildTitle(product: Product): string {
  const stored = storedOverride(product.meta_title)
  if (stored) return clamp(stored, TITLE_MAX)

  // "<product> price in Kenya" is the dominant Kenyan search pattern, so the
  // fallbacks try that exact phrase first, then shorter variants.
  const name = brandedName(product)
  const price = kes(product.price_kes)
  const candidates = [
    `${name} Price in Kenya — ${price} | Batteriq`,
    `${name} Price in Kenya — ${price}`,
    `${name} Kenya — ${price}`,
    `${name} Price in Kenya`,
  ]
  return candidates.find(c => c.length <= TITLE_MAX) ?? clamp(`${name} Kenya`, TITLE_MAX)
}

/** "EcoFlow DELTA 3" stays as-is; "AC180" becomes "BLUETTI AC180". Avoids "EcoFlow EcoFlow …". */
export function brandedName(product: Pick<Product, 'brand' | 'name'>): string {
  const brand = product.brand === 'Bluetti' ? 'BLUETTI' : product.brand
  return product.name.toLowerCase().startsWith(product.brand.toLowerCase())
    ? product.name
    : `${brand} ${product.name}`
}

/** Google ignores relative image URLs in structured data and feeds. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export function buildDescription(product: Product): string {
  const stored = storedOverride(product.meta_description)
  if (stored) return clamp(stored, DESCRIPTION_MAX)

  const useCase = (product.specs as Record<string, string> | null)?.use_case
  const tail = useCase ? ` Ideal for ${useCase.toLowerCase()}.` : ''
  return clamp(
    `Buy the ${product.name} in Kenya at ${kes(product.price_kes)} from Batteriq, the authorised ${product.brand} dealer. Pay by M-Pesa or card, with fast Nairobi delivery.${tail}`,
    DESCRIPTION_MAX
  )
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────

export function productJsonLd(product: Product, section: ProductSection) {
  const url = productUrl(section, product.slug)
  // Google warns when an Offer has no priceValidUntil. Prices are re-read from
  // the database on every request, so a rolling one-year window is accurate.
  const validUntil = new Date()
  validUntil.setFullYear(validUntil.getFullYear() + 1)
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    url,
    image: (product.images ?? []).map(absoluteUrl),
    description: product.description ?? buildDescription(product),
    brand: { '@type': 'Brand', name: product.brand === 'Bluetti' ? 'BLUETTI' : product.brand },
    category: product.category,
    sku: product.sku,
    mpn: product.sku,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'KES',
      price: product.price_kes,
      priceValidUntil: validUntil.toISOString().slice(0, 10),
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Batteriq' },
    },
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
  const price = kes(product.price_kes)
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
