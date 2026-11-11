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
