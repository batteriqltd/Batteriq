import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as webhookPost } from '@/app/api/whatsapp/webhook/route'
import { getWahaSession, sendWahaText, WahaError } from '@/lib/waha'
import { renderColdMessage } from '@/lib/outreach/waha-queue'
import {
  chatIdToPhoneE164,
  toWhatsAppChatId,
  toWhatsAppDigits,
  verifyWahaWebhookHmac,
} from '@/lib/outreach/whatsapp-transport'

const FAKE_KEY = 'test-waha-key-should-never-leak'

describe('WAHA webhook HMAC (X-Webhook-Hmac, sha512 hex of raw body)', () => {
  it('matches the example in the WAHA security docs', () => {
    const body = '{"event":"message","session":"default","engine":"WEBJS"}'
    const docsHex =
      '208f8a55dde9e05519e898b10b89bf0d0b3b0fdf11fdbf09b6b90476301b98d8097c462b2b17a6ce93b6b47a136cf2e78a33a63f6752c2c1631777076153fa89'
    expect(verifyWahaWebhookHmac(body, docsHex, 'sha512', 'my-secret-key')).toBe(true)
  })

  it('rejects wrong signature, wrong algorithm, missing header or missing secret', () => {
    const body = '{"a":1}'
    const good = crypto.createHmac('sha512', 's3cret').update(body).digest('hex')
    expect(verifyWahaWebhookHmac(body, good, 'sha512', 's3cret')).toBe(true)
    expect(verifyWahaWebhookHmac(body, good.replace(/.$/, '0'), 'sha512', 's3cret')).toBe(false)
    expect(verifyWahaWebhookHmac(body, good, 'sha256', 's3cret')).toBe(false)
    expect(verifyWahaWebhookHmac(body, null, 'sha512', 's3cret')).toBe(false)
    expect(verifyWahaWebhookHmac(body, good, 'sha512', undefined)).toBe(false)
  })
})

describe('phone normalisation to WhatsApp chat ids', () => {
  it('handles Kenyan local and international formats', () => {
    expect(toWhatsAppDigits('0712 345 678')).toBe('254712345678')
    expect(toWhatsAppDigits('712345678')).toBe('254712345678')
    expect(toWhatsAppDigits('+254 712-345-678')).toBe('254712345678')
    expect(toWhatsAppDigits('00254712345678')).toBe('254712345678')
    expect(toWhatsAppDigits('0110 123 456')).toBe('254110123456')
    expect(toWhatsAppDigits('+1 (213) 213-2130')).toBe('12132132130')
    expect(toWhatsAppChatId('0712345678')).toBe('254712345678@c.us')
    expect(toWhatsAppDigits('12345')).toBeNull()
    expect(toWhatsAppDigits('')).toBeNull()
  })

  it('maps chat ids back to E.164 and ignores @lid / groups', () => {
    expect(chatIdToPhoneE164('254712345678@c.us')).toBe('+254712345678')
    expect(chatIdToPhoneE164('254712345678@s.whatsapp.net')).toBe('+254712345678')
    expect(chatIdToPhoneE164('123456789012345@lid')).toBeNull()
    expect(chatIdToPhoneE164('12036302@g.us')).toBeNull()
  })
})

describe('cold message rendering', () => {
  it('fills placeholders and resolves spintax', () => {
    const out = renderColdMessage('{Hi|Hello} {business} in {city} — {sender}', {
      business: 'Acme Laundry',
      city: 'Nairobi',
      sender: 'Jane',
    })
    expect(out).toMatch(/^(Hi|Hello) Acme Laundry in Nairobi — Jane$/)
  })
})

