import { Resend } from 'resend'
import { sendAdminPush } from '@/lib/push'
import {
  escapeHtml,
  generateWhatsAppAiReplyWithClaude,
} from './claude'
import { isSuppressed, recordPermanentOptOut } from './compliance'
import { logOutreachEvent } from './logger'
import { createOutreachAdminClient, fetchStoreCatalogProductsSafe } from './supabase'
import type { OutreachConversation, OutreachLead, OutreachMessage } from './types'
import {
  assertWhatsAppOutboundCompliance,
  sendWhatsAppCloudText,
} from './whatsapp'

export async function notifyAdminEscalation(params: {
  leadName: string
  phoneE164: string
  reason: string
  latestCustomerMessage: string
  conversationId: string
}): Promise<void> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').replace(/\/$/, '')

  // 1. Instant Web Push notification to registered admin PWA devices
  await sendAdminPush({
    title: `🔥 Outreach Escalation: ${params.leadName}`,
    body: `${params.reason} — "${params.latestCustomerMessage.slice(0, 70)}"`,
    tag: 'message',
    id: params.conversationId,
    url: '/admin/outreach',
  }).catch(() => {})

  // 2. Email alert via existing Resend setup
  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (!resendKey) return

  const recipients = Array.from(
    new Set(
      [
        process.env.OUTREACH_ADMIN_EMAIL?.trim(),
        process.env.ADMIN_EMAIL?.trim(),
        'sale@batteriq.com',
      ].filter((e): e is string => Boolean(e && e !== 'replace_me' && !e.includes('<your-domain>')))
    )
  )

  if (recipients.length === 0) return

  try {
    const resend = new Resend(resendKey)
    const fromEmail =
      process.env.RESEND_OUTREACH_FROM_EMAIL?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim() ||
      'sales@batteriq.com'

    await resend.emails.send({
      from: fromEmail.includes('<') ? fromEmail : `Batteriq Outreach Agent <${fromEmail}>`,
      to: recipients,
      subject: `🔥 Action Needed: ${params.leadName} (${params.phoneE164}) — Switched to Human`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
          <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:0.1em;">Outreach Agent Escalation</p>
          <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827;">${escapeHtml(params.leadName)} needs a human reply</h2>
          <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;">
            <strong>Reason:</strong> ${escapeHtml(params.reason)}<br/>
            <strong>WhatsApp:</strong> ${escapeHtml(params.phoneE164)}
          </p>
          <div style="padding:14px 16px;background:#f8fafc;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#1f2937;white-space:pre-wrap;">${escapeHtml(params.latestCustomerMessage)}</p>
          </div>
          <p style="margin:0 0 18px 0;font-size:13px;color:#6b7280;">
            This conversation has been automatically switched from <strong>AI Mode</strong> to <strong>Human Mode</strong>.
          </p>
          <a href="${escapeHtml(siteUrl)}/outreach-admin" style="display:inline-block;background:#00004d;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 20px;border-radius:10px;">
            Reply in Outreach Inbox →
          </a>
        </div>
      `,
    })
  } catch (err) {
    console.error('[OUTREACH ESCALATION] Failed to send escalation email:', err)
  }
}

export interface AiTakeoverResult {
  handled: boolean
  replied: boolean
  newStatus?: string
  switchedToHuman?: boolean
  escalationReason?: string | null
}

/**
 * Evaluates an inbound WhatsApp message when the conversation is in AI Mode:
 * - Calls Claude with full conversation history, lead info, and Batteriq product catalog
 * - Updates lead status (new, contacted, replied, interested, hot, customer, opted_out)
 * - Permanently honors opt-outs
 * - Automatically switches conversation to Human Mode & notifies admin when lead is HOT or asks for a person
 */
export async function handleAiTakeoverForInboundMessage(params: {
  conversation: OutreachConversation
  lead: OutreachLead | null
  inboundText: string
  fetchImpl?: typeof fetch
}): Promise<AiTakeoverResult> {
  const { conversation, lead, inboundText, fetchImpl } = params

  // Respect per-conversation AI / Human switch
  if (conversation.mode !== 'ai') {
    return { handled: false, replied: false }
  }

  if (conversation.status === 'opted_out' || lead?.status === 'opted_out') {
    return { handled: false, replied: false }
  }

  const supabase = createOutreachAdminClient()

  // Load recent conversation history (Outreach DB) & in-stock catalog (Store DB if available)
  const [historyRes, products] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('outreach_messages') as any)
      .select('direction, sender_type, body, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(16),
    fetchStoreCatalogProductsSafe(10),
  ])

  const history = (historyRes.data ?? []) as Pick<
    OutreachMessage,
    'direction' | 'sender_type' | 'body' | 'created_at'
  >[]

  const decision = await generateWhatsAppAiReplyWithClaude({
    lead,
    history,
    inboundMessage: inboundText,
    products,
    fetchImpl,
  })

  const nowIso = new Date().toISOString()

  // 1. Handle opt-out requested inside conversation
  if (decision.isOptOut || decision.newStatus === 'opted_out') {
    await recordPermanentOptOut(supabase, {
      phoneE164: conversation.phone_e164,
      email: lead?.email || null,
      leadId: lead?.id || null,
      reason: 'whatsapp_user_opt_out',
      channel: 'all',
      source: 'whatsapp_ai_takeover',
    })

    // Send polite one-time opt-out confirmation (customer just messaged, so within 24h window)
    try {
      const { waMessageId } = await sendWhatsAppCloudText({
        toPhoneE164: conversation.phone_e164,
        body: decision.reply,
        fetchImpl,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_messages') as any).insert({
        conversation_id: conversation.id,
        lead_id: lead?.id || null,
        direction: 'outbound',
        sender_type: 'ai',
        message_type: 'text',
        body: decision.reply,
        wa_message_id: waMessageId,
        delivery_status: 'sent',
        ai_metadata: {
          model: decision.model,
          newStatus: 'opted_out',
          reasoning: decision.reasoning,
        },
      })
    } catch {
      // Non-fatal if WhatsApp credentials aren't active in test/dev
    }

    return {
      handled: true,
      replied: true,
      newStatus: 'opted_out',
      switchedToHuman: false,
    }
  }

  // 2. Update lead status in outreach_leads
  if (lead?.id && decision.newStatus !== lead.status) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_leads') as any)
      .update({ status: decision.newStatus })
      .eq('id', lead.id)
  }

  // 3. Determine whether to escalate to Human Mode (Hot lead OR asked for a person)
  const shouldEscalate = decision.newStatus === 'hot' || decision.wantsHuman
  const escalationReason = decision.wantsHuman
    ? 'Customer asked to speak with a person'
    : decision.newStatus === 'hot'
      ? `Hot lead detected (${decision.reasoning || 'High buying intent'})`
      : null

  if (shouldEscalate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_conversations') as any)
      .update({
        mode: 'human',
        status: 'pending_human',
        escalated_reason: escalationReason,
        escalated_at: nowIso,
      })
      .eq('id', conversation.id)

    await logOutreachEvent({
      module: 'ai_takeover',
      level: 'info',
      event: 'escalated_to_human',
      message: `Switched ${conversation.phone_e164} to Human Mode: ${escalationReason}`,
      metadata: {
        conversationId: conversation.id,
        leadId: lead?.id || null,
        newStatus: decision.newStatus,
        wantsHuman: decision.wantsHuman,
      },
    })

    await notifyAdminEscalation({
      leadName:
        lead?.business_name || conversation.contact_name || conversation.phone_e164,
      phoneE164: conversation.phone_e164,
      reason: escalationReason || 'Escalated to Human',
      latestCustomerMessage: inboundText,
      conversationId: conversation.id,
    })
  }

  // 4. Compliance check & send Claude's WhatsApp reply
  const suppressed = await isSuppressed(supabase, {
    phoneE164: conversation.phone_e164,
    email: lead?.email || null,
  })

  assertWhatsAppOutboundCompliance({
    isSuppressed: suppressed,
    leadStatus: decision.newStatus,
    conversationStatus: conversation.status,
    hasInboundMessage: true,
    hasExplicitOptIn: true,
    lastInboundAt: conversation.last_inbound_at || nowIso,
    messageType: 'text',
  })

  const { waMessageId } = await sendWhatsAppCloudText({
    toPhoneE164: conversation.phone_e164,
    body: decision.reply,
    fetchImpl,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_messages') as any).insert({
    conversation_id: conversation.id,
    lead_id: lead?.id || null,
    direction: 'outbound',
    sender_type: 'ai',
    message_type: 'text',
    body: decision.reply,
    wa_message_id: waMessageId,
    delivery_status: 'sent',
    ai_metadata: {
      model: decision.model,
      newStatus: decision.newStatus,
      wantsHuman: decision.wantsHuman,
      switchedToHuman: shouldEscalate,
      reasoning: decision.reasoning,
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_conversations') as any)
    .update({
      last_outbound_at: nowIso,
      last_message_preview: decision.reply.slice(0, 140),
    })
    .eq('id', conversation.id)

  return {
    handled: true,
    replied: true,
    newStatus: decision.newStatus,
    switchedToHuman: shouldEscalate,
    escalationReason,
  }
}
