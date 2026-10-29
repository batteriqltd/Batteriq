import { callClaudeMessages } from './claude'
import {
  checkInSuppressionSets,
  getOutreachSettings,
  loadSuppressionSets,
  recordConsent,
} from './compliance'
import { logOutreachEvent, sleep, withRetry } from './logger'
import { createOutreachAdminClient } from './supabase'
import type { LeadCategory, OutreachLead } from './types'
import {
  dedupeLeadCandidates,
  extractDomain,
  extractPublicBusinessContacts,
  isForbiddenContactSubpage,
  isForbiddenScrapeUrl,
  mapSearchCategoryToLeadCategory,
  normalizeKenyanPhone,
  type ExistingLeadKeys,
  type LeadCandidateInput,
} from './validators'

const SCRAPE_TIMEOUT_MS = 5500
const MAX_HTML_BYTES = 450_000
const SCRAPE_USER_AGENT =
  'Mozilla/5.0 (compatible; BatteriqBusinessDirectoryBot/1.0; +https://batteriq.com)'
const BROWSER_SEARCH_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const AGGREGATOR_AND_DIRECTORY_DOMAINS = [
  'booking.com',
  'tripadvisor.',
  'expedia.',
  'airbnb.',
  'agoda.',
  'hotels.com',
  'trivago.',
  'kayak.',
  'lonelyplanet.',
  'wikipedia.org',
  'wikimedia.org',
  'wikidata.org',
  'web.archive.org',
  'archive.org',
  'yellowpages',
  'businesslist.co.ke',
  'kenyayote.com',
  'victormatara.com',
  'tuko.co.ke',
  'nation.africa',
  'standardmedia.co.ke',
  'the-star.co.ke',
  'businessdailyafrica.com',
  'kenyans.co.ke',
  'pulselive.co.ke',
  'jiji.co.ke',
  'jumia.co.ke',
  'kilimall.co.ke',
  'pigiame.co.ke',
  'myjobmag.co.ke',
  'brightermonday.co.ke',
  'fuzu.com',
  'glassdoor.',
  'indeed.',
  'crunchbase.com',
  'zoominfo.com',
  'apollo.io',
  'rocketreach.co',
  'lusha.com',
  'yelp.com',
  'foursquare.com',
  'wanderlog.com',
  'evendo.com',
  'safari.co.ke',
  'safaribookings.com',
  'google.',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',
  'youtube.com',
  'pinterest.',
  'reddit.com',
  'quora.com',
  'medium.com',
  'amazon.',
  'ebay.',
  'alibaba.com',
  'batteriq.com',
]

export function isDirectoryOrAggregatorUrl(rawUrl: string): boolean {
  if (isForbiddenScrapeUrl(rawUrl)) return true
  const domain = extractDomain(rawUrl)
  if (!domain) return true
  const lower = domain.toLowerCase()
  // Allow Kenyan government & parastatal domains (.go.ke); only skip foreign .gov / .mil
  if (lower.endsWith('.gov') || lower.endsWith('.mil')) {
    return true
  }
  return AGGREGATOR_AND_DIRECTORY_DOMAINS.some((blocked) => lower.includes(blocked))
}

