import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateOutreachEmailWithClaude } from '@/lib/outreach/claude'
import {
  buildSenderIdentity,
  createUnsubscribeToken,
  dispatchOutreachEmailViaResend,
  renderOutreachEmailHtml,
  renderOutreachEmailText,
  verifyUnsubscribeToken,
} from '@/lib/outreach/email-campaign'
import { isAuthorizedCronRequest } from '@/lib/outreach/compliance'
import type { Resend } from 'resend'

describe('Phase 2 — Claude Email Agent, Unsubscribe & Cron Auth', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key')
    vi.stubEnv('CRON_SECRET', 'cron-test-secret-2026')
    vi.stubEnv('OUTREACH_UNSUBSCRIBE_SECRET', 'unsub-hmac-secret-2026')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://batteriq.com')
  })

  it('generates personalized Kenyan B2B outreach email via Claude API and strips JSON fences', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: '```json\n{\n  "subject": "Silent backup power for Lake Naivasha Resort",\n  "paragraphs": [\n    "Dear Lake Naivasha Resort Team,",\n    "Keep guest Wi-Fi, reception, and rooms online during KPLC outages with the EcoFlow DELTA Pro (3.6kWh) — zero generator noise or diesel fumes.",\n    "Reply to this email for a custom commercial quote with full KRA eTIMS VAT invoicing.",\n    "Warm regards,\\nBatteriq Kenya Business Solutions"\n  ]\n}\n```',
          },
        ],
      }),
    })

    const generated = await generateOutreachEmailWithClaude({
      lead: {
        business_name: 'Lake Naivasha Resort',
        category: 'hotel',
        city: 'Naivasha',
        address: 'Moi South Lake Rd, Naivasha',
        website_url: 'https://lakenaivasharesort.co.ke',
        business_summary: 'Lakeside conference and leisure resort in Naivasha.',
      },
      products: [
        {
          name: 'EcoFlow DELTA Pro',
          brand: 'EcoFlow',
          category: 'Power Stations',
          price_kes: 420000,
        },
      ],
      senderName: 'Batteriq Kenya Business Solutions',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    expect(generated.subject).toBe('Silent backup power for Lake Naivasha Resort')
    expect(generated.bodyHtmlParagraphs).toHaveLength(4)
    expect(generated.bodyText).toContain('EcoFlow DELTA Pro')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('creates tamper-proof HMAC one-click unsubscribe tokens', () => {
    const token = createUnsubscribeToken('Reservations@SavannahHotel.co.ke', 'lead-uuid-123')
    const verified = verifyUnsubscribeToken(token)
    expect(verified).toEqual({
      email: 'reservations@savannahhotel.co.ke',
      leadId: 'lead-uuid-123',
    })

    // Tampered token must fail verification
    const tampered = `${token.slice(0, -3)}xyz`
    expect(verifyUnsubscribeToken(tampered)).toBeNull()
    expect(verifyUnsubscribeToken('invalid-token')).toBeNull()
  })

  it('renders compliant HTML and plain-text emails with sender identity, one-click unsubscribe, and no /logo.png', () => {
    const identity = buildSenderIdentity({
      sender_name: 'Batteriq Kenya Business Solutions',
      sender_email: 'Orders <sales@batteriq.com>',
    })
    expect(identity).toBe('Batteriq Kenya Business Solutions <sales@batteriq.com>')

    const unsubUrl = 'https://batteriq.com/unsubscribe?token=abc.def'
    const html = renderOutreachEmailHtml({
      subject: 'Power backup for Brookside Academy',
      paragraphsHtml: ['Hello Brookside Academy,', 'Keep your computer lab online.'],
      senderName: 'Batteriq Kenya Business Solutions',
      unsubscribeUrl: unsubUrl,
    })
    const text = renderOutreachEmailText({
      bodyText: 'Hello Brookside Academy,\n\nKeep your computer lab online.',
      senderName: 'Batteriq Kenya Business Solutions',
      unsubscribeUrl: unsubUrl,
    })

    expect(html).toContain('BATTERIQ')
    expect(html).not.toContain('/logo.png')
    expect(html).toContain('One-click Unsubscribe')
    expect(html).toContain(unsubUrl)
    expect(text).toContain(unsubUrl)
  })

  it('dispatches via Resend with RFC 8058 List-Unsubscribe one-click headers', async () => {
    const sendSpy = vi.fn().mockResolvedValue({
      data: { id: 're_msg_999' },
      error: null,
    })
    const fakeResend = { emails: { send: sendSpy } } as unknown as Resend

    const res = await dispatchOutreachEmailViaResend({
      emailRow: {
        id: 'em-1',
        lead_id: 'lead-1',
        to_email: 'info@hotel.co.ke',
        from_identity: 'Batteriq Kenya <sales@batteriq.com>',
        reply_to: 'sale@batteriq.com',
        subject: 'Backup power for your hotel',
        body_html: '<p>Hello</p>',
        body_text: 'Hello',
        unsubscribe_token: 'tok.123',
      },
      resendClient: fakeResend,
    })

    expect(res.resendMessageId).toBe('re_msg_999')
    expect(sendSpy).toHaveBeenCalledTimes(1)
    const sentPayload = sendSpy.mock.calls[0][0]
    expect(sentPayload.replyTo).toBe('sale@batteriq.com')
    expect(sentPayload.headers['List-Unsubscribe']).toBe(
      '<https://batteriq.com/api/outreach/unsubscribe?token=tok.123>'
    )
    expect(sentPayload.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  it('verifies Vercel Cron Authorization Bearer secret using timing-safe comparison', () => {
    const okReq = new Request('https://batteriq.com/api/cron/outreach-emails', {
      headers: { Authorization: 'Bearer cron-test-secret-2026' },
    })
    const badReq = new Request('https://batteriq.com/api/cron/outreach-emails', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    expect(isAuthorizedCronRequest(okReq)).toBe(true)
    expect(isAuthorizedCronRequest(badReq)).toBe(false)
  })
})
