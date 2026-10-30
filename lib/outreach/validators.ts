import type { LeadCategory } from './types'

/**
 * Strictly blocked domains for website scraping.
 * Facebook scraping is explicitly prohibited, along with all personal social/messaging profiles.
 */
const FORBIDDEN_SCRAPE_HOSTS = [
  'facebook.com',
  'fb.com',
  'fb.me',
  'facebook.net',
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'wa.me',
  'whatsapp.com',
  't.me',
  'telegram.me',
  'youtube.com',
  'youtu.be',
  'pinterest.com',
]

/**
 * Consumer / personal webmail providers rejected for B2B outreach so we never
 * email personal individual accounts under Kenya's Data Protection Act.
 */
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'mail.com',
  'yandex.com',
  'fastmail.com',
  'tutanota.com',
  'hey.com',
])

const JUNK_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'domain.com',
  'yourdomain.com',
  'email.com',
  'yoursite.com',
  'company.com',
  'sentry.io',
  'sentry-next.wixpress.com',
  'wixpress.com',
  'wix.com',
  'squarespace.com',
  'wordpress.org',
  'wordpress.com',
  'cloudflare.com',
  'schema.org',
  'w3.org',
  'googleapis.com',
  'gstatic.com',
])

const JUNK_EMAIL_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.avif',
  '.css',
  '.js',
  '.woff',
  '.woff2',
  '.ttf',
  '.pdf',
]

/**
 * Preferred business role local-parts (higher score = better corporate inbox).
 */
const BUSINESS_ROLE_PREFIXES = [
  'info',
  'sales',
  'procurement',
  'tenders',
  'purchasing',
  'enquiries',
  'inquiries',
  'orders',
  'reservations',
  'bookings',
  'booking',
  'admissions',
  'registry',
  'secretariat',
  'communications',
  'communication',
  'pr',
  'partnerships',
  'grants',
  'programs',
  'office',
  'reception',
  'contact',
  'hello',
  'admin',
  'administration',
  'operations',
  'business',
  'corporate',
  'clinic',
  'pharmacy',
  'shop',
  'store',
  'care',
  'desk',
  'customercare',
  'support',
]

/**
 * Surrounding-text markers indicating a phone number belongs to a private individual
 * rather than the public business switchboard / reception.
 */
const PERSONAL_PHONE_CONTEXT_RE =
  /\b(personal|private|home\s*phone|my\s+cell|individual|mr\.|mrs\.|ms\.|miss\s+|dr\.|prof\.|pastor\s+|rev\.|ceo\b|founder\b|owner\b|director'?s?\s*(cell|mobile|line|no|phone)?|principal'?s?\s*(cell|mobile|phone)?|headteacher|chairman|chairperson|matron)\b/i

/**
 * Surrounding-text markers indicating an official public business contact line.
 */
const BUSINESS_PHONE_CONTEXT_RE =
  /\b(tel|telephone|phone|call\s+us|contact\s+us|office|reception|reservations?|bookings?|front\s+desk|switchboard|customer\s+care|enquiries|inquiries|admissions|sales|procurement|tenders|registry|secretariat|clinic|hospital|pharmacy|campus|orders|whatsapp|help\s*desk|hotline|headquarters|hq|branch|shop|store)\b/i

export function isForbiddenScrapeUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return true
  try {
    const parsed = new URL(rawUrl.trim())
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    return FORBIDDEN_SCRAPE_HOSTS.some(
      (forbidden) => host === forbidden || host.endsWith(`.${forbidden}`)
    )
  } catch {
    return true
  }
}

export function isForbiddenContactSubpage(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    const path = parsed.pathname.toLowerCase()
    return /\/(team|staff|leadership|board|directors|faculty|teachers|alumni|author|profile|people|members)\b/.test(
      path
    )
  } catch {
    return true
  }
}

