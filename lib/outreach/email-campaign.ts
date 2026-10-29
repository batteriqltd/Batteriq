import crypto from 'crypto'
import { Resend } from 'resend'
import {
  escapeHtml,
  generateOutreachEmailWithClaude,
} from './claude'
import {
  checkInSuppressionSets,
  getOutreachSettings,
  isSuppressed,
  loadSuppressionSets,
} from './compliance'
import { logOutreachEvent, sleep, withRetry } from './logger'
import { createOutreachAdminClient, fetchStoreCatalogProductsSafe } from './supabase'
import type { OutreachEmail, OutreachLead, OutreachSettings } from './types'

function getTokenSecret(): string {
  return (
    process.env.OUTREACH_UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    'batteriq-outreach-dpa-2026'
  )
}

export function createUnsubscribeToken(email: string, leadId: string): string {
  const payload = JSON.stringify({
    e: email.toLowerCase().trim(),
    l: leadId,
    n: crypto.randomBytes(6).toString('hex'),
  })
  const encoded = Buffer.from(payload).toString('base64url')
  const sig = crypto
    .createHmac('sha256', getTokenSecret())
    .update(encoded)
    .digest('base64url')
  return `${encoded}.${sig}`
}

export function verifyUnsubscribeToken(
  token: string
): { email: string; leadId: string } | null {
  if (!token || typeof token !== 'string') return null
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) return null

  const encoded = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  const expected = crypto
    .createHmac('sha256', getTokenSecret())
    .update(encoded)
    .digest('base64url')

  if (sig.length !== expected.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null
    }
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      e?: string
      l?: string
    }
    if (!parsed.e || !parsed.l) return null
    return { email: parsed.e.toLowerCase().trim(), leadId: parsed.l }
  } catch {
    return null
  }
}

