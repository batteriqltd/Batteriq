import { NextResponse } from 'next/server'
import { WahaError } from '@/lib/waha'
import { createOutreachAdminClient } from './supabase'
import type { WaConversation } from './whatsapp-inbound'

/** Public URL WAHA posts events to. */
export function wahaWebhookUrl(): string {
  const explicit = process.env.WHATSAPP_WEBHOOK_URL?.trim()
  if (explicit) return explicit
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').trim().replace(/\/+$/, '')
  return `${site}/api/whatsapp/webhook`
}

/** Error → JSON response. WahaError messages are already scrubbed of secrets. */
export function wahaErrorResponse(err: unknown, fallback = 'WhatsApp request failed') {
  if (err instanceof WahaError) {
    const status = err.code === 'not_configured' ? 503 : err.code === 'timeout' ? 504 : 502
    return NextResponse.json({ error: err.message, code: err.code }, { status })
  }
  const message = err instanceof Error ? err.message : fallback
  return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 })
}

/**
 * Stores an admin-sent WAHA message and returns the conversation.
 * Creates the thread if needed; `takeover` switches it to Human mode.
 */
export async function recordOutboundWahaMessage(params: {
  phoneE164: string
  chatId: string
  body: string
  waMessageId: string | null
  adminEmail: string
  takeover: boolean
  conversation?: WaConversation | null
}): Promise<{ conversationId: string; messageId: string | null }> {
  const supabase = createOutreachAdminClient()
  const nowIso = new Date().toISOString()

  let conv = params.conversation || null
  if (!conv) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('outreach_conversations') as any)
      .select('*')
      .eq('phone_e164', params.phoneE164)
      .maybeSingle()
    conv = data as WaConversation | null
  }

  if (!conv) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('outreach_conversations') as any)
      .insert({
        phone_e164: params.phoneE164,
        wa_chat_id: params.chatId,
        mode: params.takeover ? 'human' : 'ai',
        status: 'open',
        opted_in: false,
        last_outbound_at: nowIso,
        last_message_preview: params.body.slice(0, 140),
        unread_count: 0,
      })
      .select('*')
      .single()
    if (error) throw new Error(`conversation insert failed: ${error.message}`)
    conv = data as WaConversation
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_conversations') as any)
      .update({
        last_outbound_at: nowIso,
        last_message_preview: params.body.slice(0, 140),
        unread_count: 0,
        ...(conv.wa_chat_id ? {} : { wa_chat_id: params.chatId }),
        ...(params.takeover ? { mode: 'human' } : {}),
        ...(conv.status === 'pending_human' ? { status: 'open' } : {}),
      })
      .eq('id', conv.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saved } = await (supabase.from('outreach_messages') as any)
    .insert({
      conversation_id: conv.id,
      lead_id: conv.lead_id,
      direction: 'outbound',
      sender_type: 'human',
      message_type: 'text',
      body: params.body,
      wa_message_id: params.waMessageId,
      delivery_status: 'sent',
      provider: 'waha',
      ai_metadata: { sent_by_admin: params.adminEmail },
    })
    .select('id')
    .single()

  return { conversationId: conv.id, messageId: saved?.id || null }
}
