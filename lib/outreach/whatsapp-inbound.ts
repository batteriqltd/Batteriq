/**
 * Shared inbound WhatsApp pipeline (Meta Cloud API + WAHA).
 *
 * Phase 1 (`persistInboundWhatsAppMessage`) is fast and runs BEFORE the webhook
 * responds: it upserts lead + conversation and inserts the message. The unique
 * `wa_message_id` makes it idempotent — duplicates are detected and skipped.
 *
 * Phase 2 (`runInboundFollowUp`) does the slow work (AI reply / opt-out
 * confirmation / push notification) after the response via waitUntil.
 */
import { resolveWahaLid, sendWahaSeen } from '@/lib/waha'
import { handleAiTakeoverForInboundMessage } from './ai-takeover'
import { detectDeterministicOptOut } from './claude'
import { recordConsent, recordPermanentOptOut } from './compliance'
import { logOutreachEvent } from './logger'
import { sendOutreachNotification } from './notifications'
import { createOutreachAdminClient } from './supabase'
import type { OutreachConversation, OutreachLead } from './types'
import {
  chatIdToPhoneE164,
  randomBetween,
  sendWhatsAppText,
  sleepMs,
  type WhatsAppProvider,
} from './whatsapp-transport'

/** Conversation row including the WAHA-only column added in migration 009. */
export type WaConversation = OutreachConversation & { wa_chat_id?: string | null }

export interface NormalizedInboundMessage {
  provider: WhatsAppProvider
  waMessageId: string
  /** E.164 phone, or `lid:<id>` when WhatsApp hides the number and it can't be resolved. */
  phoneE164: string
  /** Chat id to reply to (WAHA only), e.g. `254712345678@c.us` or `123@lid`. */
  chatId: string | null
  contactName: string | null
  messageType: 'text' | 'interactive' | 'unsupported'
  body: string
  timestampIso: string
}

const AI_REPLY_MAX_AGE_MS = 10 * 60 * 1000
/** Message is marked read ~30s after it arrives (randomized). */
const READ_DELAY_MIN_MS = 26_000
const READ_DELAY_MAX_MS = 31_000
/** Everything (read wait + typing) must finish within the 60s webhook limit. */
const REPLY_BUDGET_MS = 55_000

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505')
}

