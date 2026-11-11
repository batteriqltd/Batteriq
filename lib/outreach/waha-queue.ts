/**
 * WAHA outbound queue: cold intro messages at most 1 per minute, plus a
 * database-backed send limiter shared by every serverless instance.
 *
 * The limiter is the Postgres function `claim_whatsapp_send_slot` (migration
 * 009). It row-locks a per-bucket counter, so concurrent ticks (pg_cron, the
 * open admin console, a manual "send now") can never exceed the gap or cap.
 */
import {
  checkWahaNumberExists,
  getWahaSession,
  isWahaConfigured,
  sendWahaText,
  setWahaTyping,
} from '@/lib/waha'
import { checkInSuppressionSets, getOutreachSettings, loadSuppressionSets } from './compliance'
import { logOutreachEvent } from './logger'
import { sendOutreachNotification } from './notifications'
import { recommendBatteriqProformaForLead } from './proforma'
import { createOutreachAdminClient, fetchStoreCatalogProductsSafe } from './supabase'
import type { OutreachLead } from './types'
import { isKenyanLandline } from './validators'
import { sendProformaOnWhatsApp } from './whatsapp-proforma'
import { randomBetween, sleepMs, toWhatsAppDigits } from './whatsapp-transport'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = ReturnType<typeof createOutreachAdminClient> | any

export interface WahaCampaignSettings {
  waha_cold_enabled: boolean
  waha_cold_message: string
  waha_cold_daily_cap: number
  waha_cold_start_hour: number
  waha_cold_end_hour: number
  waha_cold_paused_until: string | null
}

export const DEFAULT_WAHA_COLD_MESSAGE =
  '{Hello|Hi|Good day} {business},\n\n' +
  '{What does a blackout cost you in a day?|When KPLC goes off, how much does it cost you?} ' +
  'Lost sales, spoilt stock and downtime add up fast.\n\n' +
  "We're the authorised EcoFlow and BLUETTI dealer in Kenya. Our backup systems take over the instant the power goes, " +
  'silently, with no fuel to buy and no generator to service. Every unit comes with a 24-month warranty and same-day delivery in Nairobi.\n\n' +
  "I've attached a quotation sized for {a business like yours|you}. You can also see the full range and order directly at {website}\n\n" +
  '{Shall I reserve one for you?|Would you like me to set this up for you?}'

export const DEFAULT_WAHA_CAMPAIGN: WahaCampaignSettings = {
  waha_cold_enabled: false,
  waha_cold_message: DEFAULT_WAHA_COLD_MESSAGE,
  waha_cold_daily_cap: 40,
  waha_cold_start_hour: 8,
  waha_cold_end_hour: 18,
  waha_cold_paused_until: null,
}

/** Minimum seconds between two cold messages: 1 every 2 minutes (pg_cron fires every 60s). */
export const COLD_MIN_GAP_SECONDS = 115
/** Manual (inbox / test) sends: tiny gap that only stops accidental floods. */
export const MANUAL_MIN_GAP_SECONDS = 2
export const MANUAL_DAILY_CAP = 1000

export async function getWahaCampaignSettings(supabase: Db): Promise<WahaCampaignSettings> {
  const { data } = await supabase
    .from('outreach_settings')
    .select(
      'waha_cold_enabled, waha_cold_message, waha_cold_daily_cap, waha_cold_start_hour, waha_cold_end_hour, waha_cold_paused_until'
    )
    .eq('id', 'default')
    .maybeSingle()
  return { ...DEFAULT_WAHA_CAMPAIGN, ...(data || {}) }
}

export interface SlotResult {
  allowed: boolean
  reason?: 'min_gap' | 'daily_cap'
  retryAfterSeconds?: number
  dayCount?: number
}

export async function claimSendSlot(
  supabase: Db,
  bucket: 'cold' | 'manual' | 'lead_topup' | 'email_autopilot',
  minGapSeconds: number,
  dailyCap: number
): Promise<SlotResult> {
  const { data, error } = await supabase.rpc('claim_whatsapp_send_slot', {
    p_bucket: bucket,
    p_min_gap_seconds: minGapSeconds,
    p_daily_cap: dailyCap,
  })
  if (error) {
    // Fail closed: never send without the limiter (e.g. migration not applied)
    throw new Error(`WhatsApp rate limiter unavailable: ${error.message}`)
  }
  const r = (data || {}) as {
    allowed?: boolean
    reason?: SlotResult['reason']
    retry_after_seconds?: number
    day_count?: number
  }
  return {
    allowed: Boolean(r.allowed),
    reason: r.reason,
    retryAfterSeconds: r.retry_after_seconds,
    dayCount: r.day_count,
  }
}

