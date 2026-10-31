import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { handleAiTakeoverForInboundMessage } from '@/lib/outreach/ai-takeover'
import { detectDeterministicOptOut } from '@/lib/outreach/claude'
import { recordConsent, recordPermanentOptOut } from '@/lib/outreach/compliance'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { sendOutreachNotification } from '@/lib/outreach/notifications'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import type { OutreachConversation, OutreachLead } from '@/lib/outreach/types'
import {
  parseWhatsAppWebhookPayload,
  sendWhatsAppCloudText,
  verifyWhatsAppWebhookSignature,
} from '@/lib/outreach/whatsapp'

export const dynamic = 'force-dynamic'

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

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages and delivery receipts from Meta Cloud API.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifyWhatsAppWebhookSignature(rawBody, signature, process.env.WHATSAPP_APP_SECRET)) {
    await logOutreachEvent({
      module: 'whatsapp',
      level: 'warn',
      event: 'invalid_webhook_signature',
      message: 'Rejected WhatsApp webhook POST with invalid X-Hub-Signature-256',
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

  // 1. Update delivery statuses (sent / delivered / read / failed)
  for (const st of statusUpdates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_messages') as any)
      .update({
        delivery_status: st.status,
        ...(st.errorMessage ? { error_message: st.errorMessage } : {}),
      })
      .eq('wa_message_id', st.waMessageId)
  }

  // 2. Process incoming customer messages
  for (const msg of inboundMessages) {
    try {
      // Idempotency check: skip if Meta retried a webhook we already saved
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingMsg } = await (supabase.from('outreach_messages') as any)
        .select('id')
        .eq('wa_message_id', msg.waMessageId)
        .maybeSingle()

      if (existingMsg) continue

      // Match or create outreach_leads row for this WhatsApp sender
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { data: lead } = (await (supabase.from('outreach_leads') as any)
        .select('*')
        .eq('phone_e164', msg.fromPhoneE164)
        .maybeSingle()) as { data: OutreachLead | null }

      if (!lead) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: createdLead } = await (supabase.from('outreach_leads') as any)
          .insert({
            business_name: msg.contactName || `WhatsApp ${msg.fromPhoneE164}`,
            category: 'other',
            phone_e164: msg.fromPhoneE164,
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
          phoneE164: msg.fromPhoneE164,
          channel: 'whatsapp',
          action: 'opt_in',
          legalBasis: 'customer_initiated_inbound_whatsapp',
          consentText: 'Customer messaged Batteriq WhatsApp Business number first',
          source: 'whatsapp_webhook_inbound',
        })
      } else {
        const nextStatus =
          lead.status === 'new' || lead.status === 'contacted' ? 'replied' : lead.status
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

      // Upsert conversation thread
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingConv } = (await (supabase.from('outreach_conversations') as any)
        .select('*')
        .eq('phone_e164', msg.fromPhoneE164)
        .maybeSingle()) as { data: OutreachConversation | null }

      let conversation: OutreachConversation
      if (!existingConv) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: createdConv } = await (supabase.from('outreach_conversations') as any)
          .insert({
            lead_id: lead?.id || null,
            phone_e164: msg.fromPhoneE164,
            contact_name: msg.contactName || lead?.business_name || null,
            mode: 'ai',
            unread_count: 1,
            last_inbound_at: msg.timestampIso,
            last_message_preview: msg.body.slice(0, 140),
            opted_in: true,
            status: 'open',
          })
          .select('*')
          .single()
        conversation = createdConv as OutreachConversation
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedConv } = await (supabase.from('outreach_conversations') as any)
          .update({
            lead_id: existingConv.lead_id || lead?.id || null,
            contact_name: msg.contactName || existingConv.contact_name,
            unread_count: (existingConv.unread_count || 0) + 1,
            last_inbound_at: msg.timestampIso,
            last_message_preview: msg.body.slice(0, 140),
            opted_in: existingConv.status !== 'opted_out',
          })
          .eq('id', existingConv.id)
          .select('*')
          .single()
        conversation = updatedConv as OutreachConversation
      }

      // Persist inbound message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_messages') as any).insert({
        conversation_id: conversation.id,
        lead_id: lead?.id || null,
        direction: 'inbound',
        sender_type: 'lead',
        message_type: msg.messageType,
        body: msg.body,
        wa_message_id: msg.waMessageId,
        delivery_status: 'received',
      })

      sendOutreachNotification({
        event: 'whatsapp_message',
        body: `${conversation.contact_name || lead?.business_name || msg.fromPhoneE164}: ${msg.body.slice(0, 120)}`,
        url: '/outreach-admin#whatsapp',
        id: conversation.id,
      }).catch(() => {})

      // Always honor explicit STOP / UNSUBSCRIBE even when conversation is in Human Mode!
      if (detectDeterministicOptOut(msg.body)) {
        await recordPermanentOptOut(supabase, {
          phoneE164: msg.fromPhoneE164,
          email: lead?.email || null,
          leadId: lead?.id || null,
          reason: 'whatsapp_stop_keyword',
          channel: 'all',
          source: 'whatsapp_webhook_inbound',
        })
        await sendWhatsAppCloudText({
          toPhoneE164: msg.fromPhoneE164,
          body: 'You have been permanently unsubscribed from Batteriq messages. Thank you.',
        }).catch(() => {})
        continue
      }

      // Trigger Claude AI Takeover when conversation mode === 'ai'
      if (conversation.mode === 'ai' && conversation.status !== 'opted_out') {
        await handleAiTakeoverForInboundMessage({
          conversation,
          lead,
          inboundText: msg.body,
        })
      }
    } catch (err) {
      await logOutreachEvent({
        module: 'whatsapp',
        level: 'error',
        event: 'inbound_processing_failed',
        message: err instanceof Error ? err.message : 'Failed processing inbound WhatsApp message',
        metadata: { waMessageId: msg.waMessageId, from: msg.fromPhoneE164 },
      })
    }
  }

  return NextResponse.json({ received: true })
}