export async function persistInboundWhatsAppMessage(
  msg: NormalizedInboundMessage
): Promise<{ duplicate: boolean; conversationId?: string; leadId?: string | null }> {
  const supabase = createOutreachAdminClient()
  const isWaha = msg.provider === 'waha'

  // Idempotency fast-path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingMsg } = await (supabase.from('outreach_messages') as any)
    .select('id')
    .eq('wa_message_id', msg.waMessageId)
    .maybeSingle()
  if (existingMsg) return { duplicate: true }

  // Lead: match or create
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: lead } = (await (supabase.from('outreach_leads') as any)
    .select('*')
    .eq('phone_e164', msg.phoneE164)
    .limit(1)
    .maybeSingle()) as { data: OutreachLead | null }

  if (!lead) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdLead } = await (supabase.from('outreach_leads') as any)
      .insert({
        business_name: msg.contactName || `WhatsApp ${msg.phoneE164}`,
        category: 'other',
        phone_e164: msg.phoneE164,
        source: 'whatsapp_inbound',
        status: 'replied',
        whatsapp_opted_in: true,
        whatsapp_last_inbound_at: msg.timestampIso,
      })
      .select('*')
      .single()
    lead = createdLead as OutreachLead | null

    await recordConsent(supabase, {
      leadId: lead?.id || null,
      phoneE164: msg.phoneE164,
      channel: 'whatsapp',
      action: 'opt_in',
      legalBasis: 'customer_initiated_inbound_whatsapp',
      consentText: 'Customer messaged Batteriq WhatsApp number',
      source: 'whatsapp_webhook_inbound',
    }).catch(() => {})
  } else {
    const nextStatus = lead.status === 'new' || lead.status === 'contacted' ? 'replied' : lead.status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedLead } = await (supabase.from('outreach_leads') as any)
      .update({
        whatsapp_opted_in: lead.status !== 'opted_out',
        whatsapp_last_inbound_at: msg.timestampIso,
        status: nextStatus,
      })
      .eq('id', lead.id)
      .select('*')
      .single()
    if (updatedLead) lead = updatedLead as OutreachLead
  }

  // Conversation: match by phone, then (WAHA) by chat id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: existingConv } = (await (supabase.from('outreach_conversations') as any)
    .select('*')
    .eq('phone_e164', msg.phoneE164)
    .maybeSingle()) as { data: WaConversation | null }

  if (!existingConv && isWaha && msg.chatId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('outreach_conversations') as any)
      .select('*')
      .eq('wa_chat_id', msg.chatId)
      .limit(1)
      .maybeSingle()
    existingConv = data as WaConversation | null
  }

  let conversation: WaConversation | null
  if (!existingConv) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdConv, error } = await (supabase.from('outreach_conversations') as any)
      .insert({
        lead_id: lead?.id || null,
        phone_e164: msg.phoneE164,
        contact_name: msg.contactName || lead?.business_name || null,
        mode: 'ai',
        unread_count: 1,
        last_inbound_at: msg.timestampIso,
        last_message_preview: msg.body.slice(0, 140),
        opted_in: true,
        status: 'open',
        ...(isWaha ? { wa_chat_id: msg.chatId } : {}),
      })
      .select('*')
      .single()
    if (error && !isUniqueViolation(error)) throw new Error(`conversation insert failed: ${error.message}`)
    conversation = createdConv as WaConversation | null
    if (!conversation) {
      // Lost a race with a concurrent webhook for the same number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('outreach_conversations') as any)
        .select('*')
        .eq('phone_e164', msg.phoneE164)
        .maybeSingle()
      conversation = data as WaConversation | null
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedConv } = await (supabase.from('outreach_conversations') as any)
      .update({
        lead_id: existingConv.lead_id || lead?.id || null,
        contact_name: existingConv.contact_name || msg.contactName,
        unread_count: (existingConv.unread_count || 0) + 1,
        last_inbound_at: msg.timestampIso,
        last_message_preview: msg.body.slice(0, 140),
        opted_in: existingConv.status !== 'opted_out',
        ...(isWaha && !existingConv.wa_chat_id && msg.chatId ? { wa_chat_id: msg.chatId } : {}),
      })
      .eq('id', existingConv.id)
      .select('*')
      .single()
    conversation = (updatedConv as WaConversation | null) || existingConv
  }

  if (!conversation) throw new Error('Could not resolve WhatsApp conversation')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase.from('outreach_messages') as any).insert({
    conversation_id: conversation.id,
    lead_id: lead?.id || null,
    direction: 'inbound',
    sender_type: 'lead',
    message_type: msg.messageType,
    body: msg.body,
    wa_message_id: msg.waMessageId,
    delivery_status: 'received',
    ...(isWaha ? { provider: 'waha' } : {}),
  })
  if (insertError) {
    if (isUniqueViolation(insertError)) return { duplicate: true }
    throw new Error(`message insert failed: ${insertError.message}`)
  }

  return { duplicate: false, conversationId: conversation.id, leadId: lead?.id || null }
}

