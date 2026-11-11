/**
 * Sends a tailored Batteriq PDF proforma to a WhatsApp chat via WAHA.
 *
 * The PDF goes out as a WhatsApp document. If WAHA refuses the file (e.g. the
 * engine/tier does not support media), it falls back to a text message with a
 * signed download link served by /api/proforma/wa/[id].
 *
 * The proforma itself is stored on the outreach_messages row (ai_metadata), so
 * the link always regenerates exactly the quote the client received.
 */
import crypto from 'crypto'
import { sendWahaFile, sendWahaText } from '@/lib/waha'
import { logOutreachEvent } from './logger'
import { generateOutreachProformaPdfBase64, type OutreachProformaPackage } from './proforma'
import { createOutreachAdminClient } from './supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = ReturnType<typeof createOutreachAdminClient> | any

function linkSecret(): string | null {
  const s = process.env.WHATSAPP_WEBHOOK_SECRET?.trim()
  return s && s !== 'replace_me' ? s : null
}

export function proformaLinkSignature(messageRowId: string): string | null {
  const secret = linkSecret()
  if (!secret) return null
  return crypto
    .createHmac('sha256', secret)
    .update(`proforma-link:${messageRowId}`)
    .digest('base64url')
    .slice(0, 32)
}

export function verifyProformaLinkSignature(messageRowId: string, sig: string | null): boolean {
  const expected = proformaLinkSignature(messageRowId)
  if (!expected || !sig || sig.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
}

export function proformaPublicUrl(messageRowId: string): string | null {
  const sig = proformaLinkSignature(messageRowId)
  if (!sig) return null
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').replace(/\/$/, '')
  return `${site}/api/proforma/wa/${messageRowId}?s=${sig}`
}

export function proformaFilename(p: OutreachProformaPackage): string {
  return `Batteriq-Proforma-${p.proformaNumber}.pdf`
}

/** "EcoFlow DELTA 2 Portable Power Station (1024Wh LiFePO4, …)" → "EcoFlow DELTA 2 Portable Power Station" */
function shortProductName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

/** Reads like a sales person's note, not a system notification. */
export function buildProformaWhatsAppCaption(p: OutreachProformaPackage): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').trim().replace(/\/+$/, '')
  const names = p.items.map((it) => shortProductName(it.name))
  const recommendation =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} with the ${names[names.length - 1]}` : names[0] || 'this setup'
  const optionOne = `Option 1: ${names.join(' + ')}, KES ${p.total.toLocaleString('en-KE')}`
  const alt = p.alternative
  const optionTwo = alt
    ? `Option 2: ${alt.items
        .map((it) => `${shortProductName(it.name)}${it.quantity > 1 ? ` x${it.quantity}` : ''}`)
        .join(' + ')}, KES ${alt.total.toLocaleString('en-KE')}`
    : null
  return [
    `Here are the options we put together for ${p.customerName}.`,
    '',
    `I'd recommend the ${recommendation}. It keeps your essentials running the moment the power goes off, with no fuel, no noise and nothing to maintain.`,
    '',
    optionOne,
    ...(optionTwo ? [optionTwo] : []),
    '',
    'Prices include VAT, delivery and a 24-month warranty, and are held for 14 days. Nothing to pay until you decide.',
    '',
    `Tell me which one suits you and we'll arrange delivery, or order directly at ${site}`,
  ].join('\n')
}

export interface SendProformaResult {
  via: 'file' | 'link'
  waMessageId: string | null
  messageRowId: string
}

export async function sendProformaOnWhatsApp(params: {
  supabase?: Db
  conversationId: string
  leadId: string | null
  chatId: string
  proforma: OutreachProformaPackage
  senderType: 'system_template' | 'human' | 'ai'
  adminEmail?: string
}): Promise<SendProformaResult> {
  const supabase = params.supabase || createOutreachAdminClient()
  const p = params.proforma
  const filename = proformaFilename(p)
  const caption = buildProformaWhatsAppCaption(p)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: insErr } = await (supabase.from('outreach_messages') as any)
    .insert({
      conversation_id: params.conversationId,
      lead_id: params.leadId,
      direction: 'outbound',
      sender_type: params.senderType,
      message_type: 'text',
      template_name: 'proforma_pdf',
      body: `${caption}\n\nAttached: ${filename}`,
      delivery_status: 'queued',
      provider: 'waha',
      ai_metadata: {
        proforma: p,
        filename,
        ...(params.adminEmail ? { sent_by_admin: params.adminEmail } : {}),
      },
    })
    .select('id')
    .single()
  if (insErr || !row?.id) throw new Error(`proforma message insert failed: ${insErr?.message || 'no id'}`)
  const messageRowId = row.id as string

  let via: 'file' | 'link' = 'file'
  let waMessageId: string | null = null
  let body = `${caption}\n\nAttached: ${filename}`

  try {
    const pdfBase64 = await generateOutreachProformaPdfBase64(p)
    const sent = await sendWahaFile({
      chatId: params.chatId,
      filename,
      mimetype: 'application/pdf',
      base64: pdfBase64,
      caption,
    })
    waMessageId = sent.messageId
  } catch (fileErr) {
    const url = proformaPublicUrl(messageRowId)
    const reason = fileErr instanceof Error ? fileErr.message : 'file send failed'
    // Anti-spam limits must surface to the caller, not be retried as a link
    if (!url || /\b(463|475)\b/.test(reason)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_messages') as any)
        .update({ delivery_status: 'failed', error_message: reason.slice(0, 500) })
        .eq('id', messageRowId)
      throw fileErr
    }
    via = 'link'
    body = `${caption}\n\nYou can download the PDF here: ${url}`
    try {
      const sent = await sendWahaText({ chatId: params.chatId, text: body })
      waMessageId = sent.messageId
    } catch (textErr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_messages') as any)
        .update({
          delivery_status: 'failed',
          error_message: (textErr instanceof Error ? textErr.message : 'send failed').slice(0, 500),
        })
        .eq('id', messageRowId)
      throw textErr
    }
    await logOutreachEvent({
      module: 'whatsapp',
      level: 'warn',
      event: 'waha_proforma_link_fallback',
      message: `PDF attachment refused, sent proforma link instead: ${reason.slice(0, 200)}`,
      metadata: { messageRowId },
    }).catch(() => {})
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_messages') as any)
    .update({
      wa_message_id: waMessageId,
      delivery_status: 'sent',
      body,
      ai_metadata: {
        proforma: p,
        filename,
        via,
        ...(params.adminEmail ? { sent_by_admin: params.adminEmail } : {}),
      },
    })
    .eq('id', messageRowId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_conversations') as any)
    .update({
      last_outbound_at: new Date().toISOString(),
      last_message_preview: `Proforma #${p.proformaNumber}, KES ${p.total.toLocaleString('en-KE')}`,
    })
    .eq('id', params.conversationId)

  return { via, waMessageId, messageRowId }
}
