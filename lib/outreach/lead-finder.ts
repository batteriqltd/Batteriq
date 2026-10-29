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

const SCRAPE_TIMEOUT_MS = 7000
const MAX_HTML_BYTES = 450_000
const SCRAPE_USER_AGENT =
  'Mozilla/5.0 (compatible; BatteriqBusinessDirectoryBot/1.0; +https://batteriq.com)'

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
    const res = await fetchImpl(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPE_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      },
    })

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
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim()
  if (!apiKey) {
    const msg = 'GOOGLE_PLACES_API_KEY is not configured in environment variables'
    await logOutreachEvent({
      module: 'lead_finder',
      level: 'error',
      event: 'missing_api_key',
      message: msg,
    })
    throw new Error(msg)
  }

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
      const places = await searchGooglePlacesKenya({
        query: task.query,
        apiKey,
        maxResults: options.maxPlacesPerQuery ?? 15,
        fetchImpl: options.fetchImpl,
      })

      placesFound += places.length

      for (const place of places) {
        // Skip early if google_place_id already exists
        if (existingKeys.placeIds.has(place.placeId)) {
          continue
        }

        const placesPhone = normalizeKenyanPhone(place.phone, { source: 'google_places' })
        let websiteEmail: string | null = null
        let websitePhone: string | null = null
        let cleanWebsiteUrl: string | null = null
        let domain: string | null = null
        let businessSummary: string | null = null

        if (place.websiteUrl) {
          if (isForbiddenScrapeUrl(place.websiteUrl)) {
            forbiddenUrlsSkipped++
          } else {
            websitesScraped++
            const scraped = await scrapeBusinessWebsite(place.websiteUrl, options.fetchImpl)
            cleanWebsiteUrl = scraped.cleanWebsiteUrl
            domain = scraped.domain
            websiteEmail = scraped.email
            websitePhone = scraped.phoneE164
            businessSummary = scraped.businessSummary
            if (scraped.blockedForbiddenUrl) forbiddenUrlsSkipped++
            // Polite delay between website scrapes
            await sleep(120)
          }
        }

        const finalPhone = placesPhone || websitePhone
        const finalEmail = websiteEmail

        // Permanent suppression check (Kenya DPA 2019)
        if (
          checkInSuppressionSets(suppressionSets, {
            email: finalEmail,
            phoneE164: finalPhone,
            domain,
          })
        ) {
          suppressedSkipped++
          continue
        }

        rawCandidates.push({
          business_name: place.name,
          category: task.category,
          city: task.city,
          address: place.address,
          website_url: cleanWebsiteUrl,
          domain,
          google_place_id: place.placeId,
          email: finalEmail,
          phone_e164: finalPhone,
          rating: place.rating,
          business_summary: businessSummary,
          source_details: {
            query: task.query,
            primary_type: place.primaryType,
            email_from: finalEmail ? 'business_website' : null,
            phone_from: placesPhone ? 'google_places' : websitePhone ? 'business_website' : null,
          },
        })
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
