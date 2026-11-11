import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import {
  parseWhatsAppWebhookPayload,
  verifyWhatsAppWebhookSignature,
} from '@/lib/outreach/whatsapp'
import {
  handleWahaWebhookEvent,
  isWahaEnvelope,
  persistInboundWhatsAppMessage,
  runInboundFollowUp,
} from '@/lib/outreach/whatsapp-inbound'
import { runAfterResponse, verifyWahaWebhookHmac } from '@/lib/outreach/whatsapp-transport'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/whatsapp/webhook
 * Meta WhatsApp Cloud API webhook verification handshake.
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token') || ''
  const challenge = req.nextUrl.searchParams.get('hub.challenge') || ''

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || ''

  if (mode !== 'subscribe' || !expectedToken || token.length !== expectedToken.length) {
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 })
  }

  const valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
  if (!valid) {
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 })
  }

  return new Response(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

async function finish(tasks: Array<() => Promise<void>>) {
  if (tasks.length > 0) {
    const pending = runAfterResponse(async () => {
      for (const task of tasks) await task()
    })
    // No waitUntil available (local dev) → finish inline before responding
    if (pending) await pending
  }
  return NextResponse.json({ received: true })
}

/**
 * POST /api/whatsapp/webhook
 * Receives events from either provider:
 *  - Meta Cloud API  → signed with X-Hub-Signature-256 (WHATSAPP_APP_SECRET)
 *  - WAHA (self-hosted) → signed with X-Webhook-Hmac (HMAC-SHA512, WHATSAPP_WEBHOOK_SECRET)
 * Unsigned or wrongly-signed requests are rejected with 401.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const metaSignature = req.headers.get('x-hub-signature-256')

  // ── WAHA ──────────────────────────────────────────────────────────────────
  if (!metaSignature) {
    const ok = verifyWahaWebhookHmac(
      rawBody,
      req.headers.get('x-webhook-hmac'),
      req.headers.get('x-webhook-hmac-algorithm'),
      process.env.WHATSAPP_WEBHOOK_SECRET
    )
    if (!ok) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    if (!isWahaEnvelope(body)) return NextResponse.json({ received: true, ignored: true })

    try {
      const result = await handleWahaWebhookEvent(body)
      return finish(result.followUp ? [result.followUp] : [])
    } catch (err) {
      await logOutreachEvent({
        module: 'whatsapp',
        level: 'error',
        event: 'waha_webhook_failed',
        message: err instanceof Error ? err.message : 'WAHA webhook processing failed',
        metadata: { event: body.event },
      })
      // 500 → WAHA retries; idempotent storage makes retries safe
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  // ── Meta Cloud API ────────────────────────────────────────────────────────
  if (
    !process.env.WHATSAPP_APP_SECRET?.trim() ||
    !verifyWhatsAppWebhookSignature(rawBody, metaSignature, process.env.WHATSAPP_APP_SECRET)
  ) {
    await logOutreachEvent({
      module: 'whatsapp',
      level: 'warn',
      event: 'invalid_webhook_signature',
      message: 'Rejected WhatsApp webhook POST with invalid or unverifiable X-Hub-Signature-256',
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { inboundMessages, statusUpdates } = parseWhatsAppWebhookPayload(payload)
  const supabase = createOutreachAdminClient()

  for (const st of statusUpdates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_messages') as any)
      .update({
        delivery_status: st.status,
        ...(st.errorMessage ? { error_message: st.errorMessage } : {}),
      })
      .eq('wa_message_id', st.waMessageId)
  }

  const followUps: Array<() => Promise<void>> = []
  for (const m of inboundMessages) {
    const msg = {
      provider: 'meta' as const,
      waMessageId: m.waMessageId,
      phoneE164: m.fromPhoneE164,
      chatId: null,
      contactName: m.contactName,
      messageType: m.messageType,
      body: m.body,
      timestampIso: m.timestampIso,
    }
    try {
      const res = await persistInboundWhatsAppMessage(msg)
      if (!res.duplicate && res.conversationId) {
        const conversationId = res.conversationId
        followUps.push(() => runInboundFollowUp({ msg, conversationId }))
      }
    } catch (err) {
      await logOutreachEvent({
        module: 'whatsapp',
        level: 'error',
        event: 'inbound_processing_failed',
        message: err instanceof Error ? err.message : 'Failed processing inbound WhatsApp message',
        metadata: { waMessageId: m.waMessageId },
      })
    }
  }

  return finish(followUps)
}
