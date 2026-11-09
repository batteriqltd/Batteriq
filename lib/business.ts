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
  /** Owner-confirmed 2026-11-09. */
  legalName: 'Batteriq Solutions Ltd',
  alternateNames: ['Batteriq Kenya', 'BatterIQ'],
  url: SITE_URL,
  /** Square PNG for Google (the wide /logo.png is 1832x471). */
  logo: { url: `${SITE_URL}/brand/batteriq-logo-512.png`, width: 512, height: 512 },
  image: `${SITE_URL}/heroes/hero-power-stations.jpg`,
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

  /**
   * Customers cannot be told to visit until the owner confirms a public showroom
   * with a street address. While false, the business is an OnlineStore: no geo,
   * no street address, hours on the customer-service contact point.
   */
  publicShowroom: false,
  /** Owner: "central Nairobi". No street address given. */
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
  /**
   * Owner-confirmed 2026-11-09: 24 months for every product, accessories included.
   */
  warrantyMonths: 24,
  /** Owner-confirmed 2026-11-09. Order cut-off time not yet given. */
  sameDayNairobiDelivery: true,
  paymentMethods: ['M-Pesa', 'Visa', 'Mastercard', 'Cash on Delivery'],
  currency: 'KES',
  /** From the existing contact markup; awaiting owner confirmation. */
  languages: ['English', 'Swahili'],
  // Return policy: not yet provided by the owner — deliberately omitted.
} as const

export const SOCIAL_URLS: string[] = Object.values(BUSINESS.social)
