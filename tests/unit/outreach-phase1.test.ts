import { describe, it, expect, vi } from 'vitest'
import {
  dedupeLeadCandidates,
  extractDomain,
  extractPublicBusinessContacts,
  isForbiddenContactSubpage,
  isForbiddenScrapeUrl,
  normalizeKenyanPhone,
  validateBusinessEmail,
} from '@/lib/outreach/validators'
import {
  scrapeBusinessWebsite,
  searchGooglePlacesKenya,
} from '@/lib/outreach/lead-finder'
import { checkInSuppressionSets } from '@/lib/outreach/compliance'

describe('Phase 1 — Outreach Lead Finder & Validators', () => {
  describe('Facebook & social media scraping prohibition', () => {
    it('strictly blocks all Facebook and social URLs', () => {
      expect(isForbiddenScrapeUrl('https://www.facebook.com/SomeKenyanHotel')).toBe(true)
      expect(isForbiddenScrapeUrl('https://m.facebook.com/pages/shop')).toBe(true)
      expect(isForbiddenScrapeUrl('http://fb.com/school')).toBe(true)
      expect(isForbiddenScrapeUrl('https://fb.me/org')).toBe(true)
      expect(isForbiddenScrapeUrl('https://instagram.com/hotel')).toBe(true)
      expect(isForbiddenScrapeUrl('https://wa.me/254712345678')).toBe(true)
    })

    it('allows genuine Kenyan business websites', () => {
      expect(isForbiddenScrapeUrl('https://www.serenahotels.com')).toBe(false)
      expect(isForbiddenScrapeUrl('https://strathmore.edu')).toBe(false)
      expect(isForbiddenScrapeUrl('https://naivas.online')).toBe(false)
      expect(isForbiddenScrapeUrl('https://savannahhotel.co.ke')).toBe(false)
    })

    it('blocks personal staff/leadership bio subpages', () => {
      expect(isForbiddenContactSubpage('https://school.ac.ke/our-team')).toBe(false)
      expect(isForbiddenContactSubpage('https://school.ac.ke/team')).toBe(true)
      expect(isForbiddenContactSubpage('https://school.ac.ke/staff/john-doe')).toBe(true)
      expect(isForbiddenContactSubpage('https://school.ac.ke/leadership')).toBe(true)
      expect(isForbiddenContactSubpage('https://school.ac.ke/contact-us')).toBe(false)
    })

    it('never issues an HTTP fetch to Facebook even if passed to scrapeBusinessWebsite', async () => {
      const spyFetch = vi.fn()
      const res = await scrapeBusinessWebsite(
        'https://www.facebook.com/NairobiBoutiqueHotel',
        spyFetch as unknown as typeof fetch
      )
      expect(spyFetch).not.toHaveBeenCalled()
      expect(res.blockedForbiddenUrl).toBe(true)
      expect(res.email).toBeNull()
      expect(res.phoneE164).toBeNull()
    })

    it('aborts scraping if a business URL redirects to Facebook', async () => {
      const redirectFetch = vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://www.facebook.com/RedirectedShop',
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => '<a href="mailto:info@shop.co.ke">info@shop.co.ke</a>',
      })
      const res = await scrapeBusinessWebsite(
        'https://redirectingshop.co.ke',
        redirectFetch as unknown as typeof fetch
      )
      expect(res.email).toBeNull()
      expect(res.phoneE164).toBeNull()
    })
  })

  describe('Kenyan +254 phone normalization & personal-number exclusion', () => {
    it('normalizes Kenyan landlines and official business numbers to +254 E.164', () => {
      expect(normalizeKenyanPhone('020 284 2000', { source: 'google_places' })).toBe('+254202842000')
      expect(normalizeKenyanPhone('+254 716 822 014', { source: 'google_places' })).toBe('+254716822014')
      expect(normalizeKenyanPhone('0716-822-014', { source: 'google_places' })).toBe('+254716822014')
      expect(normalizeKenyanPhone('+254 0716 822 014', { source: 'google_places' })).toBe('+254716822014')
      expect(normalizeKenyanPhone('0110 456 789', { source: 'google_places' })).toBe('+254110456789')
      expect(normalizeKenyanPhone('0800 723 253', { source: 'google_places' })).toBe('+254800723253')
    })

    it('rejects foreign numbers, shortcodes, and personal-context mobile numbers', () => {
      expect(normalizeKenyanPhone('+256 772 123 456')).toBeNull()
      expect(normalizeKenyanPhone('+1 415 555 2671')).toBeNull()
      expect(normalizeKenyanPhone('12345')).toBeNull()
      expect(
        normalizeKenyanPhone('0722 987 654', {
          source: 'website_tel_link',
          contextText: 'Mr. Kamau (Director personal mobile): 0722 987 654',
        })
      ).toBeNull()
      // Unlabeled wireless number floating in website prose -> rejected as potentially personal
      expect(
        normalizeKenyanPhone('0722 987 654', {
          source: 'website_text',
          contextText: 'Posted on Tuesday at 0722 987 654 by contributor',
        })
      ).toBeNull()
      // Labeled reception/reservations wireless number on website -> accepted
      expect(
        normalizeKenyanPhone('0722 987 654', {
          source: 'website_text',
          contextText: 'Reservations & Front Desk Tel: 0722 987 654',
        })
      ).toBe('+254722987654')
    })
  })

  describe('Business email validation & personal email exclusion', () => {
    it('rejects personal webmail providers and firstname.lastname personal mailboxes', () => {
      expect(validateBusinessEmail('hotelowner@gmail.com', 'riftvalleyhotel.co.ke')).toBeNull()
      expect(validateBusinessEmail('schoolhead@yahoo.com', 'academyschool.ac.ke')).toBeNull()
      expect(validateBusinessEmail('shop@outlook.com', 'shop.co.ke')).toBeNull()
      expect(validateBusinessEmail('john.kamau@riftvalleyhotel.co.ke', 'riftvalleyhotel.co.ke')).toBeNull()
      expect(validateBusinessEmail('logo@2x.png', 'riftvalleyhotel.co.ke')).toBeNull()
      expect(validateBusinessEmail('noreply@riftvalleyhotel.co.ke', 'riftvalleyhotel.co.ke')).toBeNull()
    })

    it('accepts and prioritizes corporate domain role emails', () => {
      const info = validateBusinessEmail('info@riftvalleyhotel.co.ke', 'riftvalleyhotel.co.ke')
      const support = validateBusinessEmail('support@otheragency.co.ke', 'riftvalleyhotel.co.ke')
      expect(info?.email).toBe('info@riftvalleyhotel.co.ke')
      expect(support?.email).toBe('support@otheragency.co.ke')
      expect((info?.score ?? 0) > (support?.score ?? 0)).toBe(true)
    })
  })

  describe('Website HTML contact extraction & multi-page scrape', () => {
    it('extracts corporate email, switchboard phone, summary, and /contact page while ignoring personal contacts', async () => {
      const homeHtml = `
        <html>
          <head>
            <title>Savannah Grand Hotel Nairobi</title>
            <meta name="description" content="4-star conference and business hotel in Westlands, Nairobi." />
          </head>
          <body>
            <a href="/contact-us">Contact Us</a>
            <a href="/leadership">Our Leadership</a>
            <p>Mr. Peter Njoroge, CEO: 0722 333 444 | peter.njoroge@gmail.com</p>
          </body>
        </html>
      `
      const contactHtml = `
        <html>
          <body>
            <h2>Front Desk & Reservations</h2>
            <a href="mailto:reservations@savannahgrand.co.ke">reservations@savannahgrand.co.ke</a>
            <p>Switchboard Tel: 020 445 8899</p>
          </body>
        </html>
      `

      const homeParsed = extractPublicBusinessContacts(homeHtml, 'https://savannahgrand.co.ke')
      expect(homeParsed.emails).toEqual([])
      expect(homeParsed.phones).toEqual([])
      expect(homeParsed.contactPageUrls).toEqual(['https://savannahgrand.co.ke/contact-us'])

      const mockFetch = vi.fn().mockImplementation(async (url: string) => ({
        ok: true,
        url,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: async () => (url.endsWith('/contact-us') ? contactHtml : homeHtml),
      }))

      const scraped = await scrapeBusinessWebsite(
        'https://savannahgrand.co.ke',
        mockFetch as unknown as typeof fetch
      )
      expect(scraped.email).toBe('reservations@savannahgrand.co.ke')
      expect(scraped.phoneE164).toBe('+254204458899')
      expect(scraped.domain).toBe('savannahgrand.co.ke')
      expect(scraped.businessSummary).toContain('Savannah Grand Hotel Nairobi')
    })
  })

  describe('Google Places search, deduplication & suppression checks', () => {
    it('parses Google Places API (New) responses and skips non-operational businesses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          places: [
            {
              id: 'place_1',
              displayName: { text: 'Brookside Academy' },
              formattedAddress: 'Karen, Nairobi, Kenya',
              internationalPhoneNumber: '+254 20 388 4500',
              websiteUri: 'https://brooksideacademy.sc.ke',
              rating: 4.6,
              primaryType: 'school',
              businessStatus: 'OPERATIONAL',
            },
            {
              id: 'place_closed',
              displayName: { text: 'Old Closed Shop' },
              businessStatus: 'CLOSED_PERMANENTLY',
            },
          ],
        }),
      })

      const places = await searchGooglePlacesKenya({
        query: 'schools in Nairobi, Kenya',
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
      })

      expect(places).toHaveLength(1)
      expect(places[0].placeId).toBe('place_1')
      expect(places[0].name).toBe('Brookside Academy')
      expect(extractDomain(places[0].websiteUrl)).toBe('brooksideacademy.sc.ke')
    })

    it('deduplicates by placeId, email, phone, and domain, and skips empty-contact leads', () => {
      const existing = {
        placeIds: new Set(['existing_place']),
        emails: new Set(['info@existinghotel.co.ke']),
        phones: new Set(['+254202223333']),
        domains: new Set(['existinghotel.co.ke']),
      }

      const { accepted, skippedDuplicates, skippedNoContact } = dedupeLeadCandidates(
        [
          {
            business_name: 'Valid New School',
            category: 'school',
            city: 'Nairobi',
            address: 'Kilimani',
            website_url: 'https://newschool.ac.ke',
            domain: 'newschool.ac.ke',
            google_place_id: 'place_new_1',
            email: 'admissions@newschool.ac.ke',
            phone_e164: '+254205556677',
          },
          {
            business_name: 'Duplicate By Email In Same Batch',
            category: 'school',
            city: 'Nairobi',
            address: 'Kilimani',
            website_url: 'https://other.ac.ke',
            domain: 'other.ac.ke',
            google_place_id: 'place_new_2',
            email: 'ADMISSIONS@newschool.ac.ke',
            phone_e164: '+254209998877',
          },
          {
            business_name: 'Duplicate Existing Place',
            category: 'hotel',
            city: 'Mombasa',
            address: 'Nyali',
            website_url: null,
            domain: null,
            google_place_id: 'existing_place',
            email: null,
            phone_e164: '+254412224444',
          },
          {
            business_name: 'No Email And No Phone',
            category: 'shop',
            city: 'Kisumu',
            address: 'CBD',
            website_url: 'https://nocontact.co.ke',
            domain: 'nocontact.co.ke',
            google_place_id: 'place_no_contact',
            email: null,
            phone_e164: null,
          },
        ],
        existing
      )

      expect(accepted).toHaveLength(1)
      expect(accepted[0].business_name).toBe('Valid New School')
      expect(skippedDuplicates).toBe(2)
      expect(skippedNoContact).toBe(1)
    })

    it('enforces suppression list checks on email, phone, and domain', () => {
      const sets = {
        emails: new Set(['optedout@hotel.co.ke']),
        phones: new Set(['+254711222333']),
        domains: new Set(['do-not-email.or.ke']),
      }
      expect(checkInSuppressionSets(sets, { email: 'OptedOut@hotel.co.ke' })).toBe(true)
      expect(checkInSuppressionSets(sets, { phoneE164: '+254711222333' })).toBe(true)
      expect(checkInSuppressionSets(sets, { email: 'sales@do-not-email.or.ke' })).toBe(true)
      expect(checkInSuppressionSets(sets, { email: 'info@freshbusiness.co.ke', phoneE164: '+254203334444' })).toBe(false)
    })
  })
})
