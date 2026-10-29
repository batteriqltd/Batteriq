import crypto from 'crypto'
import { escapeHtml } from './claude'
import { isSuppressed } from './compliance'
import { logOutreachEvent } from './logger'
import { createOutreachAdminClient } from './supabase'
import type { OutreachCallLog, OutreachLead } from './types'

export class VoiceCallComplianceError extends Error {
  readonly code: 'OPTED_OUT' | 'COLD_CALL_FORBIDDEN' | 'MISSING_PHONE'

  constructor(
    message: string,
    code: 'OPTED_OUT' | 'COLD_CALL_FORBIDDEN' | 'MISSING_PHONE'
  ) {
    super(message)
    this.name = 'VoiceCallComplianceError'
    this.code = code
  }
}

/**
 * Enforces voice calling eligibility:
 * - Never call opted-out or suppressed numbers.
 * - Never cold-call: calls ONLY go to leads who replied ('replied' | 'interested' | 'hot' or inbound message)
 *   OR leads who explicitly requested contact (consented website inquiry / explicit callback request).
 */
export function evaluateVoiceCallEligibility(params: {
  lead: Pick<
    OutreachLead,
    'status' | 'phone_e164' | 'source' | 'whatsapp_opted_in' | 'whatsapp_last_inbound_at'
  >
  isSuppressed: boolean
  explicitContactRequest?: boolean
}): { eligibilityReason: 'lead_replied' | 'requested_contact' } {
  const { lead, isSuppressed: suppressed, explicitContactRequest = false } = params

  if (suppressed || lead.status === 'opted_out') {
    throw new VoiceCallComplianceError(
      'Voice call blocked: contact has opted out and is on the permanent suppression list.',
      'OPTED_OUT'
    )
  }

  if (!lead.phone_e164) {
    throw new VoiceCallComplianceError(
      'Voice call blocked: lead does not have a validated +254 phone number.',
      'MISSING_PHONE'
    )
  }

  const hasReplied =
    ['replied', 'interested', 'hot'].includes(lead.status) ||
    Boolean(lead.whatsapp_last_inbound_at)

  const requestedContact =
    explicitContactRequest ||
    (lead.source === 'website_form' && lead.whatsapp_opted_in)

  if (!hasReplied && !requestedContact) {
    throw new VoiceCallComplianceError(
      'Cold voice calls are prohibited. Calls only go to leads who replied or requested contact.',
      'COLD_CALL_FORBIDDEN'
    )
  }

  return {
    eligibilityReason: hasReplied ? 'lead_replied' : 'requested_contact',
  }
}

/**
 * Mandatory AI disclosure opening statement — always announces upfront that caller is an AI.
 */
export function buildAiVoiceDisclosureScript(businessName?: string | null): string {
  const target = businessName?.trim() ? ` for ${businessName.trim()}` : ''
  return `Hello! Please note this is an automated AI assistant calling from Batteriq Kenya, the authorised EcoFlow and BLUETTI backup power distributor. We are following up on your inquiry${target}. Press 1 at any time to be connected to a human specialist, or press 9 to opt out of future calls.`
}

/**
 * Builds Africa's Talking Voice XML response (Phase 2 stub ready for live AT Voice webhook).
 */
export function buildAfricasTalkingVoiceXml(params: {
  businessName?: string | null
  callbackUrl?: string
}): string {
  const script = escapeHtml(buildAiVoiceDisclosureScript(params.businessName))
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').replace(/\/$/, '')
  const cbUrl = escapeHtml(params.callbackUrl || `${siteUrl}/api/outreach/voice/callback`)

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <GetDigits timeout="10" numDigits="1" callbackUrl="${cbUrl}">
    <Say playBeep="false">${script}</Say>
  </GetDigits>
</Response>`
}

export function getAfricasTalkingStubReadiness(): {
  configured: boolean
  username: string | null
  callerId: string | null
} {
  const apiKey = process.env.AFRICASTALKING_API_KEY?.trim() || ''
  const username = process.env.AFRICASTALKING_USERNAME?.trim() || null
  const callerId = process.env.AFRICASTALKING_CALLER_ID?.trim() || null

  return {
    configured: Boolean(apiKey && apiKey !== 'replace_me' && username && callerId),
    username,
    callerId,
  }
}

/**
 * Phase 2 Stub: Validates warm-lead eligibility, builds mandatory AI disclosure script,
 * and records the stubbed Africa's Talking voice session in outreach_call_logs.
 */
export async function queueStubVoiceCall(params: {
  leadId: string
  requestedBy: string
}): Promise<OutreachCallLog> {
  const supabase = createOutreachAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lead, error } = (await (supabase.from('outreach_leads') as any)
    .select('*')
    .eq('id', params.leadId)
    .maybeSingle()) as { data: OutreachLead | null; error: { message: string } | null }

  if (error || !lead) {
    throw new Error('Lead not found')
  }

  const suppressed = await isSuppressed(supabase, {
    phoneE164: lead.phone_e164,
    email: lead.email,
  })

  const { eligibilityReason } = evaluateVoiceCallEligibility({
    lead,
    isSuppressed: suppressed,
  })

  const disclosureScript = buildAiVoiceDisclosureScript(lead.business_name)
  const atReadiness = getAfricasTalkingStubReadiness()
  const stubSessionId = `AT_STUB_${crypto.randomBytes(6).toString('hex').toUpperCase()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase.from('outreach_call_logs') as any)
    .insert({
      lead_id: lead.id,
      phone_e164: lead.phone_e164,
      eligibility_reason: eligibilityReason,
      ai_disclosure_script: disclosureScript,
      provider: 'africas_talking_stub',
      status: 'stub_queued',
      provider_session_id: stubSessionId,
      notes: `Phase 2 stubbed call queued by ${params.requestedBy} (AT env configured: ${atReadiness.configured})`,
    })
    .select('*')
    .single()

  if (insertError || !inserted) {
    throw new Error(insertError?.message || 'Failed to save stub call log')
  }

  await logOutreachEvent({
    module: 'calling',
    level: 'info',
    event: 'stub_voice_call_queued',
    message: `Stubbed Africa's Talking AI voice call queued for ${lead.business_name} (${lead.phone_e164}) — reason: ${eligibilityReason}`,
    metadata: {
      leadId: lead.id,
      phoneE164: lead.phone_e164,
      eligibilityReason,
      stubSessionId,
      atConfigured: atReadiness.configured,
    },
  })

  return inserted as OutreachCallLog
}
