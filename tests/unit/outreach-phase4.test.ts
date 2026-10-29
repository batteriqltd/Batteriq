import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  detectDeterministicHumanRequest,
  detectDeterministicOptOut,
  generateWhatsAppAiReplyWithClaude,
} from '@/lib/outreach/claude'
import { isEligibleForWebsiteWhatsAppFollowup } from '@/lib/outreach/followups'

describe('Phase 4 — AI Takeover, Escalation & Website Consent Follow-Ups', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key')
  })

  describe('Claude AI Takeover & Lead Status Transitions', () => {
    it('classifies hot leads and triggers escalation when high buying intent is expressed', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                reply:
                  'We have 3 units of EcoFlow DELTA Pro in stock in Nairobi with official KRA eTIMS VAT invoicing. I am connecting our senior commercial specialist right now to issue your proforma invoice.',
                newStatus: 'hot',
                wantsHuman: false,
                isOptOut: false,
                reasoning: 'Lead requested proforma invoice for 3 DELTA Pro units',
              }),
            },
          ],
        }),
      })

      const decision = await generateWhatsAppAiReplyWithClaude({
        lead: {
          business_name: 'Mombasa Beach Hotel',
          category: 'hotel',
          city: 'Mombasa',
          status: 'interested',
        },
        history: [
          {
            direction: 'inbound',
            sender_type: 'lead',
            body: 'Do you have EcoFlow DELTA Pro?',
            created_at: new Date().toISOString(),
          },
        ],
        inboundMessage: 'Send us a proforma invoice for 3 units with eTIMS today.',
        fetchImpl: mockFetch as unknown as typeof fetch,
      })

      expect(decision.newStatus).toBe('hot')
      expect(decision.isOptOut).toBe(false)
      expect(decision.reply).toContain('proforma invoice')
    })

    it('detects requests to speak with a human deterministically even if AI misses wantsHuman', async () => {
      expect(detectDeterministicHumanRequest('Can I speak to a human agent please?')).toBe(true)
      expect(detectDeterministicHumanRequest('Please have someone call me')).toBe(true)
      expect(detectDeterministicHumanRequest('What is the battery capacity?')).toBe(false)

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                reply: 'Sure, transferring you to our team right away.',
                newStatus: 'interested',
                wantsHuman: false,
                isOptOut: false,
                reasoning: 'General inquiry',
              }),
            },
          ],
        }),
      })

      const decision = await generateWhatsAppAiReplyWithClaude({
        lead: { business_name: 'Nairobi Clinic', status: 'replied' },
        history: [],
        inboundMessage: 'I want to talk to a real person on your sales team',
        fetchImpl: mockFetch as unknown as typeof fetch,
      })

      expect(decision.wantsHuman).toBe(true)
    })

    it('short-circuits immediately on STOP / opt-out keywords without wasting Claude tokens', async () => {
      expect(detectDeterministicOptOut('STOP')).toBe(true)
      expect(detectDeterministicOptOut('Unsubscribe')).toBe(true)
      expect(detectDeterministicOptOut('Please stop messaging me')).toBe(true)

      const spyFetch = vi.fn()
      const decision = await generateWhatsAppAiReplyWithClaude({
        lead: { business_name: 'Shop Ltd', status: 'contacted' },
        history: [],
        inboundMessage: 'STOP',
        fetchImpl: spyFetch as unknown as typeof fetch,
      })

      expect(spyFetch).not.toHaveBeenCalled()
      expect(decision.isOptOut).toBe(true)
      expect(decision.newStatus).toBe('opted_out')
    })
  })

  describe('Website Lead N-Day WhatsApp Follow-Up Consent & Human-Contact Rules', () => {
    const nowMs = Date.parse('2026-10-29T08:00:00Z')
    const eightDaysAgo = new Date(nowMs - 8 * 24 * 60 * 60 * 1000).toISOString()
    const threeDaysAgo = new Date(nowMs - 3 * 24 * 60 * 60 * 1000).toISOString()

    it('approves website leads >= N days old with explicit consent and zero human contact', () => {
      const res = isEligibleForWebsiteWhatsAppFollowup({
        lead: {
          source: 'website_form',
          whatsapp_opted_in: true,
          phone_e164: '+254716822014',
          status: 'new',
          human_contacted_at: null,
          followup_sent_at: null,
          created_at: eightDaysAgo,
        },
        followupDays: 7,
        isSuppressed: false,
        hasConsentRecord: true,
        hasHumanMessageInThread: false,
        nowMs,
      })
      expect(res).toEqual({ eligible: true, reason: 'eligible' })
    })

    it('blocks website leads who did NOT tick WhatsApp consent on the form', () => {
      const noFlag = isEligibleForWebsiteWhatsAppFollowup({
        lead: {
          source: 'website_form',
          whatsapp_opted_in: false,
          phone_e164: '+254716822014',
          status: 'new',
          human_contacted_at: null,
          followup_sent_at: null,
          created_at: eightDaysAgo,
        },
        followupDays: 7,
        isSuppressed: false,
        hasConsentRecord: false,
        nowMs,
      })
      expect(noFlag.eligible).toBe(false)
      expect(noFlag.reason).toBe('missing_explicit_form_consent')
    })

    it('blocks website leads that already received human contact or are younger than N days', () => {
      const contacted = isEligibleForWebsiteWhatsAppFollowup({
        lead: {
          source: 'website_form',
          whatsapp_opted_in: true,
          phone_e164: '+254716822014',
          status: 'replied',
          human_contacted_at: threeDaysAgo,
          followup_sent_at: null,
          created_at: eightDaysAgo,
        },
        followupDays: 7,
        isSuppressed: false,
        hasConsentRecord: true,
        nowMs,
      })
      expect(contacted.eligible).toBe(false)
      expect(contacted.reason).toBe('already_had_human_contact')

      const tooRecent = isEligibleForWebsiteWhatsAppFollowup({
        lead: {
          source: 'website_form',
          whatsapp_opted_in: true,
          phone_e164: '+254716822014',
          status: 'new',
          human_contacted_at: null,
          followup_sent_at: null,
          created_at: threeDaysAgo,
        },
        followupDays: 7,
        isSuppressed: false,
        hasConsentRecord: true,
        nowMs,
      })
      expect(tooRecent.eligible).toBe(false)
      expect(tooRecent.reason).toBe('not_old_enough_yet')
    })
  })
})
