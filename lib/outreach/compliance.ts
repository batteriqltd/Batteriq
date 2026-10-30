import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'
import { DEFAULT_OUTREACH_SETTINGS, type OutreachSettings } from './types'
import { extractDomain, normalizeKenyanPhone } from './validators'
import { logOutreachEvent } from './logger'

export interface SuppressionSets {
  emails: Set<string>
  phones: Set<string>
  domains: Set<string>
}

export function hashIpForAudit(ip: string | null | undefined): string | null {
  if (!ip || ip === 'unknown') return null
  const salt = process.env.ADMIN_SESSION_SECRET
  if (!salt) return null
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

export function isAuthorizedCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false

  const authHeader = req.headers.get('authorization') || ''
  const expected = `Bearer ${cronSecret}`
  if (authHeader.length !== expected.length) return false

  try {
    return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  } catch {
    return false
  }
}

export function verifyCronOrAdminAuth(req: Request): {
  authorized: boolean
  actor: 'cron' | 'admin' | null
  adminEmail?: string
} {
  if (isAuthorizedCronRequest(req)) {
    return { authorized: true, actor: 'cron' }
  }
  const session = getAdminSession()
  if (session) {
    return { authorized: true, actor: 'admin', adminEmail: session.email }
  }
  return { authorized: false, actor: null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOutreachSettings(supabase: SupabaseClient<any>): Promise<OutreachSettings> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('outreach_settings') as any)
      .select('*')
      .eq('id', 'default')
      .maybeSingle()

    if (error || !data) {
      return {
        ...DEFAULT_OUTREACH_SETTINGS,
        sender_email:
          process.env.RESEND_OUTREACH_FROM_EMAIL ||
          process.env.RESEND_FROM_EMAIL ||
          DEFAULT_OUTREACH_SETTINGS.sender_email,
        reply_to_email:
          process.env.OUTREACH_REPLY_TO_EMAIL ||
          DEFAULT_OUTREACH_SETTINGS.reply_to_email,
      }
    }

    return {
      ...DEFAULT_OUTREACH_SETTINGS,
      ...data,
    }
  } catch {
    return DEFAULT_OUTREACH_SETTINGS
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadSuppressionSets(supabase: SupabaseClient<any>): Promise<SuppressionSets> {
  const emails = new Set<string>()
  const phones = new Set<string>()
  const domains = new Set<string>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase.from('outreach_suppression_list') as any)
    .select('email, phone_e164, domain')

  for (const row of rows ?? []) {
    if (row.email) emails.add(String(row.email).toLowerCase().trim())
    if (row.phone_e164) phones.add(String(row.phone_e164).trim())
    if (row.domain) domains.add(String(row.domain).toLowerCase().trim())
  }

  // Also include any lead explicitly marked opted_out as defense-in-depth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: optedOutLeads } = await (supabase.from('outreach_leads') as any)
    .select('email, phone_e164')
    .eq('status', 'opted_out')

  for (const lead of optedOutLeads ?? []) {
    if (lead.email) emails.add(String(lead.email).toLowerCase().trim())
    if (lead.phone_e164) phones.add(String(lead.phone_e164).trim())
  }

  return { emails, phones, domains }
}

export function checkInSuppressionSets(
  sets: SuppressionSets,
  target: { email?: string | null; phoneE164?: string | null; domain?: string | null }
): boolean {
  const email = target.email?.toLowerCase().trim() || null
  const phone = target.phoneE164?.trim() || null
  const domain =
    target.domain?.toLowerCase().trim() ||
    (email && email.includes('@') ? email.split('@')[1] : null)

  if (email && sets.emails.has(email)) return true
  if (phone && sets.phones.has(phone)) return true
  if (domain && sets.domains.has(domain)) return true
  return false
}

export async function isSuppressed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  target: {
    email?: string | null
    phoneE164?: string | null
    domain?: string | null
  }
): Promise<boolean> {
  const email = target.email?.toLowerCase().trim() || null
  const phone =
    (target.phoneE164 &&
      (target.phoneE164.startsWith('+')
        ? target.phoneE164.trim()
        : normalizeKenyanPhone(target.phoneE164, { source: 'form_or_whatsapp' }))) ||
    null
  const domain =
    target.domain?.toLowerCase().trim() ||
    (email && email.includes('@') ? email.split('@')[1] : null)

  if (!email && !phone && !domain) return false

  if (email) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('outreach_suppression_list') as any)
      .select('id')
      .ilike('email', email)
      .limit(1)
    if (data && data.length > 0) return true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: leadOptOut } = await (supabase.from('outreach_leads') as any)
      .select('id')
      .ilike('email', email)
      .eq('status', 'opted_out')
      .limit(1)
    if (leadOptOut && leadOptOut.length > 0) return true
  }

  if (phone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('outreach_suppression_list') as any)
      .select('id')
      .eq('phone_e164', phone)
      .limit(1)
    if (data && data.length > 0) return true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: leadOptOut } = await (supabase.from('outreach_leads') as any)
      .select('id')
      .eq('phone_e164', phone)
      .eq('status', 'opted_out')
      .limit(1)
    if (leadOptOut && leadOptOut.length > 0) return true
  }

  if (domain) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('outreach_suppression_list') as any)
      .select('id')
      .ilike('domain', domain)
      .limit(1)
    if (data && data.length > 0) return true
  }

  return false
}

