import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { isSuppressed } from '@/lib/outreach/compliance'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { createOutreachAdminClient, createStoreAdminClientSafe } from '@/lib/outreach/supabase'
import {
  assertWhatsAppOutboundCompliance,
  sendWhatsAppCloudTemplate,
  sendWhatsAppCloudText,
  WhatsAppComplianceError,
} from '@/lib/outreach/whatsapp'
import { normalizeKenyanPhone } from '@/lib/outreach/validators'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : ''
    const rawPhone = typeof body.phoneE164 === 'string' ? body.phoneE164.trim() : ''
    const messageType: 'text' | 'template' = body.type === 'template' ? 'template' : 'text'
    const textBody = typeof body.text === 'string' ? body.text.trim() : ''
    const templateName = typeof body.templateName === 'string' ? body.templateName.trim() : ''
    const templateParams: string[] = Array.isArray(body.templateParams)
      ? body.templateParams.map((p: unknown) => String(p))
      : []

    const supabase = createOutreachAdminClient()

    // Load conversation & linked lead to verify consent + 24h window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let conversation: any = null
    if (conversationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('outreach_conversations') as any)
        .select('*, outreach_leads(*)')
        .eq('id', conversationId)
        .maybeSingle()
      conversation = data
    } else if (rawPhone) {
      const normalized =
        normalizeKenyanPhone(rawPhone, { source: 'form_or_whatsapp' }) || rawPhone
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('outreach_conversations') as any)
        .select('*, outreach_leads(*)')
        .eq('phone_e164', normalized)
        .maybeSingle()
      conversation = data
    }

    if (!conversation) {
      return NextResponse.json(
        {
          error:
            'Cold outbound WhatsApp is not allowed. No inbound or opted-in conversation exists for this number.',
        },
        { status: 403 }
      )
    }

    const phoneE164: string = conversation.phone_e164
    const lead = conversation.outreach_leads || null
    const suppressed = await isSuppressed(supabase, {
      phoneE164,
      email: lead?.email || null,
    })

    // Enforce cold-outbound prohibition, opt-out check, and 24-hour template rule
    assertWhatsAppOutboundCompliance({
      isSuppressed: suppressed,
      leadStatus: lead?.status || null,
      conversationStatus: conversation.status,
      hasInboundMessage: Boolean(conversation.last_inbound_at),
      hasExplicitOptIn: Boolean(conversation.opted_in || lead?.whatsapp_opted_in),
      lastInboundAt: conversation.last_inbound_at,
      messageType,
      templateName,
    })

    let waMessageId: string | null = null
    let storedBody = textBody

    if (messageType === 'template') {
      const res = await sendWhatsAppCloudTemplate({
        toPhoneE164: phoneE164,
        templateName,
        bodyParameters: templateParams,
      })
      waMessageId = res.waMessageId
      storedBody = `[Template: ${templateName}] ${templateParams.join(', ')}`.trim()
    } else {
      if (!textBody) {
        return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
      }
      const res = await sendWhatsAppCloudText({
        toPhoneE164: phoneE164,
        body: textBody,
      })
      waMessageId = res.waMessageId
    }

    const nowIso = new Date().toISOString()

    // Save outbound message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedMessage } = await (supabase.from('outreach_messages') as any)
      .insert({
        conversation_id: conversation.id,
        lead_id: conversation.lead_id,
        direction: 'outbound',
        sender_type: messageType === 'template' ? 'system_template' : 'human',
        message_type: messageType,
        body: storedBody,
        template_name: messageType === 'template' ? templateName : null,
        wa_message_id: waMessageId,
        delivery_status: 'sent',
        ai_metadata: { sent_by_admin: session.email },
      })
      .select('*')
      .single()

    // Update conversation timestamps & clear pending_human if staff replied
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('outreach_conversations') as any)
      .update({
        last_outbound_at: nowIso,
        last_message_preview: storedBody.slice(0, 140),
        unread_count: 0,
        status: conversation.status === 'pending_human' ? 'open' : conversation.status,
      })
      .eq('id', conversation.id)

    // Stamp human_contacted_at on lead & contact_submissions so automated 7-day follow-up knows a human engaged!
    if (conversation.lead_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({ human_contacted_at: nowIso })
        .eq('id', conversation.lead_id)
    }
    const storeDb = createStoreAdminClientSafe()
    if (storeDb) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (storeDb.from('contact_submissions') as any)
        .update({ status: 'replied' })
        .eq('phone', phoneE164)
        .then(() => {})
        .catch(() => {})
    }

    return NextResponse.json({
      success: true,
      waMessageId,
      message: savedMessage,
    })
  } catch (err) {
    if (err instanceof WhatsAppComplianceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 })
    }
    const msg = err instanceof Error ? err.message : 'Failed to send WhatsApp message'
    await logOutreachEvent({
      module: 'whatsapp',
      level: 'error',
      event: 'admin_send_failed',
      message: msg,
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