/** `{a|b|c}` → random choice; `{business}`, `{name}`, `{city}`, `{sender}` placeholders. */
export function renderColdMessage(
  template: string,
  vars: { business?: string | null; city?: string | null; sender?: string | null }
): string {
  const business = (vars.business || '').trim() || 'there'
  const map: Record<string, string> = {
    business,
    name: business,
    city: (vars.city || '').trim() || 'Kenya',
    sender: (vars.sender || '').trim() || 'the Batteriq team',
    website: (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').trim().replace(/\/+$/, ''),
  }
  return template
    .replace(/\{([^{}]*\|[^{}]*)\}/g, (_m, options: string) => {
      const parts = options.split('|')
      return parts[Math.floor(Math.random() * parts.length)]
    })
    .replace(/\{(business|name|city|sender|website)\}/g, (_m, key: string) => map[key])
    .trim()
}

export function nairobiHour(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Nairobi' })
      .format(now)
      .slice(0, 2)
  ) % 24
}

export interface ColdTickResult {
  sent: boolean
  reason?: string
  retryAfterSeconds?: number
  businessName?: string
  phoneE164?: string
  skippedNotOnWhatsApp?: number
  proformaVia?: 'file' | 'link' | 'failed' | 'off'
}

// Try several numbers per minute so a few non-WhatsApp numbers never waste a minute
const MAX_CANDIDATE_CHECKS = 10

/**
 * Sends the next cold intro (if allowed right now). Safe to call any number of
 * times — the DB slot claim guarantees >= COLD_MIN_GAP_SECONDS between sends.
 */
