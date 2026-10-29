import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateOutreachEmailWithClaude, resolveOutreachAiConfig } from '@/lib/outreach/claude'
import { isDirectoryOrAggregatorUrl, searchFreeKenyanWebDirectory } from '@/lib/outreach/lead-finder'
import {
  buildProformaEmailCardHtml,
  buildProformaEmailTextBlock,
  generateOutreachProformaPdfBase64,
  recommendBatteriqProformaForLead,
} from '@/lib/outreach/proforma'
import { mapSearchCategoryToLeadCategory, validateBusinessEmail } from '@/lib/outreach/validators'

describe('Autopilot, Multi-Sector Scraping (.go.ke, NGOs, Retail/Baby Shops) & KES Proformas', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to gemini-3.5-flash with thinkingBudget: 0 and filters internal thought parts', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('OUTREACH_GEMINI_API_KEY', 'test-gemini-35-key')
    vi.stubEnv('OUTREACH_AI_PROVIDER', 'gemini')

    const cfg = resolveOutreachAiConfig()
    expect(cfg.provider).toBe('gemini')
    expect(cfg.model).toBe('gemini-3.5-flash')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: 'internal reasoning...', thought: true },
                {
                  text: JSON.stringify({
                    subject: 'Backup Power & Proforma for Nila Baby Shop',
                    paragraphs: [
                      'Hello Nila Baby Shop Team,',
                      'Keep your POS tills, M-Pesa terminals, and store lighting online during KPLC blackouts with our attached Proforma (#BQ-PRO-20261029-AABBCC).',
                      'Reply anytime to adjust quantities or confirm delivery.',
                      'Warm regards,\nBatteriq Kenya Business Solutions',
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    })

    const email = await generateOutreachEmailWithClaude({
      lead: {
        business_name: 'Nila Baby Shop',
        category: 'retail',
        city: 'Nairobi',
        address: 'Nairobi, Kenya',
        website_url: 'https://nilababyshop.com',
        business_summary: 'Premier baby and kids retail store in Kenya.',
      },
      senderName: 'Batteriq Kenya Business Solutions',
      proforma: {
        proformaNumber: 'BQ-PRO-20261029-AABBCC',
        systemTitle: 'Retail Store, POS & Lighting Instant Backup Package',
        totalKes: 223000,
      },
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    expect(email.model).toBe('gemini-3.5-flash')
    expect(email.subject).toContain('Nila Baby Shop')
    expect(email.bodyText).toContain('BQ-PRO-20261029-AABBCC')

    const reqBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(reqBody.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 })
  })

  it('allows Kenyan government & parastatal (.go.ke) websites while blocking foreign .gov/.mil and Facebook', () => {
    expect(isDirectoryOrAggregatorUrl('https://www.kra.go.ke')).toBe(false)
    expect(isDirectoryOrAggregatorUrl('https://www.kemri.go.ke')).toBe(false)
    expect(isDirectoryOrAggregatorUrl('https://epra.go.ke')).toBe(false)
    expect(isDirectoryOrAggregatorUrl('https://nilababyshop.com')).toBe(false)
    expect(isDirectoryOrAggregatorUrl('https://www.redcross.or.ke')).toBe(false)

    // Foreign gov/mil & social remain blocked
    expect(isDirectoryOrAggregatorUrl('https://www.whitehouse.gov')).toBe(true)
    expect(isDirectoryOrAggregatorUrl('https://www.army.mil')).toBe(true)
    expect(isDirectoryOrAggregatorUrl('https://www.facebook.com/nilababyshop')).toBe(true)
  })

  it('maps all Kenyan sectors (parastatals, NGOs, hospitals, schools, retail/baby shops, hotels) accurately', () => {
    expect(mapSearchCategoryToLeadCategory('government parastatals .go.ke')).toBe('government')
    expect(mapSearchCategoryToLeadCategory('Kenya Revenue Authority')).toBe('government')
    expect(mapSearchCategoryToLeadCategory('NGOs and humanitarian foundations')).toBe('ngo')
    expect(mapSearchCategoryToLeadCategory('hospitals and maternity clinics')).toBe('hospital')
    expect(mapSearchCategoryToLeadCategory('schools colleges and universities')).toBe('school')
    expect(mapSearchCategoryToLeadCategory('Nila Baby Shop and retail boutiques')).toBe('retail')
    expect(mapSearchCategoryToLeadCategory('hotels & safari lodges')).toBe('hotel')

    // Parastatal & procurement role emails score high
    const tenders = validateBusinessEmail('tenders@kra.go.ke', 'kra.go.ke')
    expect(tenders?.email).toBe('tenders@kra.go.ke')
    expect((tenders?.score ?? 0) > 80).toBe(true)
  })

  it('discovers Nila Baby Shop & multi-sector domains cleanly when queried', async () => {
    // Mock offline fetch so it exercises registry keyword matching deterministically
    const offlineFetch = vi.fn().mockRejectedValue(new Error('offline'))
    const found = await searchFreeKenyanWebDirectory({
      query: 'Nila Baby Shop Nairobi',
      category: 'retail',
      city: 'Nairobi',
      maxResults: 5,
      fetchImpl: offlineFetch as unknown as typeof fetch,
    })

    expect(found.length).toBeGreaterThan(0)
    expect(found[0].name).toBe('Nila Baby Shop')
    expect(found[0].websiteUrl).toBe('https://nilababyshop.com')
  })

  it('generates sector-tailored KES Proforma packages, HTML/Text cards, and valid base64 A4 PDFs', async () => {
    const retailProforma = recommendBatteriqProformaForLead({
      business_name: 'Nila Baby Shop',
      category: 'retail',
      city: 'Nairobi',
      address: 'Westlands, Nairobi, Kenya',
      email: 'info@nilababyshop.com',
      phone_e164: '+254712345678',
    })

    expect(retailProforma.proformaNumber).toMatch(/^BQ-PRO-\d{8}-[A-F0-9]{6}$/)
    expect(retailProforma.systemTitle).toContain('Retail Store, POS & Lighting')
    expect(retailProforma.total).toBeGreaterThan(100000)
    expect(retailProforma.vatIncludedKes).toBe(Math.round((retailProforma.total * 16) / 116))

    const govProforma = recommendBatteriqProformaForLead({
      business_name: 'Kenya Revenue Authority (KRA)',
      category: 'government',
      city: 'Nairobi',
      address: 'Times Tower, Haile Selassie Ave, Nairobi',
      email: 'cic@kra.go.ke',
      phone_e164: '+254204999999',
    })
    expect(govProforma.systemTitle).toContain('Parastatal')
    expect(govProforma.total).toBeGreaterThan(retailProforma.total)

    const htmlCard = buildProformaEmailCardHtml(retailProforma)
    const textBlock = buildProformaEmailTextBlock(retailProforma)
    expect(htmlCard).toContain(retailProforma.proformaNumber)
    expect(htmlCard).toContain('KRA eTIMS Ready')
    expect(textBlock).toContain(retailProforma.proformaNumber)

    const pdfBase64 = await generateOutreachProformaPdfBase64(retailProforma)
    expect(typeof pdfBase64).toBe('string')
    expect(pdfBase64.length).toBeGreaterThan(500)
    // Base64 of "%PDF-" starts with "JVBERi0"
    expect(pdfBase64.startsWith('JVBERi0')).toBe(true)
  })
})
