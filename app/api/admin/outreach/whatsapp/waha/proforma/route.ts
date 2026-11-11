import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { checkWahaNumberExists, isWahaConfigured } from '@/lib/waha'
import { isSuppressed } from '@/lib/outreach/compliance'
import {
  generateProformaNumber,
  recalculateProformaPackage,
  recommendBatteriqProformaForLead,
  type OutreachProformaLineItem,
  type OutreachProformaPackage,
} from '@/lib/outreach/proforma'
import { createOutreachAdminClient, fetchStoreCatalogProductsSafe } from '@/lib/outreach/supabase'
import type { OutreachLead } from '@/lib/outreach/types'
import { wahaErrorResponse } from '@/lib/outreach/waha-admin'
import { MANUAL_DAILY_CAP, MANUAL_MIN_GAP_SECONDS, claimSendSlot } from '@/lib/outreach/waha-queue'
import { sendProformaOnWhatsApp } from '@/lib/outreach/whatsapp-proforma'
import { toWhatsAppDigits } from '@/lib/outreach/whatsapp-transport'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST — send a PDF proforma to a client on WhatsApp.
 *   { conversationId }                → auto-tailored quote for that chat's lead
 *   { phone, leadId?, items, ... }    → the quote edited in the Proforma panel
 */
export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isWahaConfigured()) {
    return NextResponse.json({ error: 'WhatsApp is not connected on the server.' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const supabase = createOutreachAdminClient()

  try {
    // ── Resolve the conversation / phone ───────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let conv: any = null
    if (typeof body.conversationId === 'string' && body.conversationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('outreach_conversations') as any)
        .select('*')
        .eq('id', body.conversationId)
        .maybeSingle()
      if (!data) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      conv = data
    }

    const digits = conv
      ? toWhatsAppDigits(conv.phone_e164 || '')
      : toWhatsAppDigits(typeof body.phone === 'string' ? body.phone : '')
    if (!digits && !conv?.wa_chat_id) {
      return NextResponse.json({ error: 'A valid client WhatsApp number is required' }, { status: 400 })
    }
    const phoneE164 = digits ? `+${digits}` : String(conv.phone_e164)

    if (!conv && digits) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('outreach_conversations') as any)
        .select('*')
        .eq('phone_e164', phoneE164)
        .maybeSingle()
      conv = data || null
    }

    if (conv?.status === 'opted_out' || (await isSuppressed(supabase, { phoneE164 }))) {
      return NextResponse.json({ error: 'This client opted out and cannot be messaged.' }, { status: 403 })
    }

    // ── Lead (for tailoring) ───────────────────────────────────────────────
    const leadId: string | null =
      conv?.lead_id || (typeof body.leadId === 'string' && body.leadId ? body.leadId : null)
    let lead: OutreachLead | null = null
    if (leadId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('outreach_leads') as any)
        .select('*')
        .eq('id', leadId)
        .maybeSingle()
      lead = (data as OutreachLead) || null
    }

    // ── Build the proforma ─────────────────────────────────────────────────
    let proforma: OutreachProformaPackage
    const rawItems = Array.isArray(body.items) ? (body.items as OutreachProformaLineItem[]) : []
    if (rawItems.length > 0) {
      const now = new Date()
      proforma = recalculateProformaPackage({
        proformaNumber: String(body.proformaNumber || generateProformaNumber(now)).trim(),
        issueDateIso: now.toISOString(),
        validUntilIso: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        systemTitle: String(body.systemTitle || 'Batteriq Backup & Solar Proposal').trim(),
        useCaseSummary: String(body.useCaseSummary || '').trim(),
        customerName: String(body.customerName || lead?.business_name || conv?.contact_name || 'Valued Customer').trim(),
        customerEmail: String(body.customerEmail || lead?.email || '').trim(),
        customerPhone: phoneE164,
        customerAddress: String(body.customerAddress || lead?.address || 'Kenya').trim(),
        items: rawItems,
        notes: String(
          body.notes ||
            'PROFORMA QUOTATION (Valid 14 days). Prices in KES inclusive of 16% VAT. Official KRA eTIMS Tax Invoice issued upon payment. Includes 24-month manufacturer warranty & delivery across Kenya.'
        ).trim(),
      })
    } else {
      const catalog = await fetchStoreCatalogProductsSafe(100, ['Power Stations', 'Solar Panels'])
      proforma = recommendBatteriqProformaForLead(
        lead || {
          business_name: conv?.contact_name || 'Valued Customer',
          category: 'other',
          city: null,
          address: null,
          email: null,
          phone_e164: phoneE164,
        },
        catalog
      )
    }

    // ── Rate limit + WhatsApp check ────────────────────────────────────────
    const slot = await claimSendSlot(supabase, 'manual', MANUAL_MIN_GAP_SECONDS, MANUAL_DAILY_CAP)
    if (!slot.allowed) {
      return NextResponse.json(
        { error: 'Sending too fast — try again in a moment.', retryAfterSeconds: slot.retryAfterSeconds },
        { status: 429 }
      )
    }

    let chatId: string = conv?.wa_chat_id || ''
    if (!chatId) {
      const check = await checkWahaNumberExists(digits as string)
      if (!check.exists) {
        return NextResponse.json({ error: `${phoneE164} is not on WhatsApp.` }, { status: 400 })
      }
      chatId = check.chatId || `${digits}@c.us`
    }

    const nowIso = new Date().toISOString()
    if (!conv) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('outreach_conversations') as any)
        .insert({
          lead_id: lead?.id || null,
          phone_e164: phoneE164,
          wa_chat_id: chatId,
          contact_name: proforma.customerName,
          mode: 'human',
          status: 'open',
          opted_in: false,
          last_outbound_at: nowIso,
          unread_count: 0,
        })
        .select('*')
        .single()
      if (error) throw new Error(`conversation insert failed: ${error.message}`)
      conv = data
    } else {
      // Staff acted in this chat → human takes over from the AI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_conversations') as any)
        .update({
          mode: 'human',
          unread_count: 0,
          ...(conv.wa_chat_id ? {} : { wa_chat_id: chatId }),
          ...(conv.status === 'pending_human' ? { status: 'open' } : {}),
        })
        .eq('id', conv.id)
    }

    const result = await sendProformaOnWhatsApp({
      supabase,
      conversationId: conv.id,
      leadId: lead?.id || conv.lead_id || null,
      chatId,
      proforma,
      senderType: 'human',
      adminEmail: session.email,
    })

    return NextResponse.json({
      success: true,
      via: result.via,
      conversationId: conv.id,
      mode: 'human',
      proformaNumber: proforma.proformaNumber,
      total: proforma.total,
    })
  } catch (err) {
    return wahaErrorResponse(err, 'Could not send the proforma on WhatsApp')
  }
}