export async function runWahaColdTick(
  options: { jitter?: boolean; attachProforma?: boolean } = {}
): Promise<ColdTickResult> {
  if (!isWahaConfigured()) return { sent: false, reason: 'waha_not_configured' }

  const supabase = createOutreachAdminClient()
  const [settings, campaign] = await Promise.all([
    getOutreachSettings(supabase),
    getWahaCampaignSettings(supabase),
  ])

  if (!campaign.waha_cold_enabled) return { sent: false, reason: 'cold_campaign_disabled' }
  if (settings.campaign_paused) return { sent: false, reason: 'campaign_paused' }
  if (campaign.waha_cold_paused_until && Date.parse(campaign.waha_cold_paused_until) > Date.now()) {
    return { sent: false, reason: 'auto_paused_by_whatsapp_limit' }
  }
  const hour = nairobiHour()
  if (hour < campaign.waha_cold_start_hour || hour >= campaign.waha_cold_end_hour) {
    return { sent: false, reason: 'outside_sending_hours' }
  }

  const session = await getWahaSession()
  if (session?.status !== 'WORKING') return { sent: false, reason: 'whatsapp_not_connected' }

  // Candidate leads not yet attempted over WhatsApp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates, error: candErr } = await (supabase.from('outreach_leads') as any)
    .select('*')
    .in('status', ['new', 'contacted'])
    .not('phone_e164', 'is', null)
    .is('whatsapp_cold_attempted_at', null)
    .order('created_at', { ascending: true })
    .limit(60)
  if (candErr) throw new Error(`lead query failed: ${candErr.message}`)

  const suppression = await loadSuppressionSets(supabase)
  const eligible: OutreachLead[] = []
  for (const lead of (candidates || []) as OutreachLead[]) {
    const phone = lead.phone_e164?.trim()
    if (!phone) continue
    const skip =
      isKenyanLandline(phone) ||
      !toWhatsAppDigits(phone) ||
      checkInSuppressionSets(suppression, { email: lead.email, phoneE164: phone, domain: lead.domain })
    if (skip) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({ whatsapp_cold_attempted_at: new Date().toISOString(), whatsapp_cold_result: 'ineligible' })
        .eq('id', lead.id)
      continue
    }
    eligible.push(lead)
    if (eligible.length >= MAX_CANDIDATE_CHECKS) break
  }
  if (eligible.length === 0) return { sent: false, reason: 'no_eligible_leads' }

  const slot = await claimSendSlot(supabase, 'cold', COLD_MIN_GAP_SECONDS, campaign.waha_cold_daily_cap)
  if (!slot.allowed) {
    return { sent: false, reason: slot.reason, retryAfterSeconds: slot.retryAfterSeconds }
  }

  if (options.jitter) await sleepMs(randomBetween(0, 8_000))

  let skippedNotOnWhatsApp = 0
  for (const lead of eligible) {
    const phone = lead.phone_e164 as string
    const digits = toWhatsAppDigits(phone) as string
    const nowIso = new Date().toISOString()

    // Claim the lead first so no other tick picks it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: claimed } = await (supabase.from('outreach_leads') as any)
      .update({ whatsapp_cold_attempted_at: nowIso })
      .eq('id', lead.id)
      .is('whatsapp_cold_attempted_at', null)
      .select('id')
    if (!claimed || claimed.length === 0) continue

    // Already have a thread with this number? Never cold-message it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingConv } = await (supabase.from('outreach_conversations') as any)
      .select('id')
      .eq('phone_e164', phone)
      .maybeSingle()
    if (existingConv) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({ whatsapp_cold_result: 'existing_thread' })
        .eq('id', lead.id)
      continue
    }

    const check = await checkWahaNumberExists(digits)
    if (!check.exists) {
      skippedNotOnWhatsApp++
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({ whatsapp_cold_result: 'not_on_whatsapp' })
        .eq('id', lead.id)
      continue
    }

    const chatId = check.chatId || `${digits}@c.us`
    const text = renderColdMessage(campaign.waha_cold_message || DEFAULT_WAHA_COLD_MESSAGE, {
      business: lead.business_name,
      city: lead.city,
      sender: settings.sender_name,
    })

    try {
      await setWahaTyping(chatId, true)
      await sleepMs(randomBetween(1_500, 3_500))
      await setWahaTyping(chatId, false)
      const { messageId } = await sendWahaText({ chatId, text })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conv, error: convErr } = await (supabase.from('outreach_conversations') as any)
        .insert({
          lead_id: lead.id,
          phone_e164: phone,
          wa_chat_id: chatId,
          contact_name: lead.business_name,
          mode: 'ai',
          status: 'open',
          opted_in: false,
          last_outbound_at: nowIso,
          last_message_preview: text.slice(0, 140),
          unread_count: 0,
        })
        .select('id')
        .single()
      if (convErr) throw new Error(`conversation insert failed: ${convErr.message}`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_messages') as any).insert({
        conversation_id: conv.id,
        lead_id: lead.id,
        direction: 'outbound',
        sender_type: 'system_template',
        message_type: 'text',
        template_name: 'cold_intro',
        body: text,
        wa_message_id: messageId,
        delivery_status: 'sent',
        provider: 'waha',
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({ status: 'contacted', whatsapp_cold_result: 'sent', updated_at: nowIso })
        .eq('id', lead.id)

      // Follow the intro with the tailored PDF proforma for this lead
      let proformaVia: 'file' | 'link' | 'failed' | 'off' = 'off'
      if (options.attachProforma !== false) {
        try {
          const catalog = await fetchStoreCatalogProductsSafe(100, ['Power Stations', 'Solar Panels'])
          const proforma = recommendBatteriqProformaForLead(lead, catalog)
          await sleepMs(randomBetween(2_000, 4_000))
          const res = await sendProformaOnWhatsApp({
            supabase,
            conversationId: conv.id,
            leadId: lead.id,
            chatId,
            proforma,
            senderType: 'system_template',
          })
          proformaVia = res.via
        } catch (pfErr) {
          proformaVia = 'failed'
          await logOutreachEvent({
            module: 'whatsapp',
            level: 'warn',
            event: 'waha_cold_proforma_failed',
            message: pfErr instanceof Error ? pfErr.message : 'proforma send failed',
            metadata: { leadId: lead.id },
          })
        }
      }

      await logOutreachEvent({
        module: 'whatsapp',
        level: 'info',
        event: 'waha_cold_sent',
        message: `Cold WhatsApp intro sent to ${lead.business_name} (proforma: ${proformaVia})`,
        metadata: { leadId: lead.id, dayCount: slot.dayCount, proformaVia },
      })

      return {
        sent: true,
        businessName: lead.business_name,
        phoneE164: phone,
        skippedNotOnWhatsApp,
        proformaVia,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({ whatsapp_cold_result: 'failed' })
        .eq('id', lead.id)

      // WhatsApp anti-spam signals: 463 = reach-out timelock, 475 = message capping
      if (/\b(463|475)\b/.test(message)) {
        const until = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('outreach_settings') as any)
          .update({ waha_cold_paused_until: until })
          .eq('id', 'default')
        await sendOutreachNotification({
          event: 'autopilot_error',
          body: 'WhatsApp limited new-contact messages. Cold sending auto-paused for 6 hours.',
          url: '/outreach-admin#settings',
        }).catch(() => {})
      }

      await logOutreachEvent({
        module: 'whatsapp',
        level: 'error',
        event: 'waha_cold_failed',
        message,
        metadata: { leadId: lead.id },
      })
      return { sent: false, reason: 'send_failed', skippedNotOnWhatsApp }
    }
  }

  return { sent: false, reason: 'no_whatsapp_numbers_in_batch', skippedNotOnWhatsApp }
}

