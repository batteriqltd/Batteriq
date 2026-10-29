import {
  checkInSuppressionSets,
  getOutreachSettings,
  loadSuppressionSets,
} from './compliance'
import { logOutreachEvent, sleep } from './logger'
import { createOutreachAdminClient, createStoreAdminClientSafe } from './supabase'
import type { OutreachLead } from './types'
import {
  assertWhatsAppOutboundCompliance,
  sendWhatsAppCloudTemplate,
} from './whatsapp'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Pure deterministic eligibility check for N-day website WhatsApp follow-ups:
 * - Must be a website lead (`source === 'website_form'`)
 * - Must have explicitly ticked WhatsApp consent on the form (`whatsapp_opted_in === true`)
 * - Must have a valid +254 phone number (`phone_e164`)
 * - Must NOT be opted out or suppressed
 * - Must have NO human contact (`human_contacted_at === null` and `!hasHumanReply`)
 * - Must NOT have already received a follow-up (`followup_sent_at === null`)
 * - Must be at least `followupDays` (default 7, configurable) old
 */
export function isEligibleForWebsiteWhatsAppFollowup(params: {
  lead: Pick<
    OutreachLead,
    | 'source'
    | 'whatsapp_opted_in'
    | 'phone_e164'
    | 'status'
    | 'human_contacted_at'
    | 'followup_sent_at'
    | 'created_at'
  >
  followupDays: number
  isSuppressed: boolean
  hasConsentRecord: boolean
  hasHumanMessageInThread?: boolean
  nowMs?: number
}): { eligible: boolean; reason: string } {
  const {
    lead,
    followupDays,
    isSuppressed,
    hasConsentRecord,
    hasHumanMessageInThread = false,
    nowMs = Date.now(),
  } = params

  if (lead.source !== 'website_form') {
    return { eligible: false, reason: 'not_website_lead' }
  }
  if (!lead.whatsapp_opted_in || !hasConsentRecord) {
    return { eligible: false, reason: 'missing_explicit_form_consent' }
  }
  if (!lead.phone_e164) {
    return { eligible: false, reason: 'missing_phone_e164' }
  }
  if (isSuppressed || lead.status === 'opted_out') {
    return { eligible: false, reason: 'opted_out_or_suppressed' }
  }
  if (lead.status === 'customer') {
    return { eligible: false, reason: 'already_customer' }
  }
  if (lead.human_contacted_at || hasHumanMessageInThread) {
    return { eligible: false, reason: 'already_had_human_contact' }
  }
  if (lead.followup_sent_at) {
    return { eligible: false, reason: 'followup_already_sent' }
  }

  const createdTs = Date.parse(lead.created_at)
  if (!Number.isFinite(createdTs)) {
    return { eligible: false, reason: 'invalid_created_at' }
  }

  const minAgeMs = Math.max(1, followupDays) * DAY_MS
  if (nowMs - createdTs < minAgeMs) {
    return { eligible: false, reason: 'not_old_enough_yet' }
  }

  return { eligible: true, reason: 'eligible' }
}

export interface FollowupsRunResult {
  followupDays: number
  templateName: string
  scannedCount: number
  sentCount: number
  skippedReasons: Record<string, number>
  errors: string[]
}