describe('WAHA client', () => {
  beforeEach(() => {
    process.env.WAHA_BASE_URL = 'https://waha.example.test/'
    process.env.WAHA_API_KEY = FAKE_KEY
  })
  afterEach(() => {
    delete process.env.WAHA_BASE_URL
    delete process.env.WAHA_API_KEY
    vi.unstubAllGlobals()
  })

  it('sends X-Api-Key and extracts the message id', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'true_254712345678@c.us_ABC' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await sendWahaText({ chatId: '254712345678@c.us', text: 'hi' })
    expect(res.messageId).toBe('true_254712345678@c.us_ABC')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://waha.example.test/api/sendText')
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe(FAKE_KEY)
  })

  it('never leaks the API key or base URL in errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ message: `bad key ${FAKE_KEY} at https://waha.example.test` }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      )
    )
    const err = await getWahaSession().catch((e) => e)
    expect(err).toBeInstanceOf(WahaError)
    expect(String(err.message)).not.toContain(FAKE_KEY)
    expect(String(err.message)).not.toContain('waha.example.test')
  })

  it('returns null for a session that does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    expect(await getWahaSession()).toBeNull()
  })
})

describe('POST /api/whatsapp/webhook signature enforcement', () => {
  beforeEach(() => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'hook-secret'
    delete process.env.WHATSAPP_APP_SECRET
  })
  afterEach(() => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET
  })

  const body = JSON.stringify({ event: 'message', session: 'default', payload: {} })
  const url = 'https://batteriq.com/api/whatsapp/webhook'

  it('rejects an unsigned request', async () => {
    const res = await webhookPost(new NextRequest(url, { method: 'POST', body }))
    expect(res.status).toBe(401)
  })

  it('rejects a bad WAHA HMAC', async () => {
    const res = await webhookPost(
      new NextRequest(url, {
        method: 'POST',
        body,
        headers: { 'x-webhook-hmac': 'deadbeef', 'x-webhook-hmac-algorithm': 'sha512' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('rejects Meta-signed requests when WHATSAPP_APP_SECRET is not configured', async () => {
    const res = await webhookPost(
      new NextRequest(url, { method: 'POST', body, headers: { 'x-hub-signature-256': 'sha256=abc' } })
    )
    expect(res.status).toBe(401)
  })
})

describe('WhatsApp proforma + wider targeting', () => {
  beforeEach(() => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'hook-secret'
  })
  afterEach(() => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET
    vi.unstubAllGlobals()
  })

  it('maps bars, pubs and small businesses to a sendable category', async () => {
    const { mapSearchCategoryToLeadCategory } = await import('@/lib/outreach/validators')
    expect(mapSearchCategoryToLeadCategory('bars, pubs & lounges')).toBe('retail')
    expect(mapSearchCategoryToLeadCategory('butcheries & wines and spirits')).toBe('retail')
    expect(mapSearchCategoryToLeadCategory('hotels & lodges')).toBe('hotel')
  })

  it('tailors a bar quote and a home quote for an individual', async () => {
    const { recommendBatteriqProformaForLead } = await import('@/lib/outreach/proforma')
    const bar = recommendBatteriqProformaForLead({
      business_name: 'Kilimani Sports Bar & Grill',
      category: 'retail',
      city: 'Nairobi',
      address: null,
      email: null,
      phone_e164: '+254712345678',
    })
    expect(bar.systemTitle).toMatch(/Bar/)
    expect(bar.total).toBeGreaterThan(0)
    const person = recommendBatteriqProformaForLead({
      business_name: 'Jane Wanjiku',
      category: 'other',
      city: null,
      address: null,
      email: null,
      phone_e164: '+254712345678',
    })
    expect(person.systemTitle).toMatch(/Home/)
  })

  it('signs proforma download links and rejects tampering', async () => {
    const { proformaPublicUrl, verifyProformaLinkSignature, buildProformaWhatsAppCaption } = await import(
      '@/lib/outreach/whatsapp-proforma'
    )
    const id = '11111111-2222-3333-4444-555555555555'
    const url = proformaPublicUrl(id) as string
    const sig = new URL(url).searchParams.get('s')
    expect(verifyProformaLinkSignature(id, sig)).toBe(true)
    expect(verifyProformaLinkSignature('11111111-2222-3333-4444-555555555556', sig)).toBe(false)
    expect(verifyProformaLinkSignature(id, 'x'.repeat(32))).toBe(false)
    const { recommendBatteriqProformaForLead } = await import('@/lib/outreach/proforma')
    const caption = buildProformaWhatsAppCaption(
      recommendBatteriqProformaForLead({
        business_name: 'Acme',
        category: 'retail',
        city: 'Nairobi',
        address: null,
        email: null,
        phone_e164: null,
      })
    )
    expect(caption).toMatch(/^Here are the options we put together for Acme\./)
    expect(caption).toMatch(/I'd recommend the /)
    expect(caption).toMatch(/Option 1: .*KES [\d,]+/)
    expect(caption).toMatch(/Option 2: .*BLUETTI|Option 2: .*Bluetti/i)
    expect(caption).toMatch(/Nothing to pay until you decide/)
    expect(caption).not.toMatch(/\(/) // spec brackets stripped from product names
  })

  it('sends the PDF as a WhatsApp document with X-Api-Key', async () => {
    process.env.WAHA_BASE_URL = 'https://waha.example.test'
    process.env.WAHA_API_KEY = FAKE_KEY
    const { sendWahaFile } = await import('@/lib/waha')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'true_x@c.us_PDF' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await sendWahaFile({
      chatId: '254712345678@c.us',
      filename: 'q.pdf',
      mimetype: 'application/pdf',
      base64: 'JVBERg==',
      caption: 'hi',
    })
    expect(res.messageId).toBe('true_x@c.us_PDF')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://waha.example.test/api/sendFile')
    const sent = JSON.parse(String(init.body))
    expect(sent.file).toEqual({ mimetype: 'application/pdf', filename: 'q.pdf', data: 'JVBERg==' })
    delete process.env.WAHA_BASE_URL
    delete process.env.WAHA_API_KEY
  })
})

describe('human-like WhatsApp replies', () => {
  it('strips emojis, markdown and AI-style punctuation', async () => {
    const { humanizeWhatsAppReply } = await import('@/lib/outreach/claude')
    const out = humanizeWhatsAppReply(
      'Great news 🎉🔋!! The *DELTA 2 Max* — KES 265,000 👍\n\n\n- Same-day delivery ✅'
    )
    expect(out).toBe('Great news! The DELTA 2 Max, KES 265,000\n\nSame-day delivery')
    expect(humanizeWhatsAppReply('🙏')).toMatch(/^Thanks/)
  })

  it('types at a fast human speed (≈6.5–8 chars/sec)', async () => {
    const { typingDurationMs } = await import('@/lib/outreach/whatsapp-transport')
    const text = 'x'.repeat(140)
    for (let i = 0; i < 20; i++) {
      const ms = typingDurationMs(text)
      expect(ms).toBeGreaterThanOrEqual(17_500)
      expect(ms).toBeLessThanOrEqual(22_800)
    }
    expect(typingDurationMs('ok')).toBe(2_000)
  })
})

describe('website links in WhatsApp messages', () => {
  it('puts the order link in the cold intro and the proforma caption', async () => {
    const { DEFAULT_WAHA_COLD_MESSAGE, renderColdMessage } = await import('@/lib/outreach/waha-queue')
    const intro = renderColdMessage(DEFAULT_WAHA_COLD_MESSAGE, { business: 'Acme Bar', city: 'Nairobi' })
    expect(intro).toMatch(/order directly at https:\/\/[^\s]+/)
    expect(intro).not.toMatch(/[{}]/)
    // reads as us, sells, and has no opt-out footer
    expect(intro).not.toMatch(/from Batteriq/i)
    expect(intro).not.toMatch(/opt out|STOP/)
    expect(intro).toMatch(/\?$/)
    const { buildProformaWhatsAppCaption } = await import('@/lib/outreach/whatsapp-proforma')
    const { recommendBatteriqProformaForLead } = await import('@/lib/outreach/proforma')
    const caption = buildProformaWhatsAppCaption(
      recommendBatteriqProformaForLead({ business_name: 'Acme', category: 'retail', city: 'Nairobi', address: null, email: null, phone_e164: null })
    )
    expect(caption).toMatch(/order directly at https:\/\//)
  })

  it('builds product page links for EcoFlow and BLUETTI only', async () => {
    const { batteriqProductUrl, humanizeWhatsAppReply } = await import('@/lib/outreach/claude')
    expect(batteriqProductUrl({ brand: 'EcoFlow', slug: 'delta-2-max' })).toMatch(/\/ecoflow\/delta-2-max$/)
    expect(batteriqProductUrl({ brand: 'BLUETTI', slug: 'ac180' })).toMatch(/\/bluetti\/ac180$/)
    expect(batteriqProductUrl({ brand: 'Other', slug: 'x' })).toBeNull()
    // the clean-up step must not break links
    const link = 'https://batteriq.com/ecoflow/delta-2-max'
    expect(humanizeWhatsAppReply(`You can check it out here: ${link}`)).toContain(link)
  })
})

describe('quotations use real products, offer BLUETTI, and never say "due"', () => {
  const catalog = [
    { brand: 'EcoFlow', category: 'Power Stations', name: 'EcoFlow DELTA 3', price_kes: 99980, slug: 'delta-3' },
    { brand: 'EcoFlow', category: 'Power Stations', name: 'EcoFlow DELTA 3 Plus', price_kes: 112475, slug: 'delta-3-plus' },
    { brand: 'EcoFlow', category: 'Batteries', name: 'EcoFlow DELTA 3 Plus Smart Extra Battery', price_kes: 60799, slug: 'delta-3-plus-smart-extra-battery' },
    { brand: 'EcoFlow', category: 'Power Stations', name: 'EcoFlow DELTA Pro 3', price_kes: 461799, slug: 'delta-pro-3' },
    { brand: 'EcoFlow', category: 'Solar Panels', name: 'EcoFlow Portable Solar Panel 220W', price_kes: 37499, slug: 'solar-panel-220w' },
    { brand: 'EcoFlow', category: 'Solar Panels', name: 'EcoFlow Portable Solar Panel 400W', price_kes: 71240, slug: 'solar-panel-400w' },
    { brand: 'Bluetti', category: 'Power Stations', name: 'Bluetti premium 200', price_kes: 120000, slug: 'bluetti-premium-200' },
  ]

  it('quotes store products (never an extra battery) and adds a BLUETTI option', async () => {
    const { recommendBatteriqProformaForLead } = await import('@/lib/outreach/proforma')
    const bar = recommendBatteriqProformaForLead(
      { business_name: 'Kilimani Sports Bar', category: 'retail', city: 'Nairobi', address: null, email: null, phone_e164: null },
      catalog
    )
    const names = bar.items.map((i) => i.name)
    expect(names).toContain('EcoFlow DELTA 3 Plus')
    expect(names.join(' ')).not.toMatch(/Extra Battery/)
    expect(bar.alternative?.items[0].name).toBe('Bluetti premium 200')
    expect(bar.alternative?.total).toBe(120000)

    const hospital = recommendBatteriqProformaForLead(
      { business_name: 'Coast Hospital', category: 'hospital', city: 'Mombasa', address: null, email: null, phone_e164: null },
      catalog
    )
    expect(hospital.items.map((i) => i.name)).toContain('EcoFlow DELTA Pro 3')
    expect(hospital.alternative?.items[0].quantity).toBe(2)
  })

  it('renders a QUOTATION PDF with both options and no invoice/due wording', async () => {
    const { recommendBatteriqProformaForLead, generateOutreachProformaPdfBase64 } = await import('@/lib/outreach/proforma')
    const p = recommendBatteriqProformaForLead(
      { business_name: 'Kilimani Sports Bar', category: 'retail', city: 'Nairobi', address: null, email: null, phone_e164: null },
      catalog
    )
    const pdf = Buffer.from(await generateOutreachProformaPdfBase64(p), 'base64').toString('latin1')
    expect(pdf.startsWith('%PDF')).toBe(true)
    expect(pdf).toMatch(/QUOTATION/)
    expect(pdf).toMatch(/Option 2/)
    expect(pdf).not.toMatch(/INVOICE|DUE|PENDING|Total Paid/)
  })
})
