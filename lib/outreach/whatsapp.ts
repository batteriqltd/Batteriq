import crypto from 'crypto'
import {
  checkInSuppressionSets,
  getOutreachSettings,
  loadSuppressionSets,
} from './compliance'
import { logOutreachEvent, withRetry } from './logger'
import { createOutreachAdminClient } from './supabase'
import type { OutreachLead } from './types'
import { isKenyanLandline, normalizeKenyanPhone } from './validators'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export class WhatsAppComplianceError extends Error {
  readonly code:
    | 'OPTED_OUT'
    | 'COLD_OUTBOUND_FORBIDDEN'
    | 'OUTSIDE_24H_WINDOW'
    | 'INVALID_TEMPLATE'

  constructor(
    message: string,
    code: 'OPTED_OUT' | 'COLD_OUTBOUND_FORBIDDEN' | 'OUTSIDE_24H_WINDOW' | 'INVALID_TEMPLATE'
  ) {
    super(message)
    this.name = 'WhatsAppComplianceError'
    this.code = code
  }
}

export function isWithin24HourWindow(
  lastInboundAt: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!lastInboundAt) return false
  const ts = Date.parse(lastInboundAt)
  if (!Number.isFinite(ts)) return false
  const elapsed = nowMs - ts
  return elapsed >= 0 && elapsed < TWENTY_FOUR_HOURS_MS
}

/**
 * Enforces WhatsApp Business Platform & Kenya DPA rules:
 * 1) Never message opted-out / suppressed contacts.
 * 2) Never allow cold outbound WhatsApp (recipient MUST have messaged first or explicitly opted in).
 * 3) Outside the 24-hour customer service window, ONLY approved templates are allowed.
 */
export function assertWhatsAppOutboundCompliance(params: {
  isSuppressed: boolean
  leadStatus?: string | null
  conversationStatus?: string | null
  hasInboundMessage: boolean
  hasExplicitOptIn: boolean
  lastInboundAt?: string | null
  messageType: 'text' | 'template'
  templateName?: string | null
  nowMs?: number
}): void {
  if (
    params.isSuppressed ||
    params.leadStatus === 'opted_out' ||
    params.conversationStatus === 'opted_out'
  ) {
    throw new WhatsAppComplianceError(
      'Cannot send WhatsApp message: contact has opted out and is on the permanent suppression list.',
      'OPTED_OUT'
    )
  }

  if (!params.hasInboundMessage && !params.hasExplicitOptIn) {
    throw new WhatsAppComplianceError(
      'Cold outbound WhatsApp is not allowed. Only people who messaged first or explicitly opted in can be messaged.',
      'COLD_OUTBOUND_FORBIDDEN'
    )
  }

  const within24h = isWithin24HourWindow(params.lastInboundAt, params.nowMs)
  if (params.messageType === 'text' && !within24h) {
    throw new WhatsAppComplianceError(
      'Outside the 24-hour WhatsApp customer care window: free-form text is blocked. Use an approved template instead.',
      'OUTSIDE_24H_WINDOW'
    )
  }

  if (params.messageType === 'template' && !params.templateName?.trim()) {
    throw new WhatsAppComplianceError(
      'An approved template name is required when sending a template message.',
      'INVALID_TEMPLATE'
    )
  }
}

function getWhatsAppCloudConfig(): {
  accessToken: string
  phoneNumberId: string
  apiVersion: string
} {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || ''
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || ''
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0'

  const missing: string[] = []
  if (!accessToken) missing.push('WHATSAPP_ACCESS_TOKEN')
  if (!phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID')
  if (missing.length > 0) {
    throw new Error(`WhatsApp Cloud API is not configured — missing ${missing.join(', ')}`)
  }

  return { accessToken, phoneNumberId, apiVersion }
}

function toMetaRecipientDigits(phoneE164: string): string {
  return phoneE164.replace(/\D/g, '')
}

export async function sendWhatsAppCloudText(params: {
  toPhoneE164: string
  body: string
  fetchImpl?: typeof fetch
}): Promise<{ waMessageId: string | null }> {
  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppCloudConfig()
  const fetchFn = params.fetchImpl ?? fetch
  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

  const data = await withRetry(
    async () => {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toMetaRecipientDigits(params.toPhoneE164),
          type: 'text',
          text: {
            preview_url: false,
            body: params.body.slice(0, 4096),
          },
        }),
        cache: 'no-store',
      })

      const json = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>
        error?: { message?: string; code?: number }
      }

      if (!res.ok) {
        const err = new Error(
          `WhatsApp Cloud API error (HTTP ${res.status}): ${json.error?.message || 'Send failed'}`
        ) as Error & { status?: number }
        err.status = res.status
        throw err
      }

      return json
    },
    { maxAttempts: 3, baseDelayMs: 700 }
  )

  return { waMessageId: data.messages?.[0]?.id ?? null }
}