export async function recordConsent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: {
    leadId?: string | null
    contactSubmissionId?: string | null
    email?: string | null
    phoneE164?: string | null
    channel: 'email' | 'whatsapp' | 'voice' | 'all'
    action: 'opt_in' | 'opt_out' | 'legitimate_interest_b2b'
    legalBasis: string
    consentText?: string | null
    source: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_consent_records') as any).insert({
    lead_id: params.leadId ?? null,
    contact_submission_id: params.contactSubmissionId ?? null,
    email: params.email?.toLowerCase().trim() || null,
    phone_e164: params.phoneE164?.trim() || null,
    channel: params.channel,
    action: params.action,
    legal_basis: params.legalBasis,
    consent_text: params.consentText ?? null,
    source: params.source,
    metadata: params.metadata ?? {},
  })
}

/**
 * Permanently honors an opt-out under Kenya's Data Protection Act (2019).
 * 1) Inserts into outreach_suppression_list (permanent)
 * 2) Marks matching outreach_leads as 'opted_out' and whatsapp_opted_in = false
 * 3) Marks matching outreach_conversations as 'opted_out' and opted_in = false
 * 4) Cancels any pending/queued emails to that recipient
 * 5) Writes an immutable opt_out record in outreach_consent_records
 */
export async function recordPermanentOptOut(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: {
    email?: string | null
    phoneE164?: string | null
    domain?: string | null
    leadId?: string | null
    reason: string
    channel?: 'email' | 'whatsapp' | 'voice' | 'all'
    source: string
    ipAddress?: string | null
  }
): Promise<void> {
  const email = params.email?.toLowerCase().trim() || null
  const phone = params.phoneE164?.trim() || null
  const domain = params.domain ? extractDomain(params.domain) || params.domain.toLowerCase().trim() : null
  const channel = params.channel ?? 'all'
  const sourceIpHash = hashIpForAudit(params.ipAddress)

  if (!email && !phone && !domain && !params.leadId) return

  let resolvedEmail = email
  let resolvedPhone = phone
  let resolvedLeadId = params.leadId ?? null

  if (resolvedLeadId && (!resolvedEmail || !resolvedPhone)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lead } = await (supabase.from('outreach_leads') as any)
      .select('id, email, phone_e164')
      .eq('id', resolvedLeadId)
      .maybeSingle()
    if (lead) {
      resolvedEmail = resolvedEmail || lead.email?.toLowerCase() || null
      resolvedPhone = resolvedPhone || lead.phone_e164 || null
    }
  }

  // 1. Permanent suppression rows (email and/or phone)
  if (resolvedEmail) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_suppression_list') as any).upsert(
      {
        email: resolvedEmail,
        reason: params.reason,
        channel,
        source_ip_hash: sourceIpHash,
      },
      { onConflict: 'email' }
    )
  }

  if (resolvedPhone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_suppression_list') as any).upsert(
      {
        phone_e164: resolvedPhone,
        reason: params.reason,
        channel,
        source_ip_hash: sourceIpHash,
      },
      { onConflict: 'phone_e164' }
    )
  }

  if (!resolvedEmail && !resolvedPhone && domain) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_suppression_list') as any).insert({
      domain,
      reason: params.reason,
      channel,
      source_ip_hash: sourceIpHash,
    })
  }

  // 2. Mark matching outreach_leads as opted_out
  if (resolvedLeadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_leads') as any)
      .update({ status: 'opted_out', whatsapp_opted_in: false })
      .eq('id', resolvedLeadId)
  }
  if (resolvedEmail) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated } = await (supabase.from('outreach_leads') as any)
      .update({ status: 'opted_out', whatsapp_opted_in: false })
      .ilike('email', resolvedEmail)
      .select('id')
    if (!resolvedLeadId && updated?.[0]?.id) resolvedLeadId = updated[0].id
  }
  if (resolvedPhone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated } = await (supabase.from('outreach_leads') as any)
      .update({ status: 'opted_out', whatsapp_opted_in: false })
      .eq('phone_e164', resolvedPhone)
      .select('id')
    if (!resolvedLeadId && updated?.[0]?.id) resolvedLeadId = updated[0].id
  }

  // 3. Mark matching WhatsApp conversations as opted_out
  if (resolvedPhone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_conversations') as any)
      .update({ status: 'opted_out', opted_in: false })
      .eq('phone_e164', resolvedPhone)
  }
  if (resolvedLeadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_conversations') as any)
      .update({ status: 'opted_out', opted_in: false })
      .eq('lead_id', resolvedLeadId)
  }

  // 4. Suppress any unsent queued / pending_review / approved emails
  if (resolvedEmail) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_emails') as any)
      .update({ status: 'suppressed', error_message: `Suppressed due to opt-out: ${params.reason}` })
      .ilike('to_email', resolvedEmail)
      .in('status', ['pending_review', 'approved', 'queued'])
  }

  // 5. Immutable Kenya DPA consent/opt-out audit trail
  await recordConsent(supabase, {
    leadId: resolvedLeadId,
    email: resolvedEmail,
    phoneE164: resolvedPhone,
    channel,
    action: 'opt_out',
    legalBasis: 'data_subject_withdrawal_kenya_dpa_2019',
    consentText: `Opt-out recorded permanently (${params.reason})`,
    source: params.source,
    metadata: { domain, reason: params.reason },
  })

  await logOutreachEvent({
    module: 'compliance',
    level: 'info',
    event: 'permanent_opt_out',
    message: `Recorded permanent opt-out (${params.reason})`,
    metadata: {
      leadId: resolvedLeadId,
      hasEmail: !!resolvedEmail,
      hasPhone: !!resolvedPhone,
      channel,
      source: params.source,
    },
  })
}
