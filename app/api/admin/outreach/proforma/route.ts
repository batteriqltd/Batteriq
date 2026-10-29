import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { escapeHtml } from '@/lib/outreach/claude'
import { getOutreachSettings, isSuppressed } from '@/lib/outreach/compliance'
import {
  buildSenderIdentity,
  createUnsubscribeToken,
  dispatchOutreachEmailViaResend,
  renderOutreachEmailHtml,
  renderOutreachEmailText,
} from '@/lib/outreach/email-campaign'
import { logOutreachEvent } from '@/lib/outreach/logger'
import {
  buildProformaEmailCardHtml,
  buildProformaEmailTextBlock,
  generateOutreachProformaPdfBase64,
  generateProformaNumber,
  recalculateProformaPackage,
  recommendBatteriqProformaForLead,
  type OutreachProformaLineItem,
} from '@/lib/outreach/proforma'
import { createOutreachAdminClient, fetchStoreCatalogProductsSafe } from '@/lib/outreach/supabase'
import type { OutreachLead } from '@/lib/outreach/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leadId = req.nextUrl.searchParams.get('leadId')?.trim()
  if (!leadId) {
    return NextResponse.json({ error: 'leadId query parameter is required' }, { status: 400 })
  }

  try {
    const supabase = createOutreachAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lead, error } = await (supabase.from('outreach_leads') as any)
      .select('*')
      .eq('id', leadId)
      .maybeSingle()

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const catalogProducts = await fetchStoreCatalogProductsSafe(20, [
      'Power Stations',
      'Solar Home Systems',
      'Solar Panels',
      'Batteries',
    ])

    const proforma = recommendBatteriqProformaForLead(lead as OutreachLead, catalogProducts)

    return NextResponse.json({
      proforma,
      catalogProducts,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to prepare proforma quote' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const action = body.action === 'download' ? 'download' : 'email'
    const leadId = String(body.leadId || '').trim()

    const supabase = createOutreachAdminClient()
    const settings = await getOutreachSettings(supabase)

    let lead: OutreachLead | null = null
    if (leadId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('outreach_leads') as any)
        .select('*')
        .eq('id', leadId)
        .maybeSingle()
      lead = (data as OutreachLead) || null
    }

    const customerName = String(body.customerName || lead?.business_name || '').trim()
    const customerEmail = String(body.customerEmail || lead?.email || '')
      .trim()
      .toLowerCase()
    const customerPhone = String(body.customerPhone || lead?.phone_e164 || '').trim()
    const customerAddress = String(
      body.customerAddress || lead?.address || (lead?.city ? `${lead.city}, Kenya` : 'Kenya')
    ).trim()

    if (!customerName) {
      return NextResponse.json({ error: 'Client / Organization name is required' }, { status: 400 })
    }

    const rawItems = Array.isArray(body.items) ? (body.items as OutreachProformaLineItem[]) : []
    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'At least one Batteriq product item is required' }, { status: 400 })
    }

    const now = new Date()
    const proforma = recalculateProformaPackage({
      proformaNumber: String(body.proformaNumber || generateProformaNumber(now)).trim(),
      issueDateIso: now.toISOString(),
      validUntilIso: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      systemTitle: String(body.systemTitle || 'Batteriq Commercial Backup & Solar Proposal').trim(),
      useCaseSummary: String(
        body.useCaseSummary ||
          'Silent <20ms automatic UPS switchover with official Kenya manufacturer warranty & KRA eTIMS VAT compliance.'
      ).trim(),
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items: rawItems,
      notes: String(
        body.notes ||
          'PROFORMA QUOTATION (Valid 14 days). Prices in KES inclusive of 16% VAT. Official KRA eTIMS Tax Invoice issued upon LPO / payment. Includes 24-month+ manufacturer warranty & insured delivery across Kenya.'
      ).trim(),
    })

    const pdfBase64 = await generateOutreachProformaPdfBase64(proforma)
    const filename = `Batteriq-Proforma-${proforma.proformaNumber}.pdf`

    if (action === 'download') {
      return NextResponse.json({
        success: true,
        proforma,
        filename,
        pdfBase64,
      })
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Recipient email address is required to email the Proforma PDF' },
        { status: 400 }
      )
    }

    if (await isSuppressed(supabase, { email: customerEmail, phoneE164: customerPhone })) {
      return NextResponse.json(
        { error: 'Recipient is on the permanent Kenya DPA opt-out suppression list' },
        { status: 409 }
      )
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batteriq.com').replace(/\/$/, '')
    const effectiveLeadId = lead?.id || '00000000-0000-0000-0000-000000000000'
    const unsubToken = createUnsubscribeToken(customerEmail, effectiveLeadId)
    const unsubPageUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubToken)}`
    const fromIdentity = buildSenderIdentity(settings)

    const customNote = typeof body.coverMessage === 'string' && body.coverMessage.trim()
      ? body.coverMessage.trim()
      : null

    const paragraphsText = customNote
      ? customNote.split(/\n{2,}/).map((p: string) => p.trim()).filter(Boolean)
      : [
          `Hello ${customerName} Team,`,
          `Please find attached your tailored Batteriq Kenya Proforma Quotation (#${proforma.proformaNumber}) for our ${proforma.systemTitle} (Total: KES ${proforma.total.toLocaleString('en-KE')} inclusive of 16% VAT and official 24-month local warranty).`,
          `Our EcoFlow & BLUETTI commercial LiFePO4 backup systems eliminate KPLC blackout downtime silently (<20ms automatic switchover, zero diesel fumes, and full KRA eTIMS VAT invoicing / LPO support).`,
          `Reply directly to this email if you would like us to adjust unit quantities, arrange delivery, or process your corporate LPO.`,
          `Warm regards,\n${settings.sender_name}`,
        ]

    const subject =
      typeof body.subject === 'string' && body.subject.trim()
        ? body.subject.trim()
        : `Batteriq Proforma Quotation (#${proforma.proformaNumber}) — ${customerName}`

    const bodyHtml = renderOutreachEmailHtml({
      subject,
      paragraphsHtml: paragraphsText.map((p: string) => escapeHtml(p).replace(/\n/g, '<br/>')),
      senderName: settings.sender_name,
      unsubscribeUrl: unsubPageUrl,
      proformaHtml: buildProformaEmailCardHtml(proforma),
    })

    const bodyText = renderOutreachEmailText({
      bodyText: paragraphsText.join('\n\n'),
      senderName: settings.sender_name,
      unsubscribeUrl: unsubPageUrl,
      proformaText: buildProformaEmailTextBlock(proforma),
    })

    let emailRowId = 'proforma-direct'
    if (lead?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted } = await (supabase.from('outreach_emails') as any)
        .insert({
          lead_id: lead.id,
          to_email: customerEmail,
          from_identity: fromIdentity,
          reply_to: settings.reply_to_email || null,
          subject,
          body_html: bodyHtml,
          body_text: bodyText,
          unsubscribe_token: unsubToken,
          status: 'queued',
          claude_model: 'batteriq-proforma-engine',
          proforma_number: proforma.proformaNumber,
          proforma_total_kes: proforma.total,
        })
        .select('id')
        .maybeSingle()

      if (inserted?.id) {
        emailRowId = inserted.id
      }
    }

    const { resendMessageId } = await dispatchOutreachEmailViaResend({
      emailRow: {
        id: emailRowId,
        lead_id: effectiveLeadId,
        to_email: customerEmail,
        from_identity: fromIdentity,
        reply_to: settings.reply_to_email || null,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        unsubscribe_token: unsubToken,
      },
      attachments: [
        {
          filename,
          content: pdfBase64,
        },
      ],
    })

    const sentAt = new Date().toISOString()

    if (lead?.id && emailRowId !== 'proforma-direct') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_emails') as any)
        .update({
          status: 'sent',
          resend_message_id: resendMessageId,
          reviewed_by: session.email,
          reviewed_at: sentAt,
          sent_at: sentAt,
        })
        .eq('id', emailRowId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_leads') as any)
        .update({
          status: lead.status === 'new' ? 'contacted' : lead.status,
          last_emailed_at: sentAt,
          email_count: (lead.email_count || 0) + 1,
        })
        .eq('id', lead.id)
    }

    await logOutreachEvent({
      module: 'proforma',
      level: 'info',
      event: 'proforma_emailed',
      message: `Sent Proforma Quotation #${proforma.proformaNumber} (KES ${proforma.total.toLocaleString('en-KE')}) to ${customerName} (${customerEmail})`,
      metadata: {
        proformaNumber: proforma.proformaNumber,
        totalKes: proforma.total,
        customerName,
        customerEmail,
        resendMessageId,
        sentBy: session.email,
      },
    })

    return NextResponse.json({
      success: true,
      proforma,
      resendMessageId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to dispatch proforma invoice' },
      { status: 500 }
    )
  }
}