/** Slow follow-up work for a freshly stored inbound message. */
export async function runInboundFollowUp(params: {
  msg: NormalizedInboundMessage
  conversationId: string
}): Promise<void> {
  const { msg, conversationId } = params
  const supabase = createOutreachAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conv } = (await (supabase.from('outreach_conversations') as any)
    .select('*, outreach_leads(*)')
    .eq('id', conversationId)
    .maybeSingle()) as { data: (WaConversation & { outreach_leads: OutreachLead | null }) | null }
  if (!conv) return
  const lead = conv.outreach_leads || null

  sendOutreachNotification({
    event: 'whatsapp_message',
    body: `${conv.contact_name || lead?.business_name || msg.phoneE164}: ${msg.body.slice(0, 120)}`,
    url: '/outreach-admin#whatsapp',
    id: conv.id,
  }).catch(() => {})

  // Always honour STOP / UNSUBSCRIBE, even in Human Mode
  if (detectDeterministicOptOut(msg.body)) {
    await recordPermanentOptOut(supabase, {
      phoneE164: msg.phoneE164.startsWith('+') ? msg.phoneE164 : null,
      email: lead?.email || null,
      leadId: lead?.id || null,
      reason: 'whatsapp_stop_keyword',
      channel: 'all',
      source: 'whatsapp_webhook_inbound',
    })
    const confirmation = 'You have been unsubscribed from Batteriq messages. Thank you.'
    try {
      const { waMessageId, provider } = await sendWhatsAppText({
        toPhoneE164: msg.phoneE164,
        chatId: conv.wa_chat_id || msg.chatId,
        body: confirmation,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_messages') as any).insert({
        conversation_id: conv.id,
        lead_id: lead?.id || null,
        direction: 'outbound',
        sender_type: 'ai',
        message_type: 'text',
        body: confirmation,
        wa_message_id: waMessageId,
        delivery_status: 'sent',
        ...(provider === 'waha' ? { provider: 'waha' } : {}),
      })
    } catch {
      // non-fatal
    }
    return
  }

  // Don't auto-reply to a backlog (e.g. messages redelivered after a reconnect)
  if (Date.now() - Date.parse(msg.timestampIso) > AI_REPLY_MAX_AGE_MS) return

  if (conv.mode === 'ai' && conv.status !== 'opted_out') {
    // Behave like a person: read the message ~30s after it arrives, then type
    // at a fast human speed. All of this must finish inside the webhook's 60s.
    const startedAt = Date.now()
    const readAt = startedAt + randomBetween(READ_DELAY_MIN_MS, READ_DELAY_MAX_MS)
    const beforeReply =
      msg.provider === 'waha'
        ? async (): Promise<boolean> => {
            await sleepMs(Math.max(0, readAt - Date.now()))
            // Customer sent something newer, or staff took over → let that win
            const [latestRes, convRes] = await Promise.all([
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (supabase.from('outreach_messages') as any)
                .select('wa_message_id')
                .eq('conversation_id', conv.id)
                .eq('direction', 'inbound')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (supabase.from('outreach_conversations') as any)
                .select('mode, status')
                .eq('id', conv.id)
                .maybeSingle(),
            ])
            const latestId = latestRes.data?.wa_message_id as string | undefined
            const chatId = conv.wa_chat_id || msg.chatId
            if (chatId) await sendWahaSeen(chatId, [msg.waMessageId]).catch(() => {})
            if (latestId && latestId !== msg.waMessageId) return false
            if (convRes.data?.mode !== 'ai' || convRes.data?.status === 'opted_out') return false
            // A moment to "think" before starting to type
            await sleepMs(randomBetween(700, 1_800))
            return true
          }
        : undefined
    try {
      await handleAiTakeoverForInboundMessage({
        conversation: conv,
        lead,
        inboundText: msg.body,
        beforeReply,
        replyDeadline: startedAt + REPLY_BUDGET_MS,
      })
    } catch (err) {
      await logOutreachEvent({
        module: 'ai_takeover',
        level: 'error',
        event: 'ai_reply_failed',
        message: err instanceof Error ? err.message : 'AI reply failed',
        metadata: { conversationId: conv.id, provider: msg.provider },
      })
    }
  }
}

// ── WAHA webhook payload handling ───────────────────────────────────────────

interface WahaEnvelope {
  id?: string
  event?: string
  session?: string
  me?: { id?: string } | null
  payload?: Record<string, unknown>
}

export function isWahaEnvelope(body: unknown): body is WahaEnvelope {
  return Boolean(
    body &&
      typeof body === 'object' &&
      typeof (body as WahaEnvelope).event === 'string' &&
      typeof (body as WahaEnvelope).session === 'string'
  )
}

