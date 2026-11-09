// ─────────────────────────────────────────────────────────────────────────────
// Site-wide JSON-LD builders. Every value comes from lib/business.ts or from the
// database rows passed in. Entities link by @id so the business is described
// once (on the home page) and referenced everywhere else.
// ─────────────────────────────────────────────────────────────────────────────

import { BUSINESS, SITE_URL, SOCIAL_URLS } from '@/lib/business'
import { canonicalUrl, productUrl, type ProductSection } from '@/lib/seo'

export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`

/** How other entities point at the business without repeating it. */
export const organizationRef = { '@id': ORGANIZATION_ID }

/** Same rule as ProductCard: EcoFlow → /ecoflow, Bluetti → /bluetti, the rest → /accessories. */
export function productSection(brand: string): ProductSection {
  return brand === 'EcoFlow' ? 'ecoflow' : brand === 'Bluetti' ? 'bluetti' : 'accessories'
}

function hoursSpecification() {
  return BUSINESS.openingHours.map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.days,
    opens: h.opens,
    closes: h.closes,
  }))
}

/**
 * The business, once. OnlineStore until the owner confirms a public showroom
 * with a street address; then ElectronicsStore with geo, hours and priceRange
 * (those are LocalBusiness properties and are invalid on an OnlineStore).
 */
export function organizationJsonLd(opts: { priceRange?: string | null } = {}) {
  const showroom = BUSINESS.publicShowroom
  return {
    '@context': 'https://schema.org',
    '@type': showroom ? 'ElectronicsStore' : 'OnlineStore',
    '@id': ORGANIZATION_ID,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    alternateName: BUSINESS.alternateNames,
    url: BUSINESS.url,
    logo: { '@type': 'ImageObject', ...BUSINESS.logo },
    image: BUSINESS.image,
    description: BUSINESS.description,
    email: BUSINESS.email,
    telephone: BUSINESS.phone.e164,
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      addressCountry: BUSINESS.address.country,
    },
    areaServed: { '@type': 'Country', name: 'Kenya', identifier: 'KE' },
    sameAs: SOCIAL_URLS,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: BUSINESS.phone.e164,
      email: BUSINESS.email,
      areaServed: 'KE',
      availableLanguage: BUSINESS.languages,
      hoursAvailable: hoursSpecification(),
    },
    ...(showroom
      ? {
          geo: { '@type': 'GeoCoordinates', ...BUSINESS.geo },
          openingHoursSpecification: hoursSpecification(),
          ...(opts.priceRange ? { priceRange: opts.priceRange } : {}),
        }
      : {}),
    // hasMerchantReturnPolicy: omitted until the owner gives the real policy.
    // No aggregateRating / review: no approved, visible review source.
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: BUSINESS.name,
    url: SITE_URL,
    inLanguage: 'en-KE',
    publisher: organizationRef,
  }
}

export type Crumb = { name: string; path: string }

/** Must mirror the breadcrumb that is visible on the page. */
export function breadcrumbListJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonicalUrl(c.path),
    })),
  }
}

/** A category or brand page: the products it shows, in display order. */
export function collectionPageJsonLd(opts: {
  path: string
  name: string
  description: string
  products: { brand: string; slug: string }[]
}) {
  const url = canonicalUrl(opts.path)
  const seen = new Set<string>()
  const items = opts.products
    .map((p) => productUrl(productSection(p.brand), p.slug))
    .filter((u) => (seen.has(u) ? false : (seen.add(u), true)))
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name: opts.name,
    url,
    description: opts.description,
    inLanguage: 'en-KE',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((u, i) => ({ '@type': 'ListItem', position: i + 1, url: u })),
    },
  }
}

export function articleJsonLd(opts: {
  path: string
  headline: string
  description: string
  image?: string
  datePublished: string
  dateModified: string
}) {
  const url = canonicalUrl(opts.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: opts.headline,
    description: opts.description,
    image: [opts.image ?? BUSINESS.image],
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    inLanguage: 'en-KE',
    author: { '@type': 'Organization', '@id': ORGANIZATION_ID, name: BUSINESS.name, url: SITE_URL },
    publisher: organizationRef,
  }
}

/** Renders a JSON-LD block. `<` is escaped so text can never close the script tag. */
export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') }
}