export async function runWebsiteFollowupsJob(options: {
  fetchImpl?: typeof fetch
  nowMs?: number
} = {}): Promise<FollowupsRunResult> {
  const supabase = createOutreachAdminClient()
  const storeDb = createStoreAdminClientSafe()
  const settings = await getOutreachSettings(supabase)
  const suppressionSets = await loadSuppressionSets(supabase)

  const followupDays = Math.max(1, settings.followup_days || 7)
  const templateName =
    settings.whatsapp_followup_template?.trim() || 'batteriq_inquiry_followup'
  const nowMs = options.nowMs ?? Date.now()
  const cutoffIso = new Date(nowMs - followupDays * DAY_MS).toISOString()

  // Query website leads older than N days without follow-up
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates } = await (supabase.from('outreach_leads') as any)
    .select('*')
    .eq('source', 'website_form')
    .is('followup_sent_at', null)
    .lte('created_at', cutoffIso)
    .limit(100)

  const leads = (candidates ?? []) as OutreachLead[]
  let sentCount = 0
  const skippedReasons: Record<string, number> = {}
  const errors: string[] = []

  for (const lead of leads) {
    // Verify immutable opt_in consent record exists in outreach_consent_records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: consentRows } = await (supabase.from('outreach_consent_records') as any)
      .select('id')
      .eq('action', 'opt_in')
      .in('channel', ['whatsapp', 'all'])
      .or(
        [
          lead.id ? `lead_id.eq.${lead.id}` : '',
          lead.phone_e164 ? `phone_e164.eq.${lead.phone_e164}` : '',
        ]
          .filter(Boolean)
          .join(',')
      )
      .limit(1)

    const hasConsentRecord = Boolean(consentRows && consentRows.length > 0)

    // Check if any human outbound message was sent in outreach_messages for this lead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: humanMsgs } = await (supabase.from('outreach_messages') as any)
      .select('id')
      .eq('lead_id', lead.id)
      .eq('sender_type', 'human')
      .limit(1)

    // Also check if admin marked matching contact_submission as replied in Store Supabase
    let contactSubReplied = false
    const subId = (lead.source_details as { contact_submission_id?: string })
      ?.contact_submission_id
    if (subId && storeDb) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: subRow } = await (storeDb.from('contact_submissions') as any)
          .select('status')
          .eq('id', subId)
          .maybeSingle()
        if (subRow && subRow.status === 'replied') {
          contactSubReplied = true
        }
      } catch {
        // Non-fatal if Store Supabase isn't accessible in standalone mode
      }
    }

    const suppressed = checkInSuppressionSets(suppressionSets, {
      email: lead.email,
      phoneE164: lead.phone_e164,
    })

    const check = isEligibleForWebsiteWhatsAppFollowup({
      lead,
      followupDays,
      isSuppressed: suppressed,
      hasConsentRecord,
      hasHumanMessageInThread: Boolean((humanMsgs && humanMsgs.length > 0) || contactSubReplied),
      nowMs,
    })

    if (!check.eligible || !lead.phone_e164) {
      skippedReasons[check.reason] = (skippedReasons[check.reason] || 0) + 1
      continue
    }

    try {
      // Enforce WhatsApp compliance guard (explicit opt-in + approved template outside 24h window)
      assertWhatsAppOutboundCompliance({
        isSuppressed: suppressed,
        leadStatus: lead.status,
        hasInboundMessage: Boolean(lead.whatsapp_last_inbound_at),
        hasExplicitOptIn: true,
        lastInboundAt: lead.whatsapp_last_inbound_at,
        messageType: 'template',
        templateName,
        nowMs,
      })

      const firstName = lead.business_name.split(/\s+/)[0] || 'there'
      const { waMessageId } = await sendWhatsAppCloudTemplate({
        toPhoneE164: lead.phone_e164,
        templateName,
        bodyParameters: [firstName],
        fetchImpl: options.fetchImpl,
      })

      const sentAtIso = new Date(nowMs).toISOString()

      // Upsert conversation thread so customer replies land seamlessly in AI/Admin inbox
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conv } = await (supabase.from('outreach_conversations') as any)
        .upsert(
          {
            lead_id: lead.id,
            phone_e164: lead.phone_e164,
            contact_name: lead.business_name,
            opted_in: true,
            last_outbound_at: sentAtIso,
            last_message_preview: `[Follow-up Template: ${templateName}]`,
          },
          { onConflict: 'phone_e164' }
        )
        .select('id')
        .single()

      if (conv?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('outreach_messages') as any).insert({
          conversation_id: conv.id,
          lead_id: lead.id,
          direction: 'outbound',
          sender_type: 'system_template',
          message_type: 'template',
          body: `[${followupDays}-Day Website Follow-up Template: ${templateName}] Hi ${firstName}`,
          template_name: templateName,
          wa_message_id: waMessageId,
          delivery_status: 'sent',
        })
      }

      // Stamp followup_sent_at on outreach_leads and contact_submissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({
          followup_sent_at: sentAtIso,
          status: lead.status === 'new' ? 'contacted' : lead.status,
        })
        .eq('id', lead.id)

      if (subId && storeDb) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (storeDb.from('contact_submissions') as any)
          .update({ whatsapp_followup_sent_at: sentAtIso })
          .eq('id', subId)
          .then(() => {})
          .catch(() => {})
      }

      sentCount++
      await sleep(300)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${lead.phone_e164}: ${msg}`)
      await logOutreachEvent({
        module: 'followups',
        level: 'error',
        event: 'followup_send_failed',
        message: `Failed ${followupDays}-day WhatsApp follow-up for ${lead.business_name}: ${msg}`,
        metadata: { leadId: lead.id, phone: lead.phone_e164 },
      })
    }
  }

  await logOutreachEvent({
    module: 'followups',
    level: 'info',
    event: 'followups_job_completed',
    message: `Website ${followupDays}-day WhatsApp follow-ups: scanned=${leads.length}, sent=${sentCount}`,
    metadata: { followupDays, templateName, scannedCount: leads.length, sentCount, skippedReasons },
  })

  return {
    followupDays,
    templateName,
    scannedCount: leads.length,
    sentCount,
    skippedReasons,
    errors,
  }
}
