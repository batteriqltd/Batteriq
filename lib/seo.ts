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

import type { Product } from '@/lib/supabase/types'

export const SITE_URL = 'https://batteriq.com'

/** Google truncates around these lengths in the SERP. */
export const TITLE_MAX = 60
export const DESCRIPTION_MAX = 160

export type ProductSection = 'ecoflow' | 'bluetti' | 'accessories'

const SECTION_LABEL: Record<ProductSection, { name: string; href: string }> = {
  ecoflow: { name: 'EcoFlow Kenya', href: `${SITE_URL}/ecoflow-kenya` },
  bluetti: { name: 'Bluetti Kenya', href: `${SITE_URL}/bluetti` },
  accessories: { name: 'Accessories', href: `${SITE_URL}/accessories` },
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
 * Stored meta_title wins. The generated fallback leads with the model name and
 * price because that is what Kenyan buyers actually search
 * ("ecoflow delta 2 price kenya"), and drops the brand suffix rather than the
 * model name when it has to fit 60 characters.
 */
export function buildTitle(product: Product): string {
  const stored = product.meta_title?.trim()
  if (stored) return clamp(stored, TITLE_MAX)

  const full = `${product.name} Kenya — ${kes(product.price_kes)} | Batteriq`
  if (full.length <= TITLE_MAX) return full

  const noBrand = `${product.name} Kenya — ${kes(product.price_kes)}`
  if (noBrand.length <= TITLE_MAX) return noBrand

  return clamp(`${product.name} Kenya`, TITLE_MAX)
}

export function buildDescription(product: Product): string {
  const stored = product.meta_description?.trim()
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
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images ?? [],
    description: product.description ?? buildDescription(product),
    brand: { '@type': 'Brand', name: product.brand },
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'KES',
      price: product.price_kes,
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Batteriq' },
    },
    // Only emitted when we genuinely have review data — never invented.
    ...(product.schema_rating && product.schema_review_count && product.schema_review_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.schema_rating,
            reviewCount: product.schema_review_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }
}

export function breadcrumbJsonLd(product: Product, section: ProductSection) {
  const parent = SECTION_LABEL[section]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: parent.name, item: parent.href },
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
export function buildProductFaqs(product: Product): Faq[] {
  const specs = (product.specs ?? {}) as Record<string, string>
  const price = kes(product.price_kes)
  const dealer = `Kenya's authorised ${product.brand} dealer`

  const faqs: Faq[] = [
    {
      question: `How much is the ${product.name} in Kenya?`,
      answer: `The ${product.name} costs ${price} at Batteriq, ${dealer}. You can pay instantly with M-Pesa or by Visa/Mastercard at checkout, and every unit ships with its full manufacturer warranty.`,
    },
    {
      question: `Is the ${product.name} available in Nairobi?`,
      answer: product.in_stock
        ? `Yes — the ${product.name} is in stock and ready to ship. We deliver across Nairobi and ship nationwide to all 47 counties, and you will get an official eTIMS KRA invoice with your order.`
        : `The ${product.name} is currently out of stock. Message us on WhatsApp and we will confirm the next delivery date and reserve one for you.`,
    },
  ]

  const warranty = specs.warranty
  const useCase = specs.use_case
  const chemistry = specs.chemistry

  if (product.category === 'Power Stations' || product.category === 'Batteries') {
    const bits = [
      useCase ? `It is built for ${useCase.toLowerCase()}` : null,
      chemistry ? `and uses a ${chemistry} battery for long cycle life` : null,
    ].filter(Boolean).join(' ')
    faqs.push({
      question: `Can the ${product.name} keep my home running during a KPLC blackout?`,
      answer: `Yes — that is exactly what it is designed for.${bits ? ` ${bits}.` : ''} What it can run and for how long depends on which appliances you connect, so message us on WhatsApp with your list and we will size it for you.${warranty ? ` It is covered by a ${warranty} warranty.` : ''}`,
    })
  } else if (product.category === 'Solar Panels') {
    faqs.push({
      question: `Does the ${product.name} work with my power station?`,
      answer: `It connects to compatible EcoFlow and Bluetti power stations for solar charging. Send us your power station model on WhatsApp and we will confirm the right cable and setup before you buy.${warranty ? ` The panel carries a ${warranty} warranty.` : ''}`,
    })
  } else {
    faqs.push({
      question: `Is the ${product.name} genuine and covered by warranty?`,
      answer: `Yes. Batteriq is ${dealer}, so every unit is genuine stock supported locally${warranty ? ` with a ${warranty} warranty` : ''}. Keep your Batteriq receipt as proof of purchase for any warranty claim.`,
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
