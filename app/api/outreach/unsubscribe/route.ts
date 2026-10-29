import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { recordPermanentOptOut } from '@/lib/outreach/compliance'
import { verifyUnsubscribeToken } from '@/lib/outreach/email-campaign'
import { createOutreachAdminClient, createStoreAdminClientSafe } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function processUnsubscribe(params: {
  token?: string | null
  manualEmail?: string | null
  ip: string
  source: string
}): Promise<{ ok: boolean; maskedEmail?: string; error?: string }> {
  const supabase = createOutreachAdminClient()

  let email: string | null = null
  let leadId: string | null = null

  if (params.token) {
    const verified = verifyUnsubscribeToken(params.token)
    if (verified) {
      email = verified.email
      leadId = verified.leadId
    } else {
      // Fallback: look up exact token in outreach_emails
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row } = await (supabase.from('outreach_emails') as any)
        .select('id, to_email, lead_id')
        .eq('unsubscribe_token', params.token)
        .maybeSingle()
      if (row) {
        email = String(row.to_email).toLowerCase()
        leadId = row.lead_id
      }
    }

    if (!email) {
      return { ok: false, error: 'Invalid or expired unsubscribe link.' }
    }

    // Stamp unsubscribed_at on outreach_emails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_emails') as any)
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', params.token)
  } else if (params.manualEmail) {
    const cleaned = params.manualEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(cleaned)) {
      return { ok: false, error: 'Please enter a valid email address.' }
    }
    email = cleaned
  } else {
    return { ok: false, error: 'Missing unsubscribe token or email address.' }
  }

  // Also mark newsletter_subscribers inactive on Store Supabase if available
  const storeDb = createStoreAdminClientSafe()
  if (storeDb) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (storeDb.from('newsletter_subscribers') as any)
      .update({ status: 'unsubscribed' })
      .ilike('email', email)
      .then(() => {})
      .catch(() => {})
  }

  await recordPermanentOptOut(supabase, {
    email,
    leadId,
    reason: 'one_click_unsubscribe',
    channel: 'all',
    source: params.source,
    ipAddress: params.ip,
  })

  const [local, domain] = email.split('@')
  const maskedEmail = `${local.slice(0, 2)}***@${domain}`
  return { ok: true, maskedEmail }
}

/**
 * GET /api/outreach/unsubscribe?token=...
 * Supports direct browser clicks on the one-click unsubscribe link.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed } = rateLimit(`unsub:${ip}`, 20, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const token = req.nextUrl.searchParams.get('token')
  const format = req.nextUrl.searchParams.get('format')

  const res = await processUnsubscribe({
    token,
    ip,
    source: 'one_click_get',
  })

  if (format === 'json') {
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    return NextResponse.json({ success: true, maskedEmail: res.maskedEmail })
  }

  const redirectUrl = new URL('/unsubscribe', req.url)
  redirectUrl.searchParams.set('done', res.ok ? '1' : '0')
  if (res.maskedEmail) redirectUrl.searchParams.set('email', res.maskedEmail)
  return NextResponse.redirect(redirectUrl)
}

/**
 * POST /api/outreach/unsubscribe
 * Supports BOTH:
 *  1) RFC 8058 List-Unsubscribe-Post: List-Unsubscribe=One-Click (query param ?token=...)
 *  2) JSON body { token } or { email } from /unsubscribe page
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed } = rateLimit(`unsub:${ip}`, 20, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let token = req.nextUrl.searchParams.get('token')
  let manualEmail: string | null = null

  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}))
    if (!token && typeof body.token === 'string') token = body.token
    if (typeof body.email === 'string') manualEmail = body.email
  }

  const res = await processUnsubscribe({
    token,
    manualEmail,
    ip,
    source: token ? 'rfc8058_one_click_post' : 'manual_unsubscribe_form',
  })

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    maskedEmail: res.maskedEmail,
    message: 'You have been permanently unsubscribed from Batteriq outreach emails.',
  })
}