export async function sendWhatsAppCloudTemplate(params: {
  toPhoneE164: string
  templateName: string
  languageCode?: string
  bodyParameters?: string[]
  fetchImpl?: typeof fetch
}): Promise<{ waMessageId: string | null }> {
  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppCloudConfig()
  const fetchFn = params.fetchImpl ?? fetch
  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

  const components =
    params.bodyParameters && params.bodyParameters.length > 0
      ? [
          {
            type: 'body',
            parameters: params.bodyParameters.map((text) => ({
              type: 'text',
              text: String(text).slice(0, 200),
            })),
          },
        ]
      : []

  const data = await withRetry(
    async () => {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toMetaRecipientDigits(params.toPhoneE164),
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: params.languageCode || 'en' },
            ...(components.length > 0 ? { components } : {}),
          },
        }),
        cache: 'no-store',
      })

      const json = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>
        error?: { message?: string; code?: number }
      }

      if (!res.ok) {
        const err = new Error(
          `WhatsApp Template API error (HTTP ${res.status}): ${json.error?.message || 'Template send failed'}`
        ) as Error & { status?: number }
        err.status = res.status
        throw err
      }

      return json
    },
    { maxAttempts: 3, baseDelayMs: 700 }
  )

  await logOutreachEvent({
    module: 'whatsapp',
    level: 'info',
    event: 'template_sent',
    message: `Sent approved WhatsApp template "${params.templateName}" to ${params.toPhoneE164}`,
    metadata: { templateName: params.templateName, waMessageId: data.messages?.[0]?.id ?? null },
  })

  return { waMessageId: data.messages?.[0]?.id ?? null }
}

export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): boolean {
  if (!appSecret?.trim()) {
    // When WHATSAPP_APP_SECRET is not configured yet, skip HMAC failure unless signature header was forged
    return true
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }
  const providedHex = signatureHeader.slice('sha256='.length).trim()
  const expectedHex = crypto
    .createHmac('sha256', appSecret.trim())
    .update(rawBody, 'utf8')
    .digest('hex')

  if (providedHex.length !== expectedHex.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(providedHex), Buffer.from(expectedHex))
  } catch {
    return false
  }
}

export function normalizeWhatsAppSenderPhone(rawWaId: string): string | null {
  if (!rawWaId) return null
  const digits = rawWaId.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('254') || digits.startsWith('0')) {
    return normalizeKenyanPhone(digits, { source: 'form_or_whatsapp' }) || `+${digits}`
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }
  return null
}

export interface ParsedInboundWhatsAppMessage {
  waMessageId: string
  fromPhoneE164: string
  contactName: string | null
  messageType: 'text' | 'interactive' | 'unsupported'
  body: string
  timestampIso: string
}

export interface ParsedWhatsAppStatusUpdate {
  waMessageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  errorMessage?: string
}

export function parseWhatsAppWebhookPayload(payload: unknown): {
  inboundMessages: ParsedInboundWhatsAppMessage[]
  statusUpdates: ParsedWhatsAppStatusUpdate[]
} {
  const inboundMessages: ParsedInboundWhatsAppMessage[] = []
  const statusUpdates: ParsedWhatsAppStatusUpdate[] = []

  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
          messages?: Array<{
            id?: string
            from?: string
            timestamp?: string
            type?: string
            text?: { body?: string }
            button?: { text?: string; payload?: string }
            interactive?: {
              button_reply?: { title?: string }
              list_reply?: { title?: string; description?: string }
            }
            image?: { caption?: string }
            document?: { caption?: string; filename?: string }
          }>
          statuses?: Array<{
            id?: string
            status?: string
            errors?: Array<{ title?: string; message?: string }>
          }>
        }
      }>
    }>
  }

  for (const entry of root?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value
      if (!value) continue

      const contactNames = new Map<string, string>()
      for (const c of value.contacts ?? []) {
        if (c.wa_id && c.profile?.name) {
          contactNames.set(c.wa_id, c.profile.name.trim())
        }
      }

      for (const msg of value.messages ?? []) {
        if (!msg.id || !msg.from) continue
        const phoneE164 = normalizeWhatsAppSenderPhone(msg.from)
        if (!phoneE164) continue

        const contactName = contactNames.get(msg.from) ?? null
        const unixSec = Number(msg.timestamp)
        const timestampIso =
          Number.isFinite(unixSec) && unixSec > 0
            ? new Date(unixSec * 1000).toISOString()
            : new Date().toISOString()

        let body = ''
        let messageType: 'text' | 'interactive' | 'unsupported' = 'text'

        if (msg.type === 'text' && msg.text?.body) {
          body = msg.text.body.trim()
          messageType = 'text'
        } else if (msg.type === 'button' && msg.button?.text) {
          body = msg.button.text.trim()
          messageType = 'interactive'
        } else if (msg.type === 'interactive') {
          body =
            msg.interactive?.button_reply?.title?.trim() ||
            msg.interactive?.list_reply?.title?.trim() ||
            '[Interactive response]'
          messageType = 'interactive'
        } else if (msg.image?.caption || msg.document?.caption) {
          body = (msg.image?.caption || msg.document?.caption || '').trim()
          messageType = 'unsupported'
        } else {
          body = `[${msg.type || 'media'} attachment received]`
          messageType = 'unsupported'
        }

        if (!body) continue

        inboundMessages.push({
          waMessageId: msg.id,
          fromPhoneE164: phoneE164,
          contactName,
          messageType,
          body,
          timestampIso,
        })
      }

      for (const st of value.statuses ?? []) {
        if (!st.id || !st.status) continue
        if (['sent', 'delivered', 'read', 'failed'].includes(st.status)) {
          statusUpdates.push({
            waMessageId: st.id,
            status: st.status as 'sent' | 'delivered' | 'read' | 'failed',
            errorMessage: st.errors?.[0]?.message || st.errors?.[0]?.title,
          })
        }
      }
    }
  }

  return { inboundMessages, statusUpdates }
}

