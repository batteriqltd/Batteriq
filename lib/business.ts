// ─────────────────────────────────────────────────────────────────────────────
// Business facts — the single source of truth for every page and JSON-LD block.
//
// Only facts confirmed by the owner (or already published and not yet disputed)
// belong here. Anything unknown is left out rather than guessed. Change a fact
// here and every page that shows it follows.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE_URL = 'https://batteriq.com'

export const BUSINESS = {
  name: 'Batteriq',
  /** Shown in existing JSON-LD; awaiting owner confirmation of the registered name. */
  legalName: 'Batteriq Solutions Ltd',
  alternateNames: ['Batteriq Kenya'],
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Authorised EcoFlow, BLUETTI, Anker, Soundcore and Eufy dealer in Kenya. Portable power stations, solar panels, home battery systems and accessories.",

  phone: {
    /** E.164 for schema.org and tel: links. */
    e164: '+254716822014',
    display: '0716 822 014',
    international: '+254 716 822 014',
  },
  whatsapp: 'https://wa.me/254716822014',
  email: 'info@batteriq.com',

  address: {
    locality: 'Nairobi',
    region: 'Nairobi County',
    country: 'KE',
  },
  geo: { latitude: -1.286389, longitude: 36.817223 },

  /**
   * Owner-confirmed 2026-11-09: 8am–6pm (Nairobi time). Days follow the site's
   * existing Monday–Saturday, Sunday closed. Online orders are taken at any time.
   */
  openingHours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '08:00', closes: '18:00' },
  ],
  hoursLabel: 'Mon–Sat, 8am–6pm',
  ordersAnyTime: true,

  /** Clean profile URLs, no tracking parameters. */
  social: {
    instagram: 'https://www.instagram.com/batteriq/',
    facebook: 'https://www.facebook.com/batteriqkenya',
    tiktok: 'https://www.tiktok.com/@batteriqkenya',
    linkedin: 'https://www.linkedin.com/company/batteriq',
  },

  brands: ['EcoFlow', 'BLUETTI', 'Anker', 'Soundcore', 'Eufy'],
  /** Owner-confirmed 2026-11-09: authorised dealer for every brand above. */
  dealerStatus: 'authorised',
  /** Owner-confirmed 2026-11-09. */
  warrantyMonths: 24,
  /** Owner-confirmed 2026-11-09. Order cut-off time not yet given. */
  sameDayNairobiDelivery: true,
  paymentMethods: ['M-Pesa', 'Visa', 'Mastercard', 'Cash on Delivery'],
  currency: 'KES',
  languages: ['English', 'Swahili'],
  // Return policy: not yet provided by the owner — deliberately omitted.
} as const

export const SOCIAL_URLS: string[] = Object.values(BUSINESS.social)

/** The business as one schema.org node, referenced elsewhere by its @id. */
export function businessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'Store'],
    '@id': `${SITE_URL}/#organization`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    alternateName: BUSINESS.alternateNames,
    url: BUSINESS.url,
    logo: BUSINESS.logo,
    image: `${SITE_URL}/heroes/hero-power-stations.jpg`,
    description: BUSINESS.description,
    knowsAbout: [
      'EcoFlow power stations',
      'BLUETTI power stations',
      'Portable power stations',
      'Solar panels',
      'Home battery backup',
      'Backup power for KPLC power outages',
      'Off-grid solar power in Kenya',
    ],
    telephone: BUSINESS.phone.e164,
    email: BUSINESS.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      addressCountry: BUSINESS.address.country,
    },
    geo: { '@type': 'GeoCoordinates', ...BUSINESS.geo },
    openingHoursSpecification: BUSINESS.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    paymentAccepted: BUSINESS.paymentMethods.join(', '),
    currenciesAccepted: BUSINESS.currency,
    areaServed: { '@type': 'Country', name: 'Kenya' },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: BUSINESS.phone.e164,
      email: BUSINESS.email,
      contactType: 'customer service',
      areaServed: 'KE',
      availableLanguage: BUSINESS.languages,
    },
    sameAs: SOCIAL_URLS,
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Batteriq Kenya',
    alternateName: BUSINESS.name,
    inLanguage: 'en-KE',
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}
