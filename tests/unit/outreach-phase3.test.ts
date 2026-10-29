import crypto from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  assertWhatsAppOutboundCompliance,
  isWithin24HourWindow,
  parseWhatsAppWebhookPayload,
  sendWhatsAppCloudTemplate,
  sendWhatsAppCloudText,
  verifyWhatsAppWebhookSignature,
  WhatsAppComplianceError,
} from '@/lib/outreach/whatsapp'
import { GET as verifyWebhookGet } from '@/app/api/whatsapp/webhook/route'
import { NextRequest } from 'next/server'

describe('Phase 3 — WhatsApp Cloud API, Cold-Outbound Block & 24h Window Rules', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'EAAG_test_token')
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '10987654321')
    vi.stubEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'bq_verify_2026')
  })

  it('strictly blocks cold outbound WhatsApp messages when contact neither messaged first nor opted in', () => {
    expect(() =>
      assertWhatsAppOutboundCompliance({
        isSuppressed: false,
        leadStatus: 'new',
        conversationStatus: 'open',
        hasInboundMessage: false,
        hasExplicitOptIn: false,
        lastInboundAt: null,
        messageType: 'template',
        templateName: 'batteriq_business_reply',
      })
    ).toThrowError(WhatsAppComplianceError)

    try {
      assertWhatsAppOutboundCompliance({
        isSuppressed: false,
        hasInboundMessage: false,
        hasExplicitOptIn: false,
        messageType: 'text',
      })
    } catch (err) {
      expect((err as WhatsAppComplianceError).code).toBe('COLD_OUTBOUND_FORBIDDEN')
    }
  })

  it('blocks free-form text outside the 24-hour window and requires approved templates', () => {
    const now = Date.now()
    const twentySixHoursAgo = new Date(now - 26 * 60 * 60 * 1000).toISOString()
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString()

    expect(isWithin24HourWindow(twoHoursAgo, now)).toBe(true)
    expect(isWithin24HourWindow(twentySixHoursAgo, now)).toBe(false)

    // Free-form text at 26h -> blocked
    expect(() =>
      assertWhatsAppOutboundCompliance({
        isSuppressed: false,
        hasInboundMessage: true,
        hasExplicitOptIn: true,
        lastInboundAt: twentySixHoursAgo,
        messageType: 'text',
        nowMs: now,
      })
    ).toThrow(/approved template/i)

    // Approved template at 26h -> allowed!
    expect(() =>
      assertWhatsAppOutboundCompliance({
        isSuppressed: false,
        hasInboundMessage: true,
        hasExplicitOptIn: true,
        lastInboundAt: twentySixHoursAgo,
        messageType: 'template',
        templateName: 'batteriq_business_reply',
        nowMs: now,
      })
    ).not.toThrow()

    // Free-form text inside 24h window -> allowed!
    expect(() =>
      assertWhatsAppOutboundCompliance({
        isSuppressed: false,
        hasInboundMessage: true,
        hasExplicitOptIn: true,
        lastInboundAt: twoHoursAgo,
        messageType: 'text',
        nowMs: now,
      })
    ).not.toThrow()
  })

  it('always blocks suppressed or opted-out contacts even inside 24h window', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(() =>
      assertWhatsAppOutboundCompliance({
        isSuppressed: true,
        hasInboundMessage: true,
        hasExplicitOptIn: true,
        lastInboundAt: oneHourAgo,
        messageType: 'text',
      })
    ).toThrow(/opted out/i)
  })

  it('verifies Meta webhook GET handshake and HMAC-SHA256 POST signature', async () => {
    const okUrl =
      'https://batteriq.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=bq_verify_2026&hub.challenge=987654321'
    const badUrl =
      'https://batteriq.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=987654321'

    const okRes = await verifyWebhookGet(new NextRequest(okUrl))
    expect(okRes.status).toBe(200)
    expect(await okRes.text()).toBe('987654321')

    const badRes = await verifyWebhookGet(new NextRequest(badUrl))
    expect(badRes.status).toBe(403)

    const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
    const secret = 'meta_app_secret_xyz'
    const validSig = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`

    expect(verifyWhatsAppWebhookSignature(rawBody, validSig, secret)).toBe(true)
    expect(verifyWhatsAppWebhookSignature(rawBody, 'sha256=deadbeef', secret)).toBe(false)
  })

  it('parses incoming Meta Cloud API messages and delivery status updates, and sends text/templates', async () => {
    const parsed = parseWhatsAppWebhookPayload({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: '254716822014', profile: { name: 'Serena Procurement' } }],
                messages: [
                  {
                    id: 'wamid.HBgMMjU0NzE2ODIyMDE0',
                    from: '254716822014',
                    timestamp: '1761720000',
                    type: 'text',
                    text: { body: 'Hi, how much is EcoFlow DELTA Pro with eTIMS?' },
                  },
                ],
                statuses: [
                  {
                    id: 'wamid.OUTBOUND1',
                    status: 'delivered',
                  },
                ],
              },
            },
          ],
        },
      ],
    })

    expect(parsed.inboundMessages).toHaveLength(1)
    expect(parsed.inboundMessages[0].fromPhoneE164).toBe('+254716822014')
    expect(parsed.inboundMessages[0].contactName).toBe('Serena Procurement')
    expect(parsed.inboundMessages[0].body).toContain('EcoFlow DELTA Pro')
    expect(parsed.statusUpdates).toEqual([
      { waMessageId: 'wamid.OUTBOUND1', status: 'delivered', errorMessage: undefined },
    ])

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: 'wamid.SENT_123' }] }),
    })

    const textSent = await sendWhatsAppCloudText({
      toPhoneE164: '+254716822014',
      body: 'EcoFlow DELTA Pro is in stock in Nairobi!',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })
    expect(textSent.waMessageId).toBe('wamid.SENT_123')

    const tplSent = await sendWhatsAppCloudTemplate({
      toPhoneE164: '+254716822014',
      templateName: 'batteriq_inquiry_followup',
      bodyParameters: ['Serena Procurement'],
      fetchImpl: mockFetch as unknown as typeof fetch,
    })
    expect(tplSent.waMessageId).toBe('wamid.SENT_123')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
