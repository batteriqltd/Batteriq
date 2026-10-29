import { describe, it, expect, vi } from 'vitest'
import {
  buildAfricasTalkingVoiceXml,
  buildAiVoiceDisclosureScript,
  evaluateVoiceCallEligibility,
  VoiceCallComplianceError,
} from '@/lib/outreach/calling-stub'
import { POST as voiceCallbackPost } from '@/app/api/outreach/voice/callback/route'
import { POST as adminAuthPost } from '@/app/api/admin/auth/route'
import { verifySessionToken } from '@/lib/admin-auth'
import { NextRequest } from 'next/server'

describe('Phase 5 — Africa\'s Talking Voice Stub, Cold-Call Block & Mandatory AI Disclosure', () => {
  it('strictly blocks cold calls to leads with status "new" or "contacted" who never replied or requested contact', () => {
    expect(() =>
      evaluateVoiceCallEligibility({
        lead: {
          status: 'new',
          phone_e164: '+254202223333',
          source: 'google_places',
          whatsapp_opted_in: false,
          whatsapp_last_inbound_at: null,
        },
        isSuppressed: false,
      })
    ).toThrowError(VoiceCallComplianceError)

    expect(() =>
      evaluateVoiceCallEligibility({
        lead: {
          status: 'contacted',
          phone_e164: '+254202223333',
          source: 'google_places',
          whatsapp_opted_in: false,
          whatsapp_last_inbound_at: null,
        },
        isSuppressed: false,
      })
    ).toThrow(/only go to leads who replied or requested contact/i)
  })

  it('blocks opted-out or suppressed leads even if they previously replied', () => {
    expect(() =>
      evaluateVoiceCallEligibility({
        lead: {
          status: 'hot',
          phone_e164: '+254716822014',
          source: 'whatsapp_inbound',
          whatsapp_opted_in: true,
          whatsapp_last_inbound_at: new Date().toISOString(),
        },
        isSuppressed: true,
      })
    ).toThrow(/opted out/i)
  })

  it('allows calls ONLY to leads who replied or explicitly requested contact', () => {
    const repliedRes = evaluateVoiceCallEligibility({
      lead: {
        status: 'interested',
        phone_e164: '+254716822014',
        source: 'google_places',
        whatsapp_opted_in: false,
        whatsapp_last_inbound_at: null,
      },
      isSuppressed: false,
    })
    expect(repliedRes.eligibilityReason).toBe('lead_replied')

    const requestedRes = evaluateVoiceCallEligibility({
      lead: {
        status: 'new',
        phone_e164: '+254716822014',
        source: 'website_form',
        whatsapp_opted_in: true,
        whatsapp_last_inbound_at: null,
      },
      isSuppressed: false,
    })
    expect(requestedRes.eligibilityReason).toBe('requested_contact')
  })

  it('states explicitly at the start of every call and XML callback that it is an AI', async () => {
    const script = buildAiVoiceDisclosureScript('Savannah Hotel')
    expect(script.slice(0, 75).toLowerCase()).toContain('ai')
    expect(script).toContain('Batteriq Kenya')
    expect(script).toContain('Savannah Hotel')

    const xml = buildAfricasTalkingVoiceXml({ businessName: 'Savannah Hotel' })
    expect(xml).toContain('<Response>')
    expect(xml).toContain('<Say')
    expect(xml).toContain('automated AI assistant calling from Batteriq Kenya')

    const req = new NextRequest('https://batteriq.com/api/outreach/voice/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callerNumber: '+254716822014' }),
    })
    const res = await voiceCallbackPost(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')
    const resText = await res.text()
    expect(resText).toContain('automated AI assistant calling from Batteriq Kenya')
  })

  it('authenticates dedicated Outreach Admin login via env vars and issues outreach_admin session cookie', async () => {
    vi.stubEnv('OUTREACH_ADMIN_EMAIL', 'sale@batteriq.com')
    vi.stubEnv('OUTREACH_ADMIN_PASSWORD', 'test-env-only-secret')

    const okReq = new Request('https://batteriq.com/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.10.10.1' },
      body: JSON.stringify({ email: 'sale@batteriq.com', password: 'test-env-only-secret' }),
    })
    const okRes = await adminAuthPost(okReq)
    expect(okRes.status).toBe(200)
    const okJson = await okRes.json()
    expect(okJson.role).toBe('outreach_admin')
    expect(okJson.defaultRedirect).toBe('/outreach-admin')

    const setCookie = okRes.headers.get('set-cookie') || ''
    const match = setCookie.match(/batteriq_admin_session=([^;]+)/)
    expect(match).not.toBeNull()
    const decoded = verifySessionToken(decodeURIComponent(match![1]))
    expect(decoded?.email).toBe('sale@batteriq.com')
    expect(decoded?.role).toBe('outreach_admin')
  })
})