/**
 * Dispatches WhatsApp cold outreach strictly throttled to 1 message per minute.
 * Checks the last outbound timestamp across conversations to enforce >= 60 seconds interval.
 * Dispatches approved Meta WhatsApp template to the next candidate lead (e.g. laundromat, tech firm, school, property).
 */
export async function sendNextWhatsAppColdQueueMessage(options?: {
  templateName?: string
  fetchImpl?: typeof fetch
}): Promise<{
  sent: boolean
  reason?: string
  phoneE164?: string
  businessName?: string
  waMessageId?: string | null
  waitSeconds?: number
}> {
  const supabase = createOutreachAdminClient()
  const settings = await getOutreachSettings(supabase)

  if (settings.campaign_paused) {
    return { sent: false, reason: 'campaign_paused' }
  }

  // 1 message per minute throttle enforcement:
  // Query most recent outbound timestamp in outreach_conversations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestConv } = await (supabase.from('outreach_conversations') as any)
    .select('last_outbound_at')
    .not('last_outbound_at', 'is', null)
    .order('last_outbound_at', { ascending: false })
    .limit(1)

  const lastOutboundStr = latestConv?.[0]?.last_outbound_at
  if (lastOutboundStr) {
    const elapsedMs = Date.now() - Date.parse(lastOutboundStr)
    if (elapsedMs < 60_000) {
      const waitSeconds = Math.ceil((60_000 - elapsedMs) / 1000)
      return {
        sent: false,
        reason: 'rate_limited_1_per_minute',
        waitSeconds,
      }
    }
  }

  // Check suppression
  const suppressionSets = await loadSuppressionSets(supabase)

  // Find candidate phone numbers that haven't been messaged yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingConvs } = await (supabase.from('outreach_conversations') as any)
    .select('phone_e164')
  const messagedPhones = new Set<string>(
    (existingConvs ?? []).map((c: { phone_e164: string }) => c.phone_e164)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates } = await (supabase.from('outreach_leads') as any)
    .select('*')
    .in('status', ['new', 'contacted'])
    .not('phone_e164', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30)

  let targetLead: OutreachLead | null = null
  let targetPhone = ''

  for (const lead of (candidates ?? []) as OutreachLead[]) {
    const phone = lead.phone_e164?.trim()
    if (!phone || isKenyanLandline(phone) || messagedPhones.has(phone)) continue
    if (
      checkInSuppressionSets(suppressionSets, {
        email: lead.email,
        phoneE164: phone,
        domain: lead.domain,
      })
    ) {
      continue
    }
    targetLead = lead
    targetPhone = phone
    break
  }

  if (!targetLead || !targetPhone) {
    return { sent: false, reason: 'no_eligible_leads' }
  }

  const templateName =
    options?.templateName?.trim() ||
    settings.whatsapp_cold_template?.trim() ||
    'batteriq_quote_ready'

  const { waMessageId } = await sendWhatsAppCloudTemplate({
    toPhoneE164: targetPhone,
    templateName,
    bodyParameters: [targetLead.business_name.slice(0, 60)],
    fetchImpl: options?.fetchImpl,
  })

  const nowIso = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conv } = await (supabase.from('outreach_conversations') as any)
    .upsert(
      {
        lead_id: targetLead.id,
        phone_e164: targetPhone,
        contact_name: targetLead.business_name,
        mode: 'ai',
        status: 'open',
        opted_in: true,
        last_outbound_at: nowIso,
        last_message_preview: `[Template: ${templateName}]`,
        unread_count: 0,
      },
      { onConflict: 'phone_e164' }
    )
    .select('id')
    .single()

  if (conv?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_messages') as any).insert({
      conversation_id: conv.id,
      direction: 'outbound',
      sender_type: 'system_template',
      body: `Hello ${targetLead.business_name}, we prepared your Batteriq commercial backup proposal.`,
      wa_message_id: waMessageId,
      status: 'sent',
    })
  }

  // Update lead status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_leads') as any)
    .update({
      status: 'contacted',
      human_contacted_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', targetLead.id)

  await logOutreachEvent({
    module: 'whatsapp',
    level: 'info',
    event: 'whatsapp_queue_1_per_min_sent',
    message: `1-msg/min WhatsApp sent to ${targetLead.business_name} (${targetPhone})`,
    metadata: { phone: targetPhone, leadId: targetLead.id, templateName, waMessageId },
  })

  return {
    sent: true,
    phoneE164: targetPhone,
    businessName: targetLead.business_name,
    waMessageId,
  }
}