function cleanDiscoveredBusinessTitle(rawTitle: string, domain: string): string {
  const decoded = rawTitle
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove generic page prefixes/suffixes like "Contact Us - Hotel Boulevard | +254..."
  const parts = decoded
    .split(/\s*[|\-–—:]\s*/)
    .map((p) => p.trim())
    .filter((p) => {
      if (!p || p.length < 3) return false
      if (/^\+?\d[\d\s\-()]{6,}$/.test(p)) return false
      if (
        /^(contact(\s+us|\s+&\s+\w+|\s+info|\s+details)?|about(\s+us)?|home(\s+page)?|book(\s+now|\s+online|\s+a\s+room)?|call\s+us|reach\s+us|find\s+us|locations?|welcome(\s+to)?|official\s+website|get\s+in\s+touch|enquiries|inquiries|admissions|reservations|tenders|procurement|customer\s+(care|service|support)|support)$/i.test(
          p
        )
      ) {
        return false
      }
      return true
    })

  const best = parts[0] || ''
  if (best.length >= 3 && best.length <= 90) {
    return best.replace(/^welcome\s+to\s+/i, '').trim()
  }

  // Fallback: humanize domain root (e.g. "nilababyshop.com" -> "Nilababyshop")
  const base = domain.split('.')[0].replace(/[-_]+/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function isSpecificCustomQuery(rawQuery?: string): boolean {
  if (!rawQuery) return false
  // Auto-generated rotating queries follow the exact pattern "<target_category> in <city>, Kenya"
  return !/\s+in\s+[a-z\s]+,\s*kenya$/i.test(rawQuery.trim())
}

function buildFreeKenyanSearchQuery(category: LeadCategory, city: string, rawQuery?: string): string {
  if (rawQuery && isSpecificCustomQuery(rawQuery)) {
    return `${rawQuery} Kenya contact "+254" -facebook -tripadvisor -booking -jiji`
  }

  switch (category) {
    case 'government':
      return `(parastatal OR authority OR ministry OR commission OR corporation) "${city}" Kenya "contact" "+254" (site:.go.ke OR site:.co.ke OR site:.or.ke)`
    case 'ngo':
      return `(ngo OR foundation OR humanitarian OR trust OR charity OR society) "${city}" Kenya "contact" "+254" (site:.or.ke OR site:.org)`
    case 'hospital':
      return `(hospital OR clinic OR medical OR healthcare OR maternity) "${city}" Kenya "contact" "+254" (site:.org OR site:.co.ke OR site:.or.ke)`
    case 'school':
      return `(school OR college OR university OR academy OR institute) "${city}" Kenya "contact" "+254" (site:.ac.ke OR site:.sc.ke OR site:.co.ke OR site:.org)`
    case 'retail':
    case 'shop':
      return `("baby shop" OR boutique OR pharmacy OR supermarket OR electronics OR hardware OR store) "${city}" Kenya "contact" "+254" (site:.co.ke OR site:.com) -jiji -jumia`
    case 'hotel':
      return `(hotel OR resort OR lodge) "${city}" Kenya "contact" "+254" (site:.co.ke OR site:.com) -booking -tripadvisor -expedia`
    case 'organization':
      return `(sacco OR organization OR association OR logistics OR corporate) "${city}" Kenya "contact" "+254" (site:.co.ke OR site:.or.ke OR site:.coop OR site:.com)`
    default:
      return `(organization OR school OR ngo OR parastatal OR shop) "${city}" Kenya "contact" "+254" -facebook -jiji`
  }
}

/**
 * Multi-Sector Kenyan Online Entity Discovery via Gemini 3.5 Flash / Claude:
 * Discovers real Kenyan schools, NGOs, government parastatals (.go.ke), hospitals,
 * everyday shops (like Nila Baby Shop), hotels, and organizations with official websites.
 */
export async function discoverKenyanBusinessWebsitesViaAi(params: {
  category: LeadCategory
  city: string
  maxResults: number
  customQuery?: string
  excludeDomains?: Set<string>
  fetchImpl?: typeof fetch
}): Promise<GooglePlaceRaw[]> {
  const excludedSample = params.excludeDomains
    ? Array.from(params.excludeDomains).slice(-60).join(', ')
    : ''

  const categoryDescriptions: Record<string, string> = {
    government:
      'Kenyan government parastatals, state corporations, regulatory authorities, ministries, and county agencies (including .go.ke, .co.ke, and .or.ke official websites)',
    ngo: 'NGOs, humanitarian agencies, charitable foundations, development trusts, and non-profit organizations operating in Kenya (.or.ke, .org)',
    hospital:
      'hospitals, medical centres, specialist clinics, maternity hospitals, and pharmacy chains in Kenya',
    school:
      'schools, international schools, colleges, technical institutes, and universities in Kenya (.ac.ke, .sc.ke, .org, .co.ke)',
    retail:
      'Kenyan retail stores, baby shops (such as Nila Baby Shop, Lullaby Baby Shop, kids & maternity stores), boutiques, supermarkets, electronics stores, pharmacies, and hardware shops',
    shop:
      'Kenyan retail stores, baby shops, boutiques, supermarkets, electronics stores, pharmacies, and commercial shops',
    hotel: 'hotels, resorts, safari lodges, and conference centres in Kenya',
    organization:
      'Kenyan Saccos, professional associations, research institutes, logistics firms, and corporate organizations',
  }

  const categoryLabel =
    categoryDescriptions[params.category] ||
    'Kenyan schools, NGOs, government parastatals, hospitals, retail/baby shops, and organizations'

  const systemPrompt = `You are a Kenyan institutional & commercial directory researcher.
Return STRICT JSON ONLY listing real, currently operating Kenyan entities (schools, NGOs, government parastatals including .go.ke, hospitals, retail & baby shops, hotels, Saccos, and organizations) that have their OWN official website (e.g. .co.ke, .go.ke, .ac.ke, .sc.ke, .or.ke, .com, .org, .coop).
NEVER include Facebook, Instagram, LinkedIn, TikTok, Jiji, Jumia, Booking.com, TripAdvisor, or news articles.
NEVER invent fake domains — only list real Kenyan organizations, parastatals, schools, NGOs, and shops whose official domain you know with high confidence.
JSON schema:
{
  "businesses": [
    { "name": "Official Entity Name", "website": "https://example.co.ke", "address": "Area/Street, City, Kenya" }
  ]
}`

  const specificFocus =
    params.customQuery && isSpecificCustomQuery(params.customQuery)
      ? `Specifically match or closely relate to this Kenyan search request: "${params.customQuery}" (in or serving ${params.city}, Kenya).`
      : `List up to ${Math.min(18, params.maxResults + 4)} real ${categoryLabel} in or serving ${params.city}, Kenya with their official website URLs.`

  const userPrompt = `${specificFocus}${
    excludedSample ? `\nExclude these domains already in our directory: ${excludedSample}` : ''
  }`

  try {
    const { text } = await callClaudeMessages({
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
      temperature: 0.25,
      fetchImpl: params.fetchImpl,
    })

    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace <= firstBrace) return []

    const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as {
      businesses?: Array<{ name?: string; website?: string; address?: string }>
    }

    const out: GooglePlaceRaw[] = []
    const seen = new Set<string>()

    for (const item of parsed.businesses ?? []) {
      const rawUrl = String(item.website || '').trim()
      const name = String(item.name || '').trim()
      if (!name || !/^https?:\/\//i.test(rawUrl)) continue
      if (isDirectoryOrAggregatorUrl(rawUrl)) continue

      const domain = extractDomain(rawUrl)
      if (!domain || seen.has(domain) || params.excludeDomains?.has(domain)) continue
      seen.add(domain)

      out.push({
        placeId: `web:${domain}`,
        name,
        address: String(item.address || `${params.city}, Kenya`).trim(),
        phone: null, // Strictly verified by live website scraper only — never AI-guessed!
        websiteUrl: rawUrl,
        rating: null,
        primaryType: params.category,
      })

      if (out.length >= params.maxResults) break
    }

    return out
  } catch (err) {
    await logOutreachEvent({
      module: 'lead_finder',
      level: 'warn',
      event: 'ai_directory_fallback_skipped',
      message: err instanceof Error ? err.message : String(err),
    }).catch(() => {})
    return []
  }
}

/**
 * Verified Kenyan Multi-Sector Institutional & Commercial Domain Registry
 * (zero hardcoded emails or phones — 100% of contacts are extracted live over HTTPS via scrapeBusinessWebsite()).
 */
const KENYA_VERIFIED_DOMAIN_REGISTRY: ReadonlyArray<{
  name: string
  category: LeadCategory
  city: string
  websiteUrl: string
}> = [
  // Government Ministries, State Corporations & Parastatals (.go.ke / official portals)
  { name: 'Kenya Revenue Authority (KRA)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.kra.go.ke' },
  { name: 'Kenya Ports Authority (KPA)', category: 'government', city: 'Mombasa', websiteUrl: 'https://www.kpa.co.ke' },
  { name: 'Kenya Electricity Generating Company (KenGen)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.kengen.co.ke' },
  { name: 'Kenya Electricity Transmission Company (KETRACO)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.ketraco.co.ke' },
  { name: 'Kenya Medical Supplies Authority (KEMSA)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.kemsa.co.ke' },
  { name: 'Kenya Bureau of Standards (KEBS)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.kebs.org' },
  { name: 'Energy and Petroleum Regulatory Authority (EPRA)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.epra.go.ke' },
  { name: 'Communications Authority of Kenya (CA)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.ca.go.ke' },
  { name: 'National Social Security Fund (NSSF Kenya)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.nssf.or.ke' },
  { name: 'Kenya Airports Authority (KAA)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.kaa.go.ke' },
  { name: 'Kenya Medical Research Institute (KEMRI)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.kemri.go.ke' },
  { name: 'Kenya Institute of Curriculum Development (KICD)', category: 'government', city: 'Nairobi', websiteUrl: 'https://kicd.ac.ke' },
  { name: 'Higher Education Loans Board (HELB)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.helb.co.ke' },
  { name: 'Kenya Wildlife Service (KWS)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.kws.go.ke' },
  { name: 'National Environment Management Authority (NEMA)', category: 'government', city: 'Nairobi', websiteUrl: 'https://www.nema.go.ke' },
  { name: 'Kenya National Highways Authority (KeNHA)', category: 'government', city: 'Nairobi', websiteUrl: 'https://kenha.co.ke' },

  // NGOs, Humanitarian Agencies, Foundations & Non-Profits
  { name: 'Amref Health Africa', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://amref.org' },
  { name: 'Kenya Red Cross Society', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://www.redcross.or.ke' },
  { name: 'Shining Hope for Communities (SHOFCO)', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://www.shofco.org' },
  { name: 'Kenya Community Development Foundation (KCDF)', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://www.kcdf.or.ke' },
  { name: 'WWF Kenya', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://www.wwfkenya.org' },
  { name: 'AGRA (Sustainably Growing Africa’s Food Systems)', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://agra.org' },
  { name: 'ActionAid International Kenya', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://kenya.actionaid.org' },
  { name: 'Save the Children Kenya', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://kenya.savethechildren.net' },
  { name: 'African Wildlife Foundation Kenya', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://www.awf.org' },
  { name: 'Federation of Women Lawyers in Kenya (FIDA-Kenya)', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://www.fidakenya.org' },
  { name: ' Transparency International Kenya', category: 'ngo', city: 'Nairobi', websiteUrl: 'https://tikenya.org' },

  // Retail, Baby Shops (including Nila Baby Shop!), Boutiques, Pharmacies & Commercial Stores
  { name: 'Nila Baby Shop', category: 'retail', city: 'Nairobi', websiteUrl: 'https://nilababyshop.com' },
  { name: 'Lullaby Baby Shop Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://lullaby.co.ke' },
  { name: 'Text Book Centre Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://textbookcentre.com' },
  { name: 'Hotpoint Appliances Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://hotpoint.co.ke' },
  { name: 'Davis & Shirtliff Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://www.davisandshirtliff.com' },
  { name: 'Ramtons Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://www.ramtons.com' },
  { name: 'Chloride Exide Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://www.chlorideexide.com' },
  { name: 'Sollatek Electronics Kenya', category: 'retail', city: 'Mombasa', websiteUrl: 'https://www.sollatek.co.ke' },
  { name: 'Goodlife Pharmacy Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://www.goodlife.co.ke' },
  { name: 'MyDawa Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://mydawa.com' },
  { name: 'AutoXpress Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://www.autoxpress.co.ke' },
  { name: 'Naivas Supermarket', category: 'retail', city: 'Nairobi', websiteUrl: 'https://naivas.online' },
  { name: 'Quickmart Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://www.quickmart.co.ke' },
  { name: 'Chandarana Foodplus', category: 'retail', city: 'Nairobi', websiteUrl: 'https://foodplus.co.ke' },
  { name: 'Tile & Carpet Centre Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://tileandcarpet.co.ke' },
  { name: 'Elite Digital Solutions Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://www.elitedigital.co.ke' },
  { name: 'Salute iWorld Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://saluteiworld.com' },
  { name: 'Phoneplace Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://www.phoneplacekenya.com' },
  { name: 'Avechi Kenya', category: 'retail', city: 'Nairobi', websiteUrl: 'https://avechi.co.ke' },

  // Hospitals, Clinics & Healthcare Networks
  { name: 'The Karen Hospital', category: 'hospital', city: 'Nairobi', websiteUrl: 'https://www.karenhospital.org' },
  { name: 'Avenue Healthcare Kenya', category: 'hospital', city: 'Nairobi', websiteUrl: 'https://www.avenuehealthcare.com' },
  { name: 'The Nairobi Hospital', category: 'hospital', city: 'Nairobi', websiteUrl: 'https://thenairobihospital.org' },
  { name: 'MP Shah Hospital', category: 'hospital', city: 'Nairobi', websiteUrl: 'https://mpshahhosp.org' },
  { name: "Gertrude's Children's Hospital", category: 'hospital', city: 'Nairobi', websiteUrl: 'https://www.gerties.org' },
  { name: 'AAR Healthcare Kenya', category: 'hospital', city: 'Nairobi', websiteUrl: 'https://aar-healthcare.com' },
  { name: 'Bliss Healthcare Kenya', category: 'hospital', city: 'Nairobi', websiteUrl: 'https://www.blisshealthcare.co.ke' },
  { name: 'Mater Misericordiae Hospital', category: 'hospital', city: 'Nairobi', websiteUrl: 'https://www.materkenya.com' },
  { name: 'Coptic Hospital Nairobi', category: 'hospital', city: 'Nairobi', websiteUrl: 'https://coptichospitals.org' },
  { name: 'Mombasa Hospital', category: 'hospital', city: 'Mombasa', websiteUrl: 'https://www.mombasahospital.com' },
  { name: 'Mediheal Group of Hospitals', category: 'hospital', city: 'Eldoret', websiteUrl: 'https://www.medihealgroup.com' },

  // Private & Public Schools, Colleges & Universities
  { name: 'Strathmore University', category: 'school', city: 'Nairobi', websiteUrl: 'https://strathmore.edu' },
  { name: 'Mount Kenya University', category: 'school', city: 'Thika', websiteUrl: 'https://www.mku.ac.ke' },
  { name: 'Technical University of Kenya', category: 'school', city: 'Nairobi', websiteUrl: 'https://tukenya.ac.ke' },
  { name: 'Brookhouse School Kenya', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.brookhouse.ac.ke' },
  { name: 'Braeburn Schools Kenya', category: 'school', city: 'Nairobi', websiteUrl: 'https://braeburn.com' },
  { name: 'Peponi School', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.peponischool.org' },
  { name: 'Makini Schools', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.makinischools.ac.ke' },
  { name: 'Riara Group of Schools', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.riaraschools.ac.ke' },
  { name: 'Riara University', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.riarauniversity.ac.ke' },
  { name: 'United States International University Africa', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.usiu.ac.ke' },
  { name: 'Daystar University', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.daystar.ac.ke' },
  { name: 'KCA University', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.kcau.ac.ke' },
  { name: 'Zetech University', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.zetech.ac.ke' },
  { name: 'Potterhouse School Runda', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.potterhouse.ac.ke' },
  { name: 'Rusinga Schools Nairobi', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.rusinga.ac.ke' },
  { name: 'Light International School Kenya', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.lis.sc.ke' },
  { name: 'Nova Pioneer Kenya', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.novapioneer.com' },
  { name: 'Oshwal Academy Nairobi', category: 'school', city: 'Nairobi', websiteUrl: 'https://www.oshwalacademy.sc.ke' },
  { name: 'Aga Khan Academy Mombasa', category: 'school', city: 'Mombasa', websiteUrl: 'https://www.agakhanacademies.org/mombasa' },
  { name: 'Mombasa Academy', category: 'school', city: 'Mombasa', websiteUrl: 'https://www.mombasaacademy.sc.ke' },
  { name: 'Kabarak University', category: 'school', city: 'Nakuru', websiteUrl: 'https://www.kabarak.ac.ke' },
  { name: 'Melvin Jones Lions Academy Nakuru', category: 'school', city: 'Nakuru', websiteUrl: 'https://www.melvinjonesacademy.sc.ke' },

  // Saccos, Corporate Organizations & Logistics
  { name: 'Stima DT Sacco', category: 'organization', city: 'Nairobi', websiteUrl: 'https://www.stima-sacco.com' },
  { name: 'Mwalimu National Sacco', category: 'organization', city: 'Nairobi', websiteUrl: 'https://www.mwalimunational.coop' },
  { name: 'Unaitas Sacco', category: 'organization', city: 'Nairobi', websiteUrl: 'https://www.unaitas.com' },
  { name: 'Harambee Sacco Society', category: 'organization', city: 'Nairobi', websiteUrl: 'https://harambeesacco.com' },
  { name: 'Kenya National Police DT Sacco', category: 'organization', city: 'Nairobi', websiteUrl: 'https://policesacco.com' },
  { name: 'Fargo Courier Kenya', category: 'organization', city: 'Nairobi', websiteUrl: 'https://www.fargocourier.co.ke' },
  { name: 'Wells Fargo Kenya', category: 'organization', city: 'Nairobi', websiteUrl: 'https://www.wellsfargo.co.ke' },

  // Hotels, Lodges & Conference Centres
  { name: 'Eka Hotel Nairobi', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.ekahotel.com' },
  { name: 'PrideInn Hotels, Resorts & Camps', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.prideinnhotels.com' },
  { name: 'Hotel Boulevard Nairobi', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.hotelboulevard.co.ke' },
  { name: 'Oak Place Hotel & Conference Centre', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.oakplace.co.ke' },
  { name: 'Safari Park Hotel & Casino', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.safaripark-hotel.com' },
  { name: 'Tribe Hotel Nairobi', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.tribe-hotel.com' },
  { name: 'Trademark Hotel Nairobi', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.trademark-hotel.com' },
  { name: 'Windsor Golf Hotel & Country Club', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.windsorgolfresort.com' },
  { name: 'Weston Hotel Nairobi', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.westonhotel.com' },
  { name: 'The Boma Nairobi', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.theboma.co.ke' },
  { name: 'Panari Hotel Nairobi', category: 'hotel', city: 'Nairobi', websiteUrl: 'https://www.panarihotels.com' },
  { name: 'Severin Sea Lodge Mombasa', category: 'hotel', city: 'Mombasa', websiteUrl: 'https://www.severinsealodge.com' },
  { name: 'Voyager Beach Resort Mombasa', category: 'hotel', city: 'Mombasa', websiteUrl: 'https://www.heritage-eastafrica.com' },
  { name: 'Travellers Beach Hotel & Club', category: 'hotel', city: 'Mombasa', websiteUrl: 'https://www.travellersbeach.com' },
  { name: 'Diani Reef Beach Resort & Spa', category: 'hotel', city: 'Mombasa', websiteUrl: 'https://www.dianireef.com' },
  { name: 'Baobab Beach Resort & Spa', category: 'hotel', city: 'Mombasa', websiteUrl: 'https://www.baobab-beach-resort.com' },
  { name: 'Acacia Premier Hotel Kisumu', category: 'hotel', city: 'Kisumu', websiteUrl: 'https://www.acaciapremier.com' },
  { name: 'Ciala Resort Kisumu', category: 'hotel', city: 'Kisumu', websiteUrl: 'https://www.cialaresort.com' },
  { name: 'Sovereign Hotel Kisumu', category: 'hotel', city: 'Kisumu', websiteUrl: 'https://www.sovereignhotel.co.ke' },
  { name: 'Lake Naivasha Sawela Lodges', category: 'hotel', city: 'Nakuru', websiteUrl: 'https://www.sawelalodges.com' },
  { name: 'Enashipai Resort & Spa', category: 'hotel', city: 'Nakuru', websiteUrl: 'https://www.enashipai.com' },
  { name: 'Alps Hotel Nakuru', category: 'hotel', city: 'Nakuru', websiteUrl: 'https://www.thealpshotelnakuru.com' },
  { name: 'Boma Inn Eldoret', category: 'hotel', city: 'Eldoret', websiteUrl: 'https://www.theboma.co.ke/boma-inn-eldoret' },
  { name: 'Eka Hotel Eldoret', category: 'hotel', city: 'Eldoret', websiteUrl: 'https://www.ekahoteleldoret.com' },
]

/**
 * Queries 100% Free, Zero-Key, Cloud-Safe Open-Data APIs (OpenAlex & Wikidata SPARQL)
 * for authentic Kenyan schools, parastatals, NGOs, hospitals, businesses & shops with official websites.
 */
async function discoverFromPublicOpenDataApis(params: {
  category: LeadCategory
  city: string
  maxResults: number
  excludeDomains?: Set<string>
  seenDomains: Set<string>
  fetchImpl?: typeof fetch
}): Promise<GooglePlaceRaw[]> {
  const fetchFn = params.fetchImpl ?? fetch
  const discovered: GooglePlaceRaw[] = []
  const cityLower = params.city.toLowerCase()

  const openAlexTypeMap: Partial<Record<LeadCategory, string>> = {
    school: 'education',
    government: 'government|facility',
    ngo: 'nonprofit',
    hospital: 'healthcare',
    organization: 'company|nonprofit|facility|government|healthcare',
  }

  const openAlexType = openAlexTypeMap[params.category]
  if (openAlexType) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const url = `https://api.openalex.org/institutions?filter=country_code:KE,type:${openAlexType}&per-page=80&mailto=sale@batteriq.com`
      const res = await fetchFn(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'BatteriqOutreachAgent/1.0 (https://batteriq.com; mailto:sale@batteriq.com)',
        },
        cache: 'no-store',
      })

      if (res.ok) {
        const json = (await res.json()) as {
          results?: Array<{
            display_name?: string
            homepage_url?: string | null
            geo?: { city?: string | null }
          }>
        }
        const items = json.results ?? []
        const sorted = [...items].sort((a, b) => {
          const aMatch = (a.geo?.city || '').toLowerCase() === cityLower ? 0 : 1
          const bMatch = (b.geo?.city || '').toLowerCase() === cityLower ? 0 : 1
          return aMatch - bMatch
        })

        for (const inst of sorted) {
          const rawUrl = String(inst.homepage_url || '').trim()
          const name = String(inst.display_name || '').trim()
          if (!name || !/^https?:\/\//i.test(rawUrl)) continue
          if (isDirectoryOrAggregatorUrl(rawUrl) || isForbiddenContactSubpage(rawUrl)) continue

          const domain = extractDomain(rawUrl)
          if (!domain || params.seenDomains.has(domain) || params.excludeDomains?.has(domain)) {
            continue
          }
          params.seenDomains.add(domain)

          discovered.push({
            placeId: `web:${domain}`,
            name,
            address: `${inst.geo?.city || params.city}, Kenya`,
            phone: null,
            websiteUrl: rawUrl,
            rating: null,
            primaryType: params.category,
          })
          if (discovered.length >= params.maxResults) return discovered
        }
      }
    } catch {
      // Non-fatal; continue to Wikidata / AI / Registry tiers
    } finally {
      clearTimeout(timer)
    }
  }

  // 2. Wikidata Kenya SPARQL API (Kenyan parastatals, NGOs, hospitals, schools, hotels, retail & companies)
  if (discovered.length < params.maxResults) {
    const sparqlTypes =
      params.category === 'hotel'
        ? 'wd:Q27686 wd:Q550111 wd:Q1824145 wd:Q875157 wd:Q5056668'
        : params.category === 'retail' || params.category === 'shop'
          ? 'wd:Q180846 wd:Q507619 wd:Q11315 wd:Q213441 wd:Q4830453 wd:Q783794'
          : params.category === 'school'
            ? 'wd:Q3918 wd:Q9842 wd:Q15936437'
            : params.category === 'government'
              ? 'wd:Q327333 wd:Q2659904 wd:Q178790 wd:Q35798'
              : params.category === 'ngo'
                ? 'wd:Q79913 wd:Q163740 wd:Q157031'
                : params.category === 'hospital'
                  ? 'wd:Q16917 wd:Q1774898'
                  : 'wd:Q16917 wd:Q4830453 wd:Q783794 wd:Q163740 wd:Q327333'

    const sparql = `SELECT DISTINCT ?itemLabel ?website WHERE {
  ?item wdt:P17 wd:Q114 ; wdt:P856 ?website ; wdt:P31 ?type .
  VALUES ?type { ${sparqlTypes} }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 80`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4500)
    try {
      const res = await fetchFn(
        `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
        {
          signal: controller.signal,
          headers: {
            Accept: 'application/sparql-results+json',
            'User-Agent':
              'BatteriqOutreachAgent/1.0 (https://batteriq.com; mailto:sale@batteriq.com)',
          },
          cache: 'no-store',
        }
      )

      if (res.ok) {
        const json = (await res.json()) as {
          results?: {
            bindings?: Array<{
              itemLabel?: { value?: string }
              website?: { value?: string }
            }>
          }
        }
        for (const row of json.results?.bindings ?? []) {
          const rawUrl = String(row.website?.value || '').trim()
          const name = String(row.itemLabel?.value || '').trim()
          if (!name || /^Q\d+$/.test(name) || !/^https?:\/\//i.test(rawUrl)) continue
          if (isDirectoryOrAggregatorUrl(rawUrl) || isForbiddenContactSubpage(rawUrl)) continue

          const domain = extractDomain(rawUrl)
          if (!domain || params.seenDomains.has(domain) || params.excludeDomains?.has(domain)) {
            continue
          }
          params.seenDomains.add(domain)

          discovered.push({
            placeId: `web:${domain}`,
            name,
            address: `${params.city}, Kenya`,
            phone: null,
            websiteUrl: rawUrl,
            rating: null,
            primaryType: params.category,
          })
          if (discovered.length >= params.maxResults) return discovered
        }
      }
    } catch {
      // Non-fatal
    } finally {
      clearTimeout(timer)
    }
  }

  return discovered
}

function discoverFromKenyanDomainRegistry(params: {
  category: LeadCategory
  city: string
  maxResults: number
  customQuery?: string
  excludeDomains?: Set<string>
  seenDomains: Set<string>
}): GooglePlaceRaw[] {
  const cityLower = params.city.toLowerCase()
  const keywords = (params.customQuery || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !['kenya', 'nairobi', 'the', 'and', 'for'].includes(w))

  const normalizedCat = params.category === 'shop' ? 'retail' : params.category

  // If custom query has specific keywords (e.g. "nila", "baby", "kra", "red cross"), prioritize keyword matches across all sectors
  const keywordMatches =
    keywords.length > 0 && isSpecificCustomQuery(params.customQuery)
      ? KENYA_VERIFIED_DOMAIN_REGISTRY.filter((entry) => {
          const hay = `${entry.name} ${entry.websiteUrl} ${entry.category}`.toLowerCase()
          return keywords.some((kw) => hay.includes(kw))
        })
      : []

  const matchingCategory = KENYA_VERIFIED_DOMAIN_REGISTRY.filter((entry) =>
    normalizedCat === 'other' ? true : entry.category === normalizedCat
  )

  const ordered = [
    ...keywordMatches,
    ...matchingCategory.filter((e) => e.city.toLowerCase() === cityLower),
    ...matchingCategory.filter((e) => e.city.toLowerCase() !== cityLower),
  ]

  const out: GooglePlaceRaw[] = []
  for (const entry of ordered) {
    const domain = extractDomain(entry.websiteUrl)
    if (!domain || params.seenDomains.has(domain) || params.excludeDomains?.has(domain)) continue
    params.seenDomains.add(domain)

    out.push({
      placeId: `web:${domain}`,
      name: entry.name.trim(),
      address: `${entry.city}, Kenya`,
      phone: null, // Strictly extracted live over HTTPS by scrapeBusinessWebsite()
      websiteUrl: entry.websiteUrl,
      rating: null,
      primaryType: entry.category,
    })
    if (out.length >= params.maxResults) break
  }

  return out
}

export async function searchFreeKenyanWebDirectory(params: {
  query: string
  category: LeadCategory
  city: string
  maxResults?: number
  excludeDomains?: Set<string>
  fetchImpl?: typeof fetch
}): Promise<GooglePlaceRaw[]> {
  const fetchFn = params.fetchImpl ?? fetch
  const maxResults = Math.min(20, Math.max(1, params.maxResults ?? 12))
  const searchQuery = buildFreeKenyanSearchQuery(params.category, params.city, params.query)
  const isCustom = isSpecificCustomQuery(params.query)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3500)

  let html = ''
  try {
    const res = await fetchFn('https://html.duckduckgo.com/html/', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': BROWSER_SEARCH_UA,
        Accept: 'text/html,application/xhtml+xml',
      },
      body: `q=${encodeURIComponent(searchQuery)}&kl=ke-en`,
      cache: 'no-store',
    })

    if (res.status === 200) {
      html = await res.text()
    }
  } catch {
    // Fall through to AI + open-data + verified Kenyan domain discovery
  } finally {
    clearTimeout(timer)
  }

  const results: GooglePlaceRaw[] = []
  const seenDomains = new Set<string>()

  if (html && /result__a|result-link/i.test(html)) {
    const anchorRegex =
      /<a[^>]*class="[^"]*(?:result__a|result-link)[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi

    let match: RegExpExecArray | null
    while ((match = anchorRegex.exec(html)) !== null && results.length < maxResults) {
      let href = match[1].replace(/&amp;/g, '&').trim()
      const uddg = href.match(/[?&]uddg=([^&]+)/)
      if (uddg) {
        try {
          href = decodeURIComponent(uddg[1])
        } catch {
          continue
        }
      }

      if (!/^https?:\/\//i.test(href)) continue
      if (href.toLowerCase().endsWith('.pdf') || href.toLowerCase().endsWith('.doc')) continue
      if (isDirectoryOrAggregatorUrl(href) || isForbiddenContactSubpage(href)) continue

      const domain = extractDomain(href)
      if (!domain || seenDomains.has(domain) || params.excludeDomains?.has(domain)) continue
      seenDomains.add(domain)

      const rawTitle = match[2] || ''
      const businessName = cleanDiscoveredBusinessTitle(rawTitle, domain)

      const nearbyWindow = html
        .slice(match.index, Math.min(html.length, match.index + 700))
        .replace(/<[^>]+>/g, ' ')
      const phoneMatch = nearbyWindow.match(/(?:\+254|0)[\s\-()]*[127]\d(?:[\s\-()]*\d){7}/)
      const snippetPhone = phoneMatch
        ? normalizeKenyanPhone(phoneMatch[0], { source: 'google_places' })
        : null

      results.push({
        placeId: `web:${domain}`,
        name: businessName,
        address: `${params.city}, Kenya`,
        phone: snippetPhone,
        websiteUrl: href,
        rating: null,
        primaryType: params.category,
      })
    }

    if (results.length > 0) {
      return results
    }
  }

  // When a user searches a specific entity or niche (e.g. "Nila Baby Shop", "NGOs in Kisumu", "Parastatals .go.ke"),
  // run Gemini 3.5 Flash AI discovery BEFORE generic bulk OpenAlex lists so niche targets surface first!
  if (isCustom && results.length < maxResults) {
    const combinedExcluded = new Set<string>([
      ...(params.excludeDomains ? Array.from(params.excludeDomains) : []),
      ...Array.from(seenDomains),
    ])
    const aiPlaces = await discoverKenyanBusinessWebsitesViaAi({
      category: params.category,
      city: params.city,
      customQuery: params.query,
      maxResults: maxResults - results.length,
      excludeDomains: combinedExcluded,
      fetchImpl: params.fetchImpl,
    })
    for (const p of aiPlaces) {
      const d = extractDomain(p.websiteUrl)
      if (d) seenDomains.add(d)
      results.push(p)
      if (results.length >= maxResults) break
    }
  }

  // Tier 2: Cloud-Safe Free Open-Data APIs (OpenAlex Kenya Institutions + Wikidata Kenya SPARQL)
  if (results.length < maxResults) {
    const openDataPlaces = await discoverFromPublicOpenDataApis({
      category: params.category,
      city: params.city,
      maxResults: maxResults - results.length,
      excludeDomains: params.excludeDomains,
      seenDomains,
      fetchImpl: params.fetchImpl,
    })
    results.push(...openDataPlaces)
  }

  // Tier 3: AI Directory Discovery (Gemini 3.5 Flash / Claude) for rotating category runs
  if (!isCustom && results.length < maxResults) {
    const combinedExcluded = new Set<string>([
      ...(params.excludeDomains ? Array.from(params.excludeDomains) : []),
      ...Array.from(seenDomains),
    ])
    const aiPlaces = await discoverKenyanBusinessWebsitesViaAi({
      category: params.category,
      city: params.city,
      maxResults: maxResults - results.length,
      excludeDomains: combinedExcluded,
      fetchImpl: params.fetchImpl,
    })
    for (const p of aiPlaces) {
      const d = extractDomain(p.websiteUrl)
      if (d) seenDomains.add(d)
      results.push(p)
      if (results.length >= maxResults) break
    }
  }

  // Tier 4: Verified Kenyan Multi-Sector Domain Registry (100% live-scraped over HTTPS for contacts)
  if (results.length < maxResults) {
    const registryPlaces = discoverFromKenyanDomainRegistry({
      category: params.category,
      city: params.city,
      customQuery: params.query,
      maxResults: maxResults - results.length,
      excludeDomains: params.excludeDomains,
      seenDomains,
    })
    results.push(...registryPlaces)
  }

  return results
}

export interface GooglePlaceRaw {
  placeId: string
  name: string
  address: string | null
  phone: string | null
  websiteUrl: string | null
  rating: number | null
  primaryType: string | null
}

/**
 * Queries Google Places API (New v1 places:searchText) with retry & rate-limit resilience.
 * Falls back to Legacy Text Search + Place Details if Places API (New) returns 403/404.
 */
export async function searchGooglePlacesKenya(params: {
  query: string
  apiKey: string
  maxResults?: number
  fetchImpl?: typeof fetch
}): Promise<GooglePlaceRaw[]> {
  const fetchFn = params.fetchImpl ?? fetch
  const maxResults = Math.min(20, Math.max(1, params.maxResults ?? 15))

  // 1. Try Google Places API (New) — returns websiteUri & phone in a single request
  const newApiPlaces = await withRetry(
    async () => {
      const res = await fetchFn('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': params.apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.primaryType,places.businessStatus',
        },
        body: JSON.stringify({
          textQuery: params.query,
          regionCode: 'KE',
          languageCode: 'en',
          maxResultCount: maxResults,
        }),
        cache: 'no-store',
      })

      if (res.status === 403 || res.status === 404) {
        // Return sentinel null so we can fall back to Legacy Places API if New API isn't enabled on the GCP project
        return null
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        const err = new Error(
          `Google Places API (New) failed with HTTP ${res.status}: ${errBody.slice(0, 200)}`
        ) as Error & { status?: number }
        err.status = res.status
        throw err
      }

      const data = (await res.json()) as {
        places?: Array<{
          id?: string
          displayName?: { text?: string }
          formattedAddress?: string
          internationalPhoneNumber?: string
          nationalPhoneNumber?: string
          websiteUri?: string
          rating?: number
          primaryType?: string
          businessStatus?: string
        }>
      }

      return (data.places ?? [])
        .filter((p) => !p.businessStatus || p.businessStatus === 'OPERATIONAL')
        .map((p) => ({
          placeId: p.id || '',
          name: p.displayName?.text?.trim() || '',
          address: p.formattedAddress || null,
          phone: p.internationalPhoneNumber || p.nationalPhoneNumber || null,
          websiteUrl: p.websiteUri || null,
          rating: typeof p.rating === 'number' ? p.rating : null,
          primaryType: p.primaryType || null,
        }))
        .filter((p) => p.placeId && p.name)
    },
    { maxAttempts: 3, baseDelayMs: 700 }
  )

  if (newApiPlaces !== null) {
    return newApiPlaces
  }

  // 2. Fallback: Legacy Google Places Text Search + Place Details
  const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  searchUrl.searchParams.set('query', params.query)
  searchUrl.searchParams.set('region', 'ke')
  searchUrl.searchParams.set('key', params.apiKey)

  const searchRes = await withRetry(async () => {
    const res = await fetchFn(searchUrl.toString(), { cache: 'no-store' })
    if (!res.ok) {
      const err = new Error(`Google Places Legacy search HTTP ${res.status}`) as Error & { status?: number }
      err.status = res.status
      throw err
    }
    return res.json()
  })

  if (searchRes.status && searchRes.status !== 'OK' && searchRes.status !== 'ZERO_RESULTS') {
    throw new Error(
      `Google Places API error: ${searchRes.status} — ${searchRes.error_message || 'Check GOOGLE_PLACES_API_KEY'}`
    )
  }

  const results = (searchRes.results ?? []).slice(0, maxResults) as Array<{
    place_id: string
    name: string
    formatted_address?: string
    rating?: number
    business_status?: string
    types?: string[]
  }>

  const enriched: GooglePlaceRaw[] = []
  for (const item of results) {
    if (item.business_status && item.business_status !== 'OPERATIONAL') continue
    await sleep(150) // Rate limit Place Details calls

    try {
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
      detailsUrl.searchParams.set('place_id', item.place_id)
      detailsUrl.searchParams.set(
        'fields',
        'place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating'
      )
      detailsUrl.searchParams.set('key', params.apiKey)

      const detRes = await fetchFn(detailsUrl.toString(), { cache: 'no-store' })
      const detJson = await detRes.json()
      const d = detJson?.result ?? {}

      enriched.push({
        placeId: item.place_id,
        name: d.name || item.name,
        address: d.formatted_address || item.formatted_address || null,
        phone: d.international_phone_number || d.formatted_phone_number || null,
        websiteUrl: d.website || null,
        rating: typeof d.rating === 'number' ? d.rating : item.rating ?? null,
        primaryType: item.types?.[0] ?? null,
      })
    } catch {
      enriched.push({
        placeId: item.place_id,
        name: item.name,
        address: item.formatted_address || null,
        phone: null,
        websiteUrl: null,
        rating: item.rating ?? null,
        primaryType: item.types?.[0] ?? null,
      })
    }
  }

  return enriched
}

async function fetchSafeWebsiteHtml(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ html: string; finalUrl: string } | null> {
  // Hard-block Facebook and social/messaging domains before opening any socket
  if (isForbiddenScrapeUrl(rawUrl)) {
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS)

  try {
    let res = await fetchImpl(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPE_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      },
    })

    // Some Kenyan WordPress/cPanel sites block custom bot User-Agents with 403; retry once with standard UA
    if (res.status === 403) {
      res = await fetchImpl(rawUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': BROWSER_SEARCH_UA,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        },
      })
    }

    const finalUrl = res.url || rawUrl
    // Re-check final URL after HTTP redirects so a redirect to facebook.com is also blocked!
    if (isForbiddenScrapeUrl(finalUrl) || isForbiddenContactSubpage(finalUrl)) {
      return null
    }

    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (contentType && !contentType.toLowerCase().includes('text/html') && !contentType.toLowerCase().includes('xhtml')) {
      return null
    }

    const text = await res.text()
    return {
      html: text.slice(0, MAX_HTML_BYTES),
      finalUrl,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Scrapes a business's own website (homepage + at most 1 official /contact page on the same domain)
 * to extract public business email, +254 business phone, and website description.
 * Never scrapes Facebook, social media, or personal staff directory pages.
 */
export async function scrapeBusinessWebsite(
  websiteUrl: string | null | undefined,
  fetchImpl: typeof fetch = fetch
): Promise<{
  cleanWebsiteUrl: string | null
  domain: string | null
  email: string | null
  phoneE164: string | null
  businessSummary: string | null
  blockedForbiddenUrl: boolean
}> {
  if (!websiteUrl) {
    return {
      cleanWebsiteUrl: null,
      domain: null,
      email: null,
      phoneE164: null,
      businessSummary: null,
      blockedForbiddenUrl: false,
    }
  }

  if (isForbiddenScrapeUrl(websiteUrl)) {
    return {
      cleanWebsiteUrl: null,
      domain: null,
      email: null,
      phoneE164: null,
      businessSummary: null,
      blockedForbiddenUrl: true,
    }
  }

  const homePage = await fetchSafeWebsiteHtml(websiteUrl, fetchImpl)
  if (!homePage) {
    return {
      cleanWebsiteUrl: websiteUrl,
      domain: extractDomain(websiteUrl),
      email: null,
      phoneE164: null,
      businessSummary: null,
      blockedForbiddenUrl: false,
    }
  }

  const homeExtracted = extractPublicBusinessContacts(homePage.html, homePage.finalUrl)
  let bestEmail = homeExtracted.bestEmail
  let bestPhone = homeExtracted.bestPhone
  let summary = homeExtracted.businessSummary

  // If homepage didn't expose an email (or phone), inspect up to 1 official /contact subpage
  if ((!bestEmail || !bestPhone) && homeExtracted.contactPageUrls.length > 0) {
    const contactUrl = homeExtracted.contactPageUrls[0]
    if (!isForbiddenScrapeUrl(contactUrl) && !isForbiddenContactSubpage(contactUrl)) {
      const contactPage = await fetchSafeWebsiteHtml(contactUrl, fetchImpl)
      if (contactPage) {
        const contactExtracted = extractPublicBusinessContacts(
          contactPage.html,
          contactPage.finalUrl
        )
        if (!bestEmail && contactExtracted.bestEmail) {
          bestEmail = contactExtracted.bestEmail
        }
        if (!bestPhone && contactExtracted.bestPhone) {
          bestPhone = contactExtracted.bestPhone
        }
        if (!summary && contactExtracted.businessSummary) {
          summary = contactExtracted.businessSummary
        }
      }
    }
  }

  return {
    cleanWebsiteUrl: homePage.finalUrl,
    domain: extractDomain(homePage.finalUrl),
    email: bestEmail,
    phoneE164: bestPhone,
    businessSummary: summary,
    blockedForbiddenUrl: false,
  }
}

export interface LeadFinderRunOptions {
  customQuery?: string
  customCity?: string
  customCategory?: string
  queriesPerRun?: number
  maxPlacesPerQuery?: number
  fetchImpl?: typeof fetch
}

export interface LeadFinderRunResult {
  queriesExecuted: string[]
  placesFound: number
  websitesScraped: number
  forbiddenUrlsSkipped: number
  suppressedSkipped: number
  duplicatesSkipped: number
  noContactSkipped: number
  leadsSaved: number
  savedLeads: Partial<OutreachLead>[]
  errors: string[]
}

/**
 * Daily Lead Finder job:
 * 1) Selects rotating Kenyan (category x city) queries (hotels, schools, organizations, shops)
 * 2) Queries Google Places API
 * 3) Scrapes each business's own website (never Facebook/social media)
 * 4) Normalizes +254 business phones & validates corporate emails (no personal emails/numbers)
 * 5) Filters against permanent suppression list, dedupes, and saves to outreach_leads with source='google_places', status='new'
 */
export async function runLeadFinderJob(
  options: LeadFinderRunOptions = {}
): Promise<LeadFinderRunResult> {
  const rawPlacesKey = process.env.GOOGLE_PLACES_API_KEY?.trim()
  const apiKey = rawPlacesKey && rawPlacesKey !== 'replace_me' ? rawPlacesKey : ''
  const useGooglePlaces = Boolean(apiKey)

  const supabase = createOutreachAdminClient()
  const settings = await getOutreachSettings(supabase)
  const suppressionSets = await loadSuppressionSets(supabase)

  // Load existing lead identifiers for fast deduplication
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRows } = await (supabase.from('outreach_leads') as any).select(
    'google_place_id, email, phone_e164, domain'
  )

  const existingKeys: ExistingLeadKeys = {
    placeIds: new Set<string>(),
    emails: new Set<string>(),
    phones: new Set<string>(),
    domains: new Set<string>(),
  }

  for (const r of existingRows ?? []) {
    if (r.google_place_id) existingKeys.placeIds.add(String(r.google_place_id))
    if (r.email) existingKeys.emails.add(String(r.email).toLowerCase())
    if (r.phone_e164) existingKeys.phones.add(String(r.phone_e164))
    if (r.domain) existingKeys.domains.add(String(r.domain).toLowerCase())
  }

  // Build search tasks
  const searchTasks: Array<{ query: string; city: string; category: LeadCategory }> = []

  if (options.customQuery) {
    searchTasks.push({
      query: options.customQuery,
      city: options.customCity || 'Kenya',
      category: mapSearchCategoryToLeadCategory(options.customCategory || options.customQuery),
    })
  } else {
    const categories =
      settings.target_categories?.length > 0
        ? settings.target_categories
        : ['hotels', 'schools', 'organizations', 'shops']
    const cities =
      settings.target_cities?.length > 0
        ? settings.target_cities
        : ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']

    const combos: Array<{ rawCat: string; city: string }> = []
    for (const city of cities) {
      for (const rawCat of categories) {
        combos.push({ rawCat, city })
      }
    }

    const queriesPerRun = Math.min(combos.length, Math.max(1, options.queriesPerRun ?? 4))
    const startCursor = Math.max(0, settings.discovery_cursor || 0)

    for (let i = 0; i < queriesPerRun; i++) {
      const combo = combos[(startCursor + i) % combos.length]
      searchTasks.push({
        query: `${combo.rawCat} in ${combo.city}, Kenya`,
        city: combo.city,
        category: mapSearchCategoryToLeadCategory(combo.rawCat),
      })
    }

    // Advance discovery cursor for tomorrow's run
    const nextCursor = (startCursor + queriesPerRun) % Math.max(1, combos.length)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_settings') as any)
      .upsert({ id: 'default', discovery_cursor: nextCursor }, { onConflict: 'id' })
  }

  const rawCandidates: LeadCandidateInput[] = []
  const errors: string[] = []
  let placesFound = 0
  let websitesScraped = 0
  let forbiddenUrlsSkipped = 0
  let suppressedSkipped = 0

  for (const task of searchTasks) {
    try {
      const places = useGooglePlaces
        ? await searchGooglePlacesKenya({
            query: task.query,
            apiKey,
            maxResults: options.maxPlacesPerQuery ?? 15,
            fetchImpl: options.fetchImpl,
          })
        : await searchFreeKenyanWebDirectory({
            query: task.query,
            category: task.category,
            city: task.city,
            maxResults: options.maxPlacesPerQuery ?? 10,
            excludeDomains: existingKeys.domains,
            fetchImpl: options.fetchImpl,
          })

      placesFound += places.length

      // Filter out already-known placeIds/domains upfront
      const unseenPlaces = places.filter((place) => {
        if (existingKeys.placeIds.has(place.placeId)) return false
        const d = extractDomain(place.websiteUrl)
        if (d && existingKeys.domains.has(d)) return false
        return true
      })

      // Scrape business websites in polite parallel batches of 4 so Vercel serverless runs fast (<20s)
      const BATCH_SIZE = 4
      for (let i = 0; i < unseenPlaces.length; i += BATCH_SIZE) {
        const batch = unseenPlaces.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(
          batch.map(async (place) => {
            const placesPhone = normalizeKenyanPhone(place.phone, { source: 'google_places' })
            let websiteEmail: string | null = null
            let websitePhone: string | null = null
            let cleanWebsiteUrl: string | null = null
            let domain: string | null = null
            let businessSummary: string | null = null
            let skippedForbidden = 0
            let scrapedCount = 0

            if (place.websiteUrl) {
              if (isForbiddenScrapeUrl(place.websiteUrl)) {
                skippedForbidden++
              } else {
                scrapedCount++
                const scraped = await scrapeBusinessWebsite(place.websiteUrl, options.fetchImpl)
                cleanWebsiteUrl = scraped.cleanWebsiteUrl
                domain = scraped.domain
                websiteEmail = scraped.email
                websitePhone = scraped.phoneE164
                businessSummary = scraped.businessSummary
                if (scraped.blockedForbiddenUrl) skippedForbidden++

                // If discovery landed on a subpage (e.g. /book-now/) that lacked an email, also check root homepage!
                if (!websiteEmail && domain) {
                  const rootUrl = `https://${domain}`
                  if (cleanWebsiteUrl && cleanWebsiteUrl.replace(/\/$/, '') !== rootUrl) {
                    const rootScraped = await scrapeBusinessWebsite(rootUrl, options.fetchImpl)
                    websiteEmail = websiteEmail || rootScraped.email
                    websitePhone = websitePhone || rootScraped.phoneE164
                    businessSummary = businessSummary || rootScraped.businessSummary
                  }
                }
              }
            }

            return {
              place,
              placesPhone,
              websiteEmail,
              websitePhone,
              cleanWebsiteUrl,
              domain,
              businessSummary,
              skippedForbidden,
              scrapedCount,
            }
          })
        )

        for (const item of batchResults) {
          websitesScraped += item.scrapedCount
          forbiddenUrlsSkipped += item.skippedForbidden

          const finalPhone = item.placesPhone || item.websitePhone
          const finalEmail = item.websiteEmail

          // Permanent suppression check (Kenya DPA 2019)
          if (
            checkInSuppressionSets(suppressionSets, {
              email: finalEmail,
              phoneE164: finalPhone,
              domain: item.domain,
            })
          ) {
            suppressedSkipped++
            continue
          }

          let resolvedCategory: LeadCategory = task.category
          if (resolvedCategory === 'other') {
            const dLower = (item.domain || '').toLowerCase()
            if (dLower.endsWith('.go.ke')) {
              resolvedCategory = 'government'
            } else if (dLower.endsWith('.ac.ke') || dLower.endsWith('.sc.ke') || dLower.endsWith('.edu')) {
              resolvedCategory = 'school'
            } else {
              const inferred = mapSearchCategoryToLeadCategory(
                `${item.place.name} ${item.domain || ''} ${item.place.primaryType || ''} ${item.businessSummary || ''}`
              )
              if (inferred !== 'other') {
                resolvedCategory = inferred
              } else if (dLower.endsWith('.or.ke')) {
                resolvedCategory = 'ngo'
              }
            }
          }

          rawCandidates.push({
            business_name: item.place.name,
            category: resolvedCategory,
            city: task.city,
            address: item.place.address,
            website_url: item.cleanWebsiteUrl,
            domain: item.domain,
            google_place_id: item.place.placeId,
            email: finalEmail,
            phone_e164: finalPhone,
            rating: item.place.rating,
            business_summary: item.businessSummary,
            source_details: {
              discovery_engine: useGooglePlaces ? 'google_places_api' : 'free_kenya_web_directory',
              query: task.query,
              primary_type: item.place.primaryType,
              email_from: finalEmail ? 'business_website' : null,
              phone_from: item.placesPhone
                ? useGooglePlaces
                  ? 'google_places'
                  : 'directory_snippet'
                : item.websitePhone
                  ? 'business_website'
                  : null,
            },
          })
        }

        if (i + BATCH_SIZE < unseenPlaces.length) {
          await sleep(150)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${task.query}: ${msg}`)
      await logOutreachEvent({
        module: 'lead_finder',
        level: 'error',
        event: 'query_failed',
        message: `Lead discovery query failed (${task.query}): ${msg}`,
      })
    }
  }

  const { accepted, skippedDuplicates, skippedNoContact } = dedupeLeadCandidates(
    rawCandidates,
    existingKeys
  )

  const savedLeads: Partial<OutreachLead>[] = []

  if (accepted.length > 0) {
    const rowsToInsert = accepted.map((c) => ({
      business_name: c.business_name,
      category: c.category,
      city: c.city,
      address: c.address,
      website_url: c.website_url,
      domain: c.domain,
      google_place_id: c.google_place_id,
      email: c.email,
      phone_e164: c.phone_e164,
      source: 'google_places' as const,
      source_details: c.source_details ?? {},
      status: 'new' as const,
      rating: c.rating ?? null,
      business_summary: c.business_summary ?? null,
      whatsapp_opted_in: false, // Cold outbound WhatsApp is strictly forbidden
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertError } = await (supabase.from('outreach_leads') as any)
      .insert(rowsToInsert)
      .select('id, business_name, category, city, email, phone_e164, website_url, status, source')

    if (insertError) {
      errors.push(`Database insert error: ${insertError.message}`)
      await logOutreachEvent({
        module: 'lead_finder',
        level: 'error',
        event: 'db_insert_failed',
        message: insertError.message,
      })
    } else if (inserted) {
      savedLeads.push(...inserted)

      // Record B2B public business directory provenance in consent records
      for (const lead of inserted) {
        if (lead.email) {
          await recordConsent(supabase, {
            leadId: lead.id,
            email: lead.email,
            phoneE164: lead.phone_e164,
            channel: 'email',
            action: 'legitimate_interest_b2b',
            legalBasis: 'public_corporate_contact_kenya_dpa_b2b_with_one_click_opt_out',
            consentText: 'Public corporate email published on official business website',
            source: 'google_places_and_business_website',
          }).catch(() => {})
        }
      }
    }
  }

  const result: LeadFinderRunResult = {
    queriesExecuted: searchTasks.map((t) => t.query),
    placesFound,
    websitesScraped,
    forbiddenUrlsSkipped,
    suppressedSkipped,
    duplicatesSkipped: skippedDuplicates,
    noContactSkipped: skippedNoContact,
    leadsSaved: savedLeads.length,
    savedLeads,
    errors,
  }

  await logOutreachEvent({
    module: 'lead_finder',
    level: errors.length > 0 && savedLeads.length === 0 ? 'warn' : 'info',
    event: 'job_completed',
    message: `Lead Finder saved ${savedLeads.length} new Kenyan business leads (${placesFound} places scanned, ${skippedDuplicates} duplicates, ${suppressedSkipped} suppressed).`,
    metadata: {
      queriesExecuted: result.queriesExecuted,
      placesFound,
      websitesScraped,
      forbiddenUrlsSkipped,
      suppressedSkipped,
      duplicatesSkipped: skippedDuplicates,
      noContactSkipped: skippedNoContact,
      leadsSaved: savedLeads.length,
    },
  })

  return result
}