export function extractDomain(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null
  try {
    const withProto = /^https?:\/\//i.test(rawUrl.trim())
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`
    const parsed = new URL(withProto)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    if (!host || !host.includes('.')) return null
    return host
  } catch {
    return null
  }
}

/**
 * Normalizes a Kenyan phone number to E.164 (+254XXXXXXXXX) format.
 * Returns null if the number is not a valid Kenyan number, is a premium/shortcode,
 * or fails personal-number guardrails.
 */
export function normalizeKenyanPhone(
  rawPhone: string | null | undefined,
  options: {
    source?: 'google_places' | 'website_tel_link' | 'website_text' | 'form_or_whatsapp'
    contextText?: string
  } = {}
): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null

  const contextText = options.contextText ?? ''
  const source = options.source ?? 'google_places'

  // Never accept numbers flagged with personal/individual context markers
  if (contextText && PERSONAL_PHONE_CONTEXT_RE.test(contextText)) {
    return null
  }

  // Strip extension suffixes like "ext. 102" or "x102"
  const withoutExt = rawPhone.replace(/\b(ext\.?|extension|x)\s*\d+$/i, '').trim()

  // Reject strings containing letters
  if (/[a-zA-Z]/.test(withoutExt)) return null

  const hasLeadingPlus = withoutExt.startsWith('+')
  const digits = withoutExt.replace(/\D/g, '')

  // Reject explicit foreign international numbers (e.g. +1..., +44..., +255..., +256...)
  if (hasLeadingPlus && !digits.startsWith('254')) {
    return null
  }

  let national = ''
  if (digits.startsWith('2540') && digits.length >= 12 && digits.length <= 13) {
    // Handle common typo "+254 0712 345 678" -> national "712345678"
    national = digits.slice(4)
  } else if (digits.startsWith('254') && digits.length >= 11 && digits.length <= 12) {
    national = digits.slice(3)
  } else if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
    national = digits.slice(1)
  } else if (!hasLeadingPlus && digits.length === 9 && /^[1245678]/.test(digits)) {
    national = digits
  } else {
    return null
  }

  // Reject premium-rate (900) or invalid/short prefixes or all-identical fake digits
  if (/^9/.test(national)) return null
  if (/^(\d)\1{6,}$/.test(national)) return null
  if (/1234567|000000/.test(national)) return null

  // Classify Kenyan numbering plan:
  // 1) Fixed landlines & corporate VoIP / toll-free:
  //    20xxxxxxx (Nairobi 9-digit national, or 20xxxxxx 8-digit)
  //    40..46, 50..59, 60..69 regional landlines (8 or 9 digits)
  //    800xxxxxx toll-free (9 digits)
  const isLandlineOrTollFree =
    /^(20\d{6,7}|4[0-6]\d{6,7}|5[0-9]\d{6,7}|6[0-9]\d{6,7}|800\d{6})$/.test(national)

  // 2) Kenyan wireless prefixes (7xxxxxxxx or 10xxxxxxx / 11xxxxxxx - 9 national digits)
  const isWireless = /^(7\d{8}|1[01]\d{7})$/.test(national)

  if (!isLandlineOrTollFree && !isWireless) {
    return null
  }

  // Personal-number protection for wireless numbers scraped from raw website text:
  // Unlabeled wireless numbers in arbitrary page text may belong to an individual.
  // Require either:
  //  - Official Google Places Business Profile phone,
  //  - User-submitted form / inbound WhatsApp,
  //  - Explicit tel: link on homepage/contact page (with non-personal context), OR
  //  - Explicit business label (Tel/Office/Reception/Reservations/Sales) in surrounding text.
  if (isWireless && source === 'website_text') {
    if (!contextText || !BUSINESS_PHONE_CONTEXT_RE.test(contextText)) {
      return null
    }
  }

  return `+254${national}`
}

export function isKenyanLandline(phoneE164: string): boolean {
  return /^\+254(20|4[0-6]|5[0-9]|6[0-9]|800)/.test(phoneE164)
}

/**
 * Validates and scores a candidate business email.
 * Returns normalized lowercase email if it is a valid public business email, or null if personal/junk.
 */
export function validateBusinessEmail(
  rawEmail: string | null | undefined,
  websiteDomain?: string | null
): { email: string; score: number } | null {
  if (!rawEmail || typeof rawEmail !== 'string') return null

  const cleaned = rawEmail
    .trim()
    .toLowerCase()
    .replace(/^mailto:/i, '')
    .split('?')[0]
    .replace(/^[<("']+|[>)"'.,;:]+$/g, '')

  const emailRe = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)+[a-z]{2,15}$/
  if (!emailRe.test(cleaned)) return null

  if (JUNK_EMAIL_EXTENSIONS.some((ext) => cleaned.endsWith(ext))) {
    return null
  }

  const [localPart, emailDomain] = cleaned.split('@')
  if (!localPart || !emailDomain) return null
  if (localPart.length < 2 || localPart.length > 64) return null

  // Reject noreply / bounce / system addresses
  if (/^(no-?reply|donotreply|bounce|postmaster|mailer-daemon|abuse|webmaster|hostmaster)$/i.test(localPart)) {
    return null
  }

  // Reject personal webmail providers & technical junk domains
  if (PERSONAL_EMAIL_DOMAINS.has(emailDomain) || JUNK_EMAIL_DOMAINS.has(emailDomain)) {
    return null
  }
  for (const junk of Array.from(JUNK_EMAIL_DOMAINS)) {
    if (emailDomain.endsWith(`.${junk}`)) return null
  }

  const normalizedSiteDomain = websiteDomain?.toLowerCase().replace(/^www\./, '') || null
  const matchesSiteDomain =
    !!normalizedSiteDomain &&
    (emailDomain === normalizedSiteDomain ||
      emailDomain.endsWith(`.${normalizedSiteDomain}`) ||
      normalizedSiteDomain.endsWith(`.${emailDomain}`))

  const isRolePrefix = BUSINESS_ROLE_PREFIXES.some(
    (role) => localPart === role || localPart.startsWith(`${role}.`) || localPart.startsWith(`${role}-`) || localPart.startsWith(`${role}_`)
  )

  // Reject firstname.lastname@thirdparty-domain (likely a web agency developer's personal work email)
  const looksIndividualName = /^[a-z]{2,15}[._][a-z]{2,15}$/.test(localPart) && !isRolePrefix
  if (looksIndividualName && normalizedSiteDomain && !matchesSiteDomain) {
    return null
  }
  // Even on the company's own domain, avoid personal firstname.lastname mailboxes unless it's a role inbox
  if (looksIndividualName && !isRolePrefix) {
    return null
  }

  let score = 10
  if (matchesSiteDomain) score += 50
  if (isRolePrefix) {
    const idx = BUSINESS_ROLE_PREFIXES.findIndex(
      (r) => localPart === r || localPart.startsWith(`${r}.`) || localPart.startsWith(`${r}-`)
    )
    score += 40 - Math.max(0, idx)
  }
  if (emailDomain.endsWith('.ke')) score += 15

  return { email: cleaned, score }
}

function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&#64;/g, '@')
    .replace(/&#46;/g, '.')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
}

export interface ScrapedBusinessContacts {
  emails: string[]
  bestEmail: string | null
  phones: string[]
  bestPhone: string | null
  businessSummary: string | null
  contactPageUrls: string[]
}

/**
 * Extracts public business emails, Kenyan +254 business phones, summary metadata,
 * and internal /contact links from a business website's HTML.
 */
export function extractPublicBusinessContacts(
  rawHtml: string,
  pageUrl: string
): ScrapedBusinessContacts {
  if (!rawHtml || isForbiddenScrapeUrl(pageUrl)) {
    return {
      emails: [],
      bestEmail: null,
      phones: [],
      bestPhone: null,
      businessSummary: null,
      contactPageUrls: [],
    }
  }

  const domain = extractDomain(pageUrl)
  const html = decodeBasicHtmlEntities(rawHtml)

  // 1. Extract title + meta description for Claude personalization
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const metaDescMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)

  const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''
  const metaDesc = metaDescMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''
  const combinedSummary = [title, metaDesc].filter(Boolean).join(' — ').slice(0, 420) || null

  // 2. Discover internal contact/about links on the SAME domain (excluding staff/team pages)
  const contactPageUrls: string[] = []
  const linkRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi
  let linkMatch: RegExpExecArray | null
  while ((linkMatch = linkRe.exec(html)) !== null) {
    const href = linkMatch[1].trim()
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue
    }
    try {
      const resolved = new URL(href, pageUrl)
      if (extractDomain(resolved.href) !== domain) continue
      if (isForbiddenScrapeUrl(resolved.href) || isForbiddenContactSubpage(resolved.href)) continue
      if (/\/(contact|contact-us|reach-us|get-in-touch|enquir|about|about-us)\b/i.test(resolved.pathname)) {
        const cleanUrl = `${resolved.origin}${resolved.pathname}`
        if (cleanUrl !== pageUrl && !contactPageUrls.includes(cleanUrl)) {
          contactPageUrls.push(cleanUrl)
        }
      }
    } catch {
      // ignore malformed href
    }
  }

  // 3. Extract candidate emails from mailto: links and visible text
  const emailScores = new Map<string, number>()

  const mailtoRe = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15})/gi
  let mMatch: RegExpExecArray | null
  while ((mMatch = mailtoRe.exec(html)) !== null) {
    const res = validateBusinessEmail(mMatch[1], domain)
    if (res) {
      // Bonus score for explicit mailto: link
      emailScores.set(res.email, Math.max(emailScores.get(res.email) ?? 0, res.score + 15))
    }
  }

  // Strip scripts and styles before scanning visible text
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

  const textEmailRe = /\b([a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,15})\b/g
  let eMatch: RegExpExecArray | null
  while ((eMatch = textEmailRe.exec(visibleText)) !== null) {
    const res = validateBusinessEmail(eMatch[1], domain)
    if (res) {
      emailScores.set(res.email, Math.max(emailScores.get(res.email) ?? 0, res.score))
    }
  }

  const sortedEmails = Array.from(emailScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([email]) => email)

  // 4. Extract candidate Kenyan business phones from tel: links and labeled contact text
  const phoneScores = new Map<string, number>()

  const telRe = /<a\b[^>]*href=["']tel:([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let tMatch: RegExpExecArray | null
  while ((tMatch = telRe.exec(html)) !== null) {
    const start = Math.max(0, tMatch.index - 100)
    const end = Math.min(html.length, tMatch.index + tMatch[0].length + 100)
    const surrounding = html.slice(start, end).replace(/<[^>]+>/g, ' ')
    const normalized = normalizeKenyanPhone(tMatch[1], {
      source: 'website_tel_link',
      contextText: surrounding,
    })
    if (normalized) {
      const score = isKenyanLandline(normalized) ? 100 : 75
      phoneScores.set(normalized, Math.max(phoneScores.get(normalized) ?? 0, score))
    }
  }

  const textPhoneRe = /(?:\+254|0)\s*(?:20|4[0-6]|5[0-9]|6[0-9]|800|7\d{2}|1[01]\d)[\s.-]*\d{3}[\s.-]*\d{3,4}/g
  let pMatch: RegExpExecArray | null
  while ((pMatch = textPhoneRe.exec(visibleText)) !== null) {
    const start = Math.max(0, pMatch.index - 80)
    const end = Math.min(visibleText.length, pMatch.index + pMatch[0].length + 80)
    const surrounding = visibleText.slice(start, end)
    const normalized = normalizeKenyanPhone(pMatch[0], {
      source: 'website_text',
      contextText: surrounding,
    })
    if (normalized) {
      const score = isKenyanLandline(normalized) ? 90 : 60
      phoneScores.set(normalized, Math.max(phoneScores.get(normalized) ?? 0, score))
    }
  }

  const sortedPhones = Array.from(phoneScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([phone]) => phone)

  return {
    emails: sortedEmails,
    bestEmail: sortedEmails[0] ?? null,
    phones: sortedPhones,
    bestPhone: sortedPhones[0] ?? null,
    businessSummary: combinedSummary,
    contactPageUrls: contactPageUrls.slice(0, 2),
  }
}

export function mapSearchCategoryToLeadCategory(raw: string): LeadCategory {
  const lower = raw.toLowerCase()
  if (
    lower.includes('parastatal') ||
    lower.includes('government') ||
    lower.includes('ministry') ||
    lower.includes('.go.ke') ||
    lower.includes('county') ||
    lower.includes('authority') ||
    lower.includes('commission') ||
    lower.includes('state corp')
  ) {
    return 'government'
  }
  if (
    lower.includes('ngo') ||
    lower.includes('non-profit') ||
    lower.includes('nonprofit') ||
    lower.includes('foundation') ||
    lower.includes('charity') ||
    lower.includes('humanitarian') ||
    lower.includes('red cross') ||
    lower.includes('amref') ||
    lower.includes('trust')
  ) {
    return 'ngo'
  }
  if (
    lower.includes('hospital') ||
    lower.includes('clinic') ||
    lower.includes('medical') ||
    lower.includes('maternity') ||
    lower.includes('health') ||
    lower.includes('diagnostic')
  ) {
    return 'hospital'
  }
  if (
    lower.includes('school') ||
    lower.includes('college') ||
    lower.includes('university') ||
    lower.includes('academy') ||
    lower.includes('polytechnic') ||
    lower.includes('institute') ||
    lower.includes('kindergarten') ||
    lower.includes('secondary') ||
    lower.includes('high school') ||
    lower.includes('international school') ||
    lower.includes('prep school')
  ) {
    return 'school'
  }
  if (
    lower.includes('hotel') ||
    lower.includes('lodge') ||
    lower.includes('resort') ||
    lower.includes('safari')
  ) {
    return 'hotel'
  }
  if (
    lower.includes('baby') ||
    lower.includes('nila') ||
    lower.includes('boutique') ||
    lower.includes('retail') ||
    lower.includes('supermarket') ||
    lower.includes('shop') ||
    lower.includes('store') ||
    lower.includes('pharmacy') ||
    lower.includes('chemist') ||
    lower.includes('electronics') ||
    lower.includes('hardware') ||
    lower.includes('mart') ||
    lower.includes('laundry') ||
    lower.includes('laundromat') ||
    lower.includes('dry cleaner') ||
    lower.includes('dryclean')
  ) {
    return 'retail'
  }
  if (
    lower.includes('org') ||
    lower.includes('sacco') ||
    lower.includes('cooperative') ||
    lower.includes('association') ||
    lower.includes('agency') ||
    lower.includes('corporate') ||
    lower.includes('logistics') ||
    lower.includes('tsavo') ||
    lower.includes('property') ||
    lower.includes('real estate') ||
    lower.includes('rental') ||
    lower.includes('apartment') ||
    lower.includes('letting') ||
    lower.includes('estate') ||
    lower.includes('tech') ||
    lower.includes('software') ||
    lower.includes('startup') ||
    lower.includes('fintech')
  ) {
    return 'organization'
  }
  return 'other'
}

export interface LeadCandidateInput {
  business_name: string
  category: LeadCategory
  city: string | null
  address: string | null
  website_url: string | null
  domain: string | null
  google_place_id: string | null
  email: string | null
  phone_e164: string | null
  rating?: number | null
  business_summary?: string | null
  source_details?: Record<string, unknown>
}

export interface ExistingLeadKeys {
  placeIds: Set<string>
  emails: Set<string>
  phones: Set<string>
  domains: Set<string>
}

/**
 * Deduplicates lead candidates both within the current batch and against existing database keys.
 * Requires at least one validated business contact (email or +254 business phone).
 */
export function dedupeLeadCandidates(
  candidates: LeadCandidateInput[],
  existing: ExistingLeadKeys
): { accepted: LeadCandidateInput[]; skippedDuplicates: number; skippedNoContact: number } {
  const seenPlaceIds = new Set(existing.placeIds)
  const seenEmails = new Set(Array.from(existing.emails).map((e) => e.toLowerCase()))
  const seenPhones = new Set(existing.phones)
  const seenDomains = new Set(Array.from(existing.domains).map((d) => d.toLowerCase()))

  const accepted: LeadCandidateInput[] = []
  let skippedDuplicates = 0
  let skippedNoContact = 0

  for (const c of candidates) {
    const email = c.email?.toLowerCase().trim() || null
    const phone = c.phone_e164?.trim() || null
    const placeId = c.google_place_id?.trim() || null
    const domain = c.domain?.toLowerCase().trim() || null

    if (!email && !phone) {
      skippedNoContact++
      continue
    }

    const isDup =
      (placeId && seenPlaceIds.has(placeId)) ||
      (email && seenEmails.has(email)) ||
      (phone && seenPhones.has(phone)) ||
      (domain && seenDomains.has(domain))

    if (isDup) {
      skippedDuplicates++
      continue
    }

    if (placeId) seenPlaceIds.add(placeId)
    if (email) seenEmails.add(email)
    if (phone) seenPhones.add(phone)
    if (domain) seenDomains.add(domain)

    accepted.push({
      ...c,
      email,
      phone_e164: phone,
      domain,
      google_place_id: placeId,
    })
  }

  return { accepted, skippedDuplicates, skippedNoContact }
}