/** Finds a phone-number JID inside engine-specific `_data`, ignoring our own number. */
function findPhoneJidInData(data: unknown, ownDigits: string | null, depth = 0): string | null {
  if (!data || depth > 3) return null
  if (typeof data === 'string') {
    const m = /^(\d{10,15})(?::\d+)?@(s\.whatsapp\.net|c\.us)$/.exec(data)
    if (m && m[1] !== ownDigits) return `${m[1]}@c.us`
    return null
  }
  if (typeof data !== 'object') return null
  for (const value of Object.values(data as Record<string, unknown>)) {
    const found = findPhoneJidInData(value, ownDigits, depth + 1)
    if (found) return found
  }
  return null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const ACK_TO_STATUS: Record<number, 'sent' | 'delivered' | 'read' | 'failed'> = {
  [-1]: 'failed',
  1: 'sent',
  2: 'delivered',
  3: 'read',
  4: 'read',
}

/**
 * Handles one verified WAHA event. Fast DB work happens here; anything slow is
 * returned as a follow-up task for the route to schedule after responding.
 */
export async function handleWahaWebhookEvent(
  env: WahaEnvelope
): Promise<{ handled: string; followUp?: () => Promise<void> }> {
  const supabase = createOutreachAdminClient()
  const p = env.payload || {}

  if (env.event === 'session.status') {
    const status = str(p.status) || 'UNKNOWN'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('whatsapp_session_state') as any).upsert(
      {
        id: env.session || 'default',
        status,
        me_id: env.me?.id || null,
        last_event_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    await logOutreachEvent({
      module: 'whatsapp',
      level: status === 'FAILED' ? 'error' : 'info',
      event: 'waha_session_status',
      message: `WhatsApp session status: ${status}`,
    })
    if (status === 'FAILED' || status === 'SCAN_QR_CODE') {
      return {
        handled: 'session.status',
        followUp: async () => {
          await sendOutreachNotification({
            event: 'autopilot_error',
            body:
              status === 'FAILED'
                ? 'WhatsApp disconnected (FAILED). Open Settings → WhatsApp to reconnect.'
                : 'WhatsApp needs a QR scan. Open Settings → WhatsApp.',
            url: '/outreach-admin#settings',
          }).catch(() => {})
        },
      }
    }
    return { handled: 'session.status' }
  }

  // Touch "last webhook seen" for the health indicator (best effort)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('whatsapp_session_state') as any)
    .upsert(
      { id: env.session || 'default', last_event_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .then(() => {}, () => {})

  if (env.event === 'message.ack') {
    const id = str(p.id)
    const ack = typeof p.ack === 'number' ? p.ack : Number(p.ack)
    const status = ACK_TO_STATUS[ack]
    if (id && status) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_messages') as any)
        .update({ delivery_status: status })
        .eq('wa_message_id', id)
        .eq('direction', 'outbound')
    }
    return { handled: 'message.ack' }
  }

  if (env.event !== 'message' && env.event !== 'message.any') return { handled: 'ignored' }

  const from = str(p.from) || ''
  const to = str(p.to) || ''
  const fromMe = p.fromMe === true
  const peer = fromMe ? to : from
  const waMessageId = str(p.id)
  if (!waMessageId || !peer) return { handled: 'ignored' }
  if (/@(g\.us|newsletter|broadcast)$/.test(peer) || peer === 'status@broadcast') {
    return { handled: 'ignored_non_dm' }
  }

  const ownDigits = (env.me?.id || '').split('@')[0].split(':')[0] || null
  let phoneJid: string | null = chatIdToPhoneE164(peer) ? peer : null
  if (!phoneJid && peer.endsWith('@lid')) {
    phoneJid = (await resolveWahaLid(peer)) || findPhoneJidInData(p._data, ownDigits)
  }
  const phoneE164 = chatIdToPhoneE164(phoneJid) || `lid:${peer.split('@')[0]}`

  const hasMedia = p.hasMedia === true
  const text = str(p.body)
  const body = text || (hasMedia ? '[Media attachment received]' : '[Unsupported message]')
  const unix = Number(p.timestamp)
  const timestampIso =
    Number.isFinite(unix) && unix > 0
      ? new Date(unix > 1e12 ? unix : unix * 1000).toISOString()
      : new Date().toISOString()

  // ── Staff typed on the linked phone → record it and switch thread to Human ──
  if (fromMe) {
    if (str(p.source) !== 'app') return { handled: 'ignored_own_api_message' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv } = await (supabase.from('outreach_conversations') as any)
      .select('id, lead_id')
      .or(`phone_e164.eq."${phoneE164}",wa_chat_id.eq."${peer}"`)
      .limit(1)
      .maybeSingle()
    if (!conv) return { handled: 'ignored_untracked_chat' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('outreach_messages') as any).insert({
      conversation_id: conv.id,
      lead_id: conv.lead_id,
      direction: 'outbound',
      sender_type: 'human',
      message_type: 'text',
      body,
      wa_message_id: waMessageId,
      delivery_status: 'sent',
      provider: 'waha',
      ai_metadata: { sent_from: 'phone' },
    })
    if (error && !isUniqueViolation(error)) throw new Error(error.message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_conversations') as any)
      .update({
        mode: 'human',
        last_outbound_at: timestampIso,
        last_message_preview: body.slice(0, 140),
        unread_count: 0,
      })
      .eq('id', conv.id)
    return { handled: 'staff_phone_message' }
  }

  const _data = (p._data || {}) as Record<string, unknown>
  const info = (_data.Info || {}) as Record<string, unknown>
  const contactName =
    str(info.PushName) || str(_data.notifyName) || str(_data.pushName) || str(p.notifyName) || null

  const msg: NormalizedInboundMessage = {
    provider: 'waha',
    waMessageId,
    phoneE164,
    chatId: peer,
    contactName,
    messageType: text ? 'text' : 'unsupported',
    body,
    timestampIso,
  }

  const result = await persistInboundWhatsAppMessage(msg)
  if (result.duplicate || !result.conversationId) return { handled: 'duplicate' }

  const conversationId = result.conversationId
  return {
    handled: 'message',
    followUp: () => runInboundFollowUp({ msg, conversationId }),
  }
}