export async function getColdCampaignStats(supabase: Db): Promise<{
  sentToday: number
  lastSentAt: string | null
  remainingLeads: number | null
}> {
  const [slotRes, remainingRes] = await Promise.all([
    supabase
      .from('whatsapp_send_slots')
      .select('day, day_count, last_sent_at')
      .eq('bucket', 'cold')
      .maybeSingle(),
    supabase
      .from('outreach_leads')
      .select('id', { count: 'exact', head: true })
      .in('status', ['new', 'contacted'])
      .not('phone_e164', 'is', null)
      .is('whatsapp_cold_attempted_at', null),
  ])
  const slot = slotRes.data as { day?: string; day_count?: number; last_sent_at?: string } | null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date())
  return {
    sentToday: slot?.day === today ? slot.day_count || 0 : 0,
    lastSentAt: slot?.last_sent_at || null,
    remainingLeads: typeof remainingRes.count === 'number' ? remainingRes.count : null,
  }
}

/** Below this many un-messaged leads, the agent goes looking for more on its own. */
export const LEAD_TOPUP_THRESHOLD = 40
/** At most one automatic lead search every 2 hours, 10 per day. */
const LEAD_TOPUP_GAP_SECONDS = 2 * 60 * 60
const LEAD_TOPUP_DAILY_CAP = 10

/**
 * Keeps the cold queue fed without anyone adding leads by hand: when the
 * WhatsApp campaign is on and few leads are left, run a small Lead Finder
 * batch (rotating sector x city, incl. bars, restaurants, salons, shops…).
 */
export async function maybeTopUpLeads(): Promise<{ started: boolean; reason?: string; leadsSaved?: number }> {
  const supabase = createOutreachAdminClient()
  const campaign = await getWahaCampaignSettings(supabase)
  if (!campaign.waha_cold_enabled) return { started: false, reason: 'cold_campaign_disabled' }

  const stats = await getColdCampaignStats(supabase)
  if (stats.remainingLeads === null || stats.remainingLeads >= LEAD_TOPUP_THRESHOLD) {
    return { started: false, reason: 'enough_leads' }
  }

  const slot = await claimSendSlot(supabase, 'lead_topup', LEAD_TOPUP_GAP_SECONDS, LEAD_TOPUP_DAILY_CAP)
  if (!slot.allowed) return { started: false, reason: slot.reason }

  // Imported lazily: the lead finder is large and only needed here
  const { runLeadFinderJob } = await import('./lead-finder')
  const result = await runLeadFinderJob({ queriesPerRun: 2, maxPlacesPerQuery: 8 })
  await logOutreachEvent({
    module: 'lead_finder',
    level: 'info',
    event: 'auto_lead_topup',
    message: `WhatsApp queue was low (${stats.remainingLeads} left) — found ${result.leadsSaved} new leads (${result.queriesExecuted.join(' | ')})`,
    metadata: { leadsSaved: result.leadsSaved, errors: result.errors.slice(0, 3) },
  })
  return { started: true, leadsSaved: result.leadsSaved }
}

/** Email autopilot (find clients online + send emails with quotes) every 30 minutes. */
const EMAIL_AUTOPILOT_GAP_SECONDS = 29 * 60
const EMAIL_AUTOPILOT_DAILY_CAP = 48

/**
 * Called from the every-minute Supabase timer, so the email side keeps working
 * with the console closed. The DB slot guarantees at most one cycle per 30 min
 * across all callers. The cycle runs in its own function invocation (own 60s
 * budget) via the autopilot cron route.
 */
export async function maybeRunEmailAutopilot(): Promise<{ started: boolean; reason?: string; status?: number }> {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return { started: false, reason: 'cron_secret_missing' }

  const supabase = createOutreachAdminClient()
  const settings = await getOutreachSettings(supabase)
  if (!settings.autopilot_enabled) return { started: false, reason: 'autopilot_disabled' }
  if (settings.campaign_paused) return { started: false, reason: 'campaign_paused' }

  const slot = await claimSendSlot(supabase, 'email_autopilot', EMAIL_AUTOPILOT_GAP_SECONDS, EMAIL_AUTOPILOT_DAILY_CAP)
  if (!slot.allowed) return { started: false, reason: slot.reason }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').trim().replace(/\/+$/, '')
  const res = await fetch(`${site}/api/cron/outreach-autopilot`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${cronSecret}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(58_000),
  }).catch(() => null)
  await logOutreachEvent({
    module: 'email_campaign',
    level: res?.ok ? 'info' : 'warn',
    event: 'email_autopilot_timer',
    message: res?.ok
      ? 'Email autopilot cycle ran from the background timer (console not needed)'
      : `Email autopilot cycle from the background timer failed (HTTP ${res?.status ?? 'no response'})`,
  }).catch(() => {})
  return { started: true, status: res?.status }
}
