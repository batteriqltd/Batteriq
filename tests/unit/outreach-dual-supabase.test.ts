import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  generateOutreachEmailWithClaude,
  resolveOutreachAiConfig,
} from '@/lib/outreach/claude'
import {
  isDirectoryOrAggregatorUrl,
  searchFreeKenyanWebDirectory,
} from '@/lib/outreach/lead-finder'
import {
  createStoreAdminClientSafe,
  fetchStoreCatalogProductsSafe,
  hasOutreachSupabaseConfig,
  resolveOutreachSupabaseCredentials,
} from '@/lib/outreach/supabase'

describe('Dual-Supabase Outreach Support', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses dedicated OUTREACH_SUPABASE_URL + OUTREACH_SUPABASE_SERVICE_ROLE_KEY when configured (even without Store Supabase)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    vi.stubEnv('OUTREACH_SUPABASE_URL', 'https://outreach-second-db.supabase.co')
    vi.stubEnv('OUTREACH_SUPABASE_SERVICE_ROLE_KEY', 'eyJ_outreach_service_role_key')

    const creds = resolveOutreachSupabaseCredentials()
    expect(creds).toEqual({
      url: 'https://outreach-second-db.supabase.co',
      serviceRoleKey: 'eyJ_outreach_service_role_key',
      isDedicatedProject: true,
    })
    expect(hasOutreachSupabaseConfig()).toBe(true)
    expect(createStoreAdminClientSafe()).toBeNull()
  })

  it('prefers dedicated 2nd Supabase over Store Supabase when both are present', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://main-store-db.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJ_store_service_role_key')
    vi.stubEnv('OUTREACH_SUPABASE_URL', 'https://outreach-second-db.supabase.co')
    vi.stubEnv('OUTREACH_SUPABASE_SERVICE_ROLE_KEY', 'eyJ_outreach_service_role_key')

    const creds = resolveOutreachSupabaseCredentials()
    expect(creds?.url).toBe('https://outreach-second-db.supabase.co')
    expect(creds?.isDedicatedProject).toBe(true)
    expect(createStoreAdminClientSafe()).not.toBeNull()
  })

  it('falls back cleanly to Store Supabase when OUTREACH_SUPABASE_* are unset or replace_me', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://main-store-db.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJ_store_service_role_key')
    vi.stubEnv('OUTREACH_SUPABASE_URL', 'replace_me')
    vi.stubEnv('OUTREACH_SUPABASE_SERVICE_ROLE_KEY', 'replace_me')

    const creds = resolveOutreachSupabaseCredentials()
    expect(creds).toEqual({
      url: 'https://main-store-db.supabase.co',
      serviceRoleKey: 'eyJ_store_service_role_key',
      isDedicatedProject: false,
    })

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect(await fetchStoreCatalogProductsSafe()).toEqual([])
  })

  it('automatically uses Google Gemini API (GEMINI_API_KEY) when ANTHROPIC_API_KEY is unset', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEY', 'AIza_test_gemini_key')

    const aiCfg = resolveOutreachAiConfig()
    expect(aiCfg.provider).toBe('gemini')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    subject: 'Silent backup power for Sarova Stanley Nairobi',
                    paragraphs: [
                      'Hello Sarova Stanley team,',
                      'Keep guest Wi-Fi, reception, and rooms online during KPLC outages with EcoFlow DELTA Pro.',
                      'Reply for a tailored B2B quote with KRA eTIMS VAT invoicing.',
                      'Batteriq Kenya Business Solutions',
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    })

    const generated = await generateOutreachEmailWithClaude({
      lead: {
        business_name: 'Sarova Stanley',
        category: 'hotel',
        city: 'Nairobi',
        address: 'Kimathi St, Nairobi',
        website_url: 'https://sarovahotels.com',
        business_summary: 'Luxury hotel in Nairobi CBD',
      },
      senderName: 'Batteriq Kenya Business Solutions',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    expect(generated.subject).toContain('Sarova Stanley')
    expect(generated.model).toBe('gemini-3.5-flash')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(String(mockFetch.mock.calls[0][0])).toContain('generativelanguage.googleapis.com')
  })

  it('falls back to cloud-safe Kenyan open-data & domain registry when DuckDuckGo returns HTTP 202 on serverless IPs', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEY', '')

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('duckduckgo.com')) {
        return { ok: true, status: 202, text: async () => '' }
      }
      if (String(url).includes('api.openalex.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                display_name: 'Strathmore University',
                homepage_url: 'https://www.strathmore.edu',
                geo: { city: 'Nairobi' },
              },
              {
                display_name: 'Kenya Gov Portal',
                homepage_url: 'https://www.education.go.ke',
                geo: { city: 'Nairobi' },
              },
            ],
          }),
        }
      }
      return { ok: false, status: 503, json: async () => ({}), text: async () => '' }
    })

    const results = await searchFreeKenyanWebDirectory({
      query: 'schools in Nairobi, Kenya',
      category: 'school',
      city: 'Nairobi',
      maxResults: 4,
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    expect(results).toHaveLength(4)
    expect(results[0]).toMatchObject({
      placeId: 'web:strathmore.edu',
      name: 'Strathmore University',
      phone: null,
      websiteUrl: 'https://www.strathmore.edu',
    })
    // Confirm .go.ke Kenyan government/parastatal portal is now allowed alongside verified registry
    expect(results.some((r) => r.websiteUrl?.includes('.go.ke'))).toBe(true)
    expect(results.every((r) => r.phone === null)).toBe(true)
  })

  it('discovers Kenyan business websites via free no-card search while blocking Facebook & aggregators', async () => {
    expect(isDirectoryOrAggregatorUrl('https://www.facebook.com/somehotel')).toBe(true)
    expect(isDirectoryOrAggregatorUrl('https://www.booking.com/hotel/ke/nairobi.html')).toBe(true)
    expect(isDirectoryOrAggregatorUrl('https://www.tripadvisor.com/Hotel-Nairobi')).toBe(true)
    expect(isDirectoryOrAggregatorUrl('https://www.hotelboulevard.co.ke/contact-us/')).toBe(false)

    const sampleDdgHtml = `
      <div class="result">
        <a class="result__a" href="https://www.booking.com/hotel/ke/nairobi.html">Top 10 Hotels in Nairobi - Booking.com</a>
      </div>
      <div class="result">
        <a class="result__a" href="https://www.facebook.com/hotelboulevardke">Hotel Boulevard Facebook</a>
      </div>
      <div class="result">
        <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.hotelboulevard.co.ke%2Fcontact-us%2F">Contact Us - Hotel Boulevard Nairobi</a>
        <a class="result__snippet">Harry Thuku Rd, Nairobi. Reception: +254 722 200 755</a>
      </div>
      <div class="result">
        <a class="result__a" href="https://www.oakplace.co.ke/contact">Contact &amp; Book | Oak Place Hotel &amp; Conference Centre | +254 727 959 026</a>
      </div>
    `

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => sampleDdgHtml,
    })

    const results = await searchFreeKenyanWebDirectory({
      query: 'hotels in Nairobi, Kenya',
      category: 'hotel',
      city: 'Nairobi',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      placeId: 'web:hotelboulevard.co.ke',
      name: 'Hotel Boulevard Nairobi',
      phone: '+254722200755',
      websiteUrl: 'https://www.hotelboulevard.co.ke/contact-us/',
    })
    expect(results[1]).toMatchObject({
      placeId: 'web:oakplace.co.ke',
      name: 'Oak Place Hotel & Conference Centre',
      phone: '+254727959026',
      websiteUrl: 'https://www.oakplace.co.ke/contact',
    })
  })
})