export function buildSenderIdentity(settings: Pick<OutreachSettings, 'sender_name' | 'sender_email'>): string {
  const fromEmail =
    process.env.RESEND_OUTREACH_FROM_EMAIL?.trim() ||
    settings.sender_email?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'sales@batteriq.com'

  // Extract pure address if RESEND_FROM_EMAIL was formatted as "Name <addr>"
  const bracketMatch = fromEmail.match(/<([^>]+)>/)
  const cleanAddr = bracketMatch ? bracketMatch[1].trim() : fromEmail
  const cleanName = (settings.sender_name || 'Batteriq Kenya').replace(/[<>"]/g, '').trim()

  return `${cleanName} <${cleanAddr}>`
}

export function renderOutreachEmailHtml(params: {
  subject: string
  paragraphsHtml: string[]
  senderName: string
  unsubscribeUrl: string
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com'
  const paragraphs = params.paragraphsHtml
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.68;color:#1f2937;">${p}</p>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:28px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#000033 0%,#00004d 60%,#000099 100%);padding:22px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <span style="color:#ffffff;font-weight:900;font-size:20px;letter-spacing:-0.03em;">BATTERIQ<sup style="font-size:10px;color:#60a5fa;">™</sup></span>
        <span style="display:block;color:rgba(255,255,255,0.68);font-size:11px;margin-top:2px;">Authorised EcoFlow &amp; BLUETTI Commercial Partner · Kenya</span>
      </div>
    </div>

    <div style="padding:32px;">
      ${paragraphs}

      <div style="margin:26px 0 12px 0;padding:16px 20px;background:#f8faff;border-left:4px solid #2563eb;border-radius:0 10px 10px 0;">
        <p style="margin:0;font-size:13px;color:#1e3a8a;font-weight:700;">Commercial Benefits with Batteriq Kenya</p>
        <p style="margin:4px 0 0 0;font-size:12px;color:#4b5563;line-height:1.5;">
          ✓ Official KRA eTIMS Tax Invoices &nbsp;·&nbsp; ✓ 24-Month+ Warranty &nbsp;·&nbsp; ✓ Nationwide Delivery &amp; Sizing Support
        </p>
      </div>

      <p style="margin:20px 0 0 0;">
        <a href="${escapeHtml(siteUrl)}/power-stations" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 22px;border-radius:10px;">
          Explore Business Backup Solutions →
        </a>
      </p>
    </div>

    <div style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:18px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#6b7280;line-height:1.6;">
        Sent by <strong>${escapeHtml(params.senderName)}</strong> · Batteriq Solutions Ltd, Nairobi, Kenya.<br/>
        <a href="${escapeHtml(siteUrl)}" style="color:#2563eb;text-decoration:none;">batteriq.com</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">One-click Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

export function renderOutreachEmailText(params: {
  bodyText: string
  senderName: string
  unsubscribeUrl: string
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com'
  return `${params.bodyText}

---
${params.senderName} | Batteriq Solutions Ltd, Nairobi, Kenya (${siteUrl})
Authorised EcoFlow & BLUETTI Distributor — KRA eTIMS Invoices & Official Warranty
Unsubscribe instantly (one click): ${params.unsubscribeUrl}`
}

function getResendClient(resendImpl?: Resend): Resend {
  if (resendImpl) return resendImpl
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    throw new Error('RESEND_API_KEY is not configured in environment variables')
  }
  return new Resend(key)
}

export async function dispatchOutreachEmailViaResend(params: {
  emailRow: Pick<
    OutreachEmail,
    'id' | 'lead_id' | 'to_email' | 'from_identity' | 'reply_to' | 'subject' | 'body_html' | 'body_text' | 'unsubscribe_token'
  >
  resendClient?: Resend
}): Promise<{ resendMessageId: string | null }> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').replace(/\/$/, '')
  const oneClickApiUrl = `${siteUrl}/api/outreach/unsubscribe?token=${encodeURIComponent(
    params.emailRow.unsubscribe_token
  )}`

  const resend = getResendClient(params.resendClient)

  const sendResponse = await withRetry(
    async () => {
      const response = await resend.emails.send({
        from: params.emailRow.from_identity,
        to: params.emailRow.to_email,
        ...(params.emailRow.reply_to ? { replyTo: params.emailRow.reply_to } : {}),
        subject: params.emailRow.subject,
        html: params.emailRow.body_html,
        text: params.emailRow.body_text,
        headers: {
          'List-Unsubscribe': `<${oneClickApiUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })

      if (response.error) {
        const err = new Error(
          `Resend error: ${response.error.message || JSON.stringify(response.error)}`
        ) as Error & { status?: number }
        if (
          response.error.name === 'rate_limit_exceeded' ||
          /rate/i.test(response.error.message || '')
        ) {
          err.status = 429
        }
        throw err
      }

      return response
    },
    { maxAttempts: 3, baseDelayMs: 800 }
  )

  return { resendMessageId: sendResponse.data?.id ?? null }
}

export interface EmailCampaignRunResult {
  paused: boolean
  reviewBeforeSend: boolean
  dailyLimit: number
  alreadySentToday: number
  sentNow: number
  draftedForReview: number
  suppressedSkipped: number
  failedCount: number
  errors: string[]
}

/**
 * Daily Email Campaign job (Vercel Cron + Admin trigger):
 * - Always checks campaign_paused, daily_email_limit (default 50), review_before_send, and permanent suppression list.
 * - Uses Claude API to write personalized B2B outreach emails from lead details + Batteriq catalog.
 * - Sends through existing Resend setup with sender identity and RFC 8058 one-click unsubscribe link.
 */
export async function runDailyEmailCampaignJob(options: {
  maxToProcess?: number
  forceSendApprovedOnly?: boolean
  fetchImpl?: typeof fetch
  resendClient?: Resend
} = {}): Promise<EmailCampaignRunResult> {
  const supabase = createOutreachAdminClient()
  const settings = await getOutreachSettings(supabase)

  // Compute start of day in East Africa Time (UTC+3)
  const now = new Date()
  const eatOffsetMs = 3 * 60 * 60 * 1000
  const eatDate = new Date(now.getTime() + eatOffsetMs)
  eatDate.setUTCHours(0, 0, 0, 0)
  const startOfTodayIso = new Date(eatDate.getTime() - eatOffsetMs).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: sentTodayCount } = await (supabase.from('outreach_emails') as any)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', startOfTodayIso)

  const alreadySentToday = sentTodayCount ?? 0
  const dailyLimit = Math.max(1, settings.daily_email_limit || 50)

  if (settings.campaign_paused && !options.forceSendApprovedOnly) {
    await logOutreachEvent({
      module: 'email_campaign',
      level: 'info',
      event: 'campaign_paused_skip',
      message: 'Skipped daily email campaign run because campaign_paused is true.',
    })
    return {
      paused: true,
      reviewBeforeSend: settings.review_before_send,
      dailyLimit,
      alreadySentToday,
      sentNow: 0,
      draftedForReview: 0,
      suppressedSkipped: 0,
      failedCount: 0,
      errors: [],
    }
  }

  let remainingQuota = Math.max(0, dailyLimit - alreadySentToday)
  if (typeof options.maxToProcess === 'number' && options.maxToProcess > 0) {
    remainingQuota = Math.min(remainingQuota, options.maxToProcess)
  }

  if (remainingQuota === 0) {
    return {
      paused: settings.campaign_paused,
      reviewBeforeSend: settings.review_before_send,
      dailyLimit,
      alreadySentToday,
      sentNow: 0,
      draftedForReview: 0,
      suppressedSkipped: 0,
      failedCount: 0,
      errors: [],
    }
  }

  const suppressionSets = await loadSuppressionSets(supabase)
  let sentNow = 0
  let draftedForReview = 0
  let suppressedSkipped = 0
  let failedCount = 0
  const errors: string[] = []

  // Step 1: Send any admin-approved emails waiting in queue first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: approvedEmails } = await (supabase.from('outreach_emails') as any)
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(remainingQuota)

  for (const emailRow of (approvedEmails ?? []) as OutreachEmail[]) {
    if (remainingQuota <= 0) break

    // Mandatory suppression list check right before send
    if (
      checkInSuppressionSets(suppressionSets, { email: emailRow.to_email }) ||
      (await isSuppressed(supabase, { email: emailRow.to_email }))
    ) {
      suppressedSkipped++
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_emails') as any)
        .update({ status: 'suppressed', error_message: 'Recipient on permanent suppression list' })
        .eq('id', emailRow.id)
      continue
    }

    try {
      const { resendMessageId } = await dispatchOutreachEmailViaResend({
        emailRow,
        resendClient: options.resendClient,
      })

      const sentAt = new Date().toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_emails') as any)
        .update({
          status: 'sent',
          resend_message_id: resendMessageId,
          sent_at: sentAt,
          error_message: null,
        })
        .eq('id', emailRow.id)

      // Update lead status ('new' -> 'contacted')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lead } = await (supabase.from('outreach_leads') as any)
        .select('id, status, email_count')
        .eq('id', emailRow.lead_id)
        .maybeSingle()

      if (lead) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('outreach_leads') as any)
          .update({
            status: lead.status === 'new' ? 'contacted' : lead.status,
            last_emailed_at: sentAt,
            email_count: (lead.email_count || 0) + 1,
          })
          .eq('id', lead.id)
      }

      sentNow++
      remainingQuota--
      await sleep(350) // Respect Resend API rate limits
    } catch (err) {
      failedCount++
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${emailRow.to_email}: ${msg}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_emails') as any)
        .update({
          status: 'failed',
          error_message: msg.slice(0, 500),
          retry_count: (emailRow.retry_count || 0) + 1,
        })
        .eq('id', emailRow.id)
    }
  }

  if (options.forceSendApprovedOnly || remainingQuota <= 0) {
    return {
      paused: settings.campaign_paused,
      reviewBeforeSend: settings.review_before_send,
      dailyLimit,
      alreadySentToday,
      sentNow,
      draftedForReview,
      suppressedSkipped,
      failedCount,
      errors,
    }
  }

  // Step 2: Load in-stock Batteriq products from Store Supabase (if available) for accurate Claude grounding
  const catalogProducts = await fetchStoreCatalogProductsSafe(10, [
    'Power Stations',
    'Solar Home Systems',
    'Solar Panels',
    'Batteries',
  ])

  // Find leads that already have a pending/approved/sent email so we don't double-email them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingEmailRows } = await (supabase.from('outreach_emails') as any)
    .select('lead_id, to_email')
    .in('status', ['pending_review', 'approved', 'queued', 'sent', 'suppressed'])

  const alreadyQueuedLeadIds = new Set<string>(
    (existingEmailRows ?? []).map((r: { lead_id: string }) => r.lead_id)
  )
  const alreadyQueuedEmails = new Set<string>(
    (existingEmailRows ?? []).map((r: { to_email: string }) => String(r.to_email).toLowerCase())
  )

  // Fetch candidate leads with status = 'new' and valid email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidateLeads } = await (supabase.from('outreach_leads') as any)
    .select('*')
    .eq('status', 'new')
    .not('email', 'is', null)
    .order('created_at', { ascending: true })
    .limit(remainingQuota * 3)

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').replace(/\/$/, '')
  const fromIdentity = buildSenderIdentity(settings)

  for (const lead of (candidateLeads ?? []) as OutreachLead[]) {
    if (remainingQuota <= 0) break
    const toEmail = lead.email?.toLowerCase().trim()
    if (!toEmail) continue

    if (alreadyQueuedLeadIds.has(lead.id) || alreadyQueuedEmails.has(toEmail)) {
      continue
    }

    // Always check permanent suppression list BEFORE calling Claude or Resend
    if (
      checkInSuppressionSets(suppressionSets, {
        email: toEmail,
        phoneE164: lead.phone_e164,
        domain: lead.domain,
      })
    ) {
      suppressedSkipped++
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({ status: 'opted_out' })
        .eq('id', lead.id)
      continue
    }

    try {
      const generated = await generateOutreachEmailWithClaude({
        lead,
        products: catalogProducts,
        senderName: settings.sender_name,
        fetchImpl: options.fetchImpl,
      })

      const unsubToken = createUnsubscribeToken(toEmail, lead.id)
      const unsubPageUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubToken)}`

      const bodyHtml = renderOutreachEmailHtml({
        subject: generated.subject,
        paragraphsHtml: generated.bodyHtmlParagraphs,
        senderName: settings.sender_name,
        unsubscribeUrl: unsubPageUrl,
      })

      const bodyText = renderOutreachEmailText({
        bodyText: generated.bodyText,
        senderName: settings.sender_name,
        unsubscribeUrl: unsubPageUrl,
      })

      const initialStatus = settings.review_before_send ? 'pending_review' : 'queued'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: insertedEmail, error: insertErr } = await (supabase.from('outreach_emails') as any)
        .insert({
          lead_id: lead.id,
          to_email: toEmail,
          from_identity: fromIdentity,
          reply_to: settings.reply_to_email || null,
          subject: generated.subject,
          body_html: bodyHtml,
          body_text: bodyText,
          unsubscribe_token: unsubToken,
          status: initialStatus,
          claude_model: generated.model,
        })
        .select('*')
        .single()

      if (insertErr || !insertedEmail) {
        throw new Error(insertErr?.message || 'Failed to insert outreach_emails row')
      }

      alreadyQueuedLeadIds.add(lead.id)
      alreadyQueuedEmails.add(toEmail)

      if (settings.review_before_send) {
        draftedForReview++
        remainingQuota--
        await sleep(200)
        continue
      }

      // Double-check suppression right before network send
      if (await isSuppressed(supabase, { email: toEmail, phoneE164: lead.phone_e164 })) {
        suppressedSkipped++
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('outreach_emails') as any)
          .update({ status: 'suppressed', error_message: 'Suppressed before send' })
          .eq('id', insertedEmail.id)
        continue
      }

      const { resendMessageId } = await dispatchOutreachEmailViaResend({
        emailRow: insertedEmail as OutreachEmail,
        resendClient: options.resendClient,
      })

      const sentAt = new Date().toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_emails') as any)
        .update({
          status: 'sent',
          resend_message_id: resendMessageId,
          sent_at: sentAt,
        })
        .eq('id', insertedEmail.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({
          status: 'contacted',
          last_emailed_at: sentAt,
          email_count: (lead.email_count || 0) + 1,
        })
        .eq('id', lead.id)

      sentNow++
      remainingQuota--
      await sleep(350) // Rate-limit Resend calls
    } catch (err) {
      failedCount++
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${toEmail}: ${msg}`)
      await logOutreachEvent({
        module: 'email_campaign',
        level: 'error',
        event: 'email_send_failed',
        message: `Failed outreach email for ${lead.business_name} (${toEmail}): ${msg}`,
        metadata: { leadId: lead.id, toEmail },
      })
    }
  }

  await logOutreachEvent({
    module: 'email_campaign',
    level: failedCount > 0 && sentNow === 0 && draftedForReview === 0 ? 'error' : 'info',
    event: 'campaign_run_completed',
    message: `Daily Email Campaign: sent=${sentNow}, drafted_for_review=${draftedForReview}, already_sent_today=${alreadySentToday}/${dailyLimit}, suppressed=${suppressedSkipped}, failed=${failedCount}`,
    metadata: {
      dailyLimit,
      alreadySentToday,
      sentNow,
      draftedForReview,
      suppressedSkipped,
      failedCount,
      reviewBeforeSend: settings.review_before_send,
    },
  })

  return {
    paused: settings.campaign_paused,
    reviewBeforeSend: settings.review_before_send,
    dailyLimit,
    alreadySentToday,
    sentNow,
    draftedForReview,
    suppressedSkipped,
    failedCount,
    errors,
  }
}

export async function approveAndSendEmailDraft(params: {
  emailId: string
  reviewerEmail: string
  updatedSubject?: string
  updatedBodyText?: string
  resendClient?: Resend
}): Promise<{ status: 'sent' | 'suppressed'; resendMessageId?: string | null }> {
  const supabase = createOutreachAdminClient()
  const settings = await getOutreachSettings(supabase)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emailRow, error } = await (supabase.from('outreach_emails') as any)
    .select('*')
    .eq('id', params.emailId)
    .single()

  if (error || !emailRow) {
    throw new Error('Email draft not found')
  }

  if (await isSuppressed(supabase, { email: emailRow.to_email })) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_emails') as any)
      .update({
        status: 'suppressed',
        reviewed_by: params.reviewerEmail,
        reviewed_at: new Date().toISOString(),
        error_message: 'Recipient is on permanent suppression list',
      })
      .eq('id', emailRow.id)
    return { status: 'suppressed' }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').replace(/\/$/, '')
  const unsubUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(emailRow.unsubscribe_token)}`

  let subject = emailRow.subject as string
  let bodyHtml = emailRow.body_html as string
  let bodyText = emailRow.body_text as string

  if (params.updatedSubject?.trim()) {
    subject = params.updatedSubject.trim()
  }
  if (params.updatedBodyText?.trim()) {
    const cleanParagraphs = params.updatedBodyText
      .trim()
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
    bodyHtml = renderOutreachEmailHtml({
      subject,
      paragraphsHtml: cleanParagraphs.map((p) => escapeHtml(p).replace(/\n/g, '<br/>')),
      senderName: settings.sender_name,
      unsubscribeUrl: unsubUrl,
    })
    bodyText = renderOutreachEmailText({
      bodyText: cleanParagraphs.join('\n\n'),
      senderName: settings.sender_name,
      unsubscribeUrl: unsubUrl,
    })
  }

  const { resendMessageId } = await dispatchOutreachEmailViaResend({
    emailRow: {
      ...(emailRow as OutreachEmail),
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
    },
    resendClient: params.resendClient,
  })

  const nowIso = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_emails') as any)
    .update({
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      status: 'sent',
      resend_message_id: resendMessageId,
      reviewed_by: params.reviewerEmail,
      reviewed_at: nowIso,
      sent_at: nowIso,
      error_message: null,
    })
    .eq('id', emailRow.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lead } = await (supabase.from('outreach_leads') as any)
    .select('id, status, email_count')
    .eq('id', emailRow.lead_id)
    .maybeSingle()

  if (lead) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_leads') as any)
      .update({
        status: lead.status === 'new' ? 'contacted' : lead.status,
        last_emailed_at: nowIso,
        email_count: (lead.email_count || 0) + 1,
      })
      .eq('id', lead.id)
  }

  return { status: 'sent', resendMessageId }
}
