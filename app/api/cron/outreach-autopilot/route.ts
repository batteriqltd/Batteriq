import { NextResponse } from 'next/server'
import {
  checkInSuppressionSets,
  getOutreachSettings,
  loadSuppressionSets,
  verifyCronOrAdminAuth,
} from '@/lib/outreach/compliance'
import { runDailyEmailCampaignJob } from '@/lib/outreach/email-campaign'
import { runWebsiteFollowupsJob } from '@/lib/outreach/followups'
import { runLeadFinderJob } from '@/lib/outreach/lead-finder'
import { logOutreachEvent, sleep } from '@/lib/outreach/logger'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import type { OutreachLead } from '@/lib/outreach/types'
import { isKenyanLandline } from '@/lib/outreach/validators'
import { sendWhatsAppCloudTemplate } from '@/lib/outreach/whatsapp'

export const dynamic = 'force-dynamic'

async function executeAutopilotCycle(params: {
  actor: string
  force?: boolean
  customQuery?: string
  maxLeads?: number
  maxEmails?: number
}) {
  const supabase = createOutreachAdminClient()
  const settings = await getOutreachSettings(supabase)

  if (!settings.autopilot_enabled && !params.force) {
    return {
      skipped: true,
      reason: 'autopilot_disabled',
      lastAutopilotAt: settings.last_autopilot_at,
    }
  }

  // 1. Online Multi-Sector Lead Discovery (Schools, NGOs, Parastatals .go.ke, Baby/Retail Shops, Hospitals, Hotels, Orgs)
  // Tuned per 30-minute cycle so serverless execution consistently finishes in ~15-25s well below Vercel's 60s limit.
  const leadResult = await runLeadFinderJob({
    customQuery: params.customQuery,
    queriesPerRun: 1,
    maxPlacesPerQuery: Math.min(10, Math.max(2, params.maxLeads ?? 6)),
  })

  // 2. Automatic Cold Email + Tailored KES Proforma Invoice Dispatch (4 per 30m = 192/day capacity)
  const emailResult = await runDailyEmailCampaignJob({
    maxToProcess: Math.min(8, Math.max(1, params.maxEmails ?? 4)),
  })

  // 3. WhatsApp Cloud Template Outreach (when Meta WhatsApp Cloud credentials are configured)
  const hasWhatsAppCloud = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  )

  let whatsappColdSent = 0
  let whatsappFollowupsSent = 0

  if (hasWhatsAppCloud && !settings.campaign_paused) {
    try {
      const followups = await runWebsiteFollowupsJob()
      whatsappFollowupsSent = followups.sentCount
    } catch {
      // Non-fatal
    }

    if (settings.auto_cold_whatsapp) {
      const suppressionSets = await loadSuppressionSets(supabase)
      const templateName =
        settings.whatsapp_cold_template?.trim() || 'batteriq_quote_ready'

      // Find business leads with a Kenyan mobile/WhatsApp-capable +254 number without an existing WA thread
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingConvs } = await (supabase.from('outreach_conversations') as any)
        .select('phone_e164')
      const messagedPhones = new Set<string>(
        (existingConvs ?? []).map((c: { phone_e164: string }) => c.phone_e164)
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: waCandidates } = await (supabase.from('outreach_leads') as any)
        .select('*')
        .in('status', ['new', 'contacted'])
        .not('phone_e164', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)

      for (const lead of (waCandidates ?? []) as OutreachLead[]) {
        if (whatsappColdSent >= 4) break
        const phone = lead.phone_e164?.trim()
        if (!phone || isKenyanLandline(phone) || messagedPhones.has(phone)) continue
        if (
          checkInSuppressionSets(suppressionSets, {
            email: lead.email,
            phoneE164: phone,
            domain: lead.domain,
          })
        ) {
          continue
        }

        try {
          const { waMessageId } = await sendWhatsAppCloudTemplate({
            toPhoneE164: phone,
            templateName,
            bodyParameters: [lead.business_name.slice(0, 60)],
          })

          const nowIso = new Date().toISOString()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: conv } = await (supabase.from('outreach_conversations') as any)
            .upsert(
              {
                lead_id: lead.id,
                phone_e164: phone,
                contact_name: lead.business_name,
                mode: 'ai',
                status: 'open',
                opted_in: true,
                last_outbound_at: nowIso,
                last_message_preview: `[Template: ${templateName}]`,
              },
              { onConflict: 'phone_e164' }
            )
            .select('id')
            .maybeSingle()

          if (conv?.id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('outreach_messages') as any).insert({
              conversation_id: conv.id,
              lead_id: lead.id,
              direction: 'outbound',
              sender_type: 'system_template',
              message_type: 'template',
              body: `[Automated Cold Outreach Template: ${templateName}] Hello ${lead.business_name}`,
              template_name: templateName,
              wa_message_id: waMessageId,
              delivery_status: 'sent',
            })
          }

          if (lead.status === 'new') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('outreach_leads') as any)
              .update({ status: 'contacted' })
              .eq('id', lead.id)
          }

          messagedPhones.add(phone)
          whatsappColdSent++
          await sleep(300)
        } catch {
          // Non-fatal if template isn't approved in Meta Business Manager yet
          break
        }
      }
    }
  }

  const finishedAt = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_settings') as any)
    .upsert({ id: 'default', last_autopilot_at: finishedAt }, { onConflict: 'id' })

  await logOutreachEvent({
    module: 'autopilot',
    level: 'info',
    event: 'autopilot_cycle_completed',
    message: `30-Min Autopilot (${params.actor}): scanned=${leadResult.placesFound}, new_leads=${leadResult.leadsSaved}, emails_sent=${emailResult.sentNow}, drafted=${emailResult.draftedForReview}${whatsappColdSent > 0 ? `, wa_templates=${whatsappColdSent}` : ''}`,
    metadata: {
      actor: params.actor,
      queriesExecuted: leadResult.queriesExecuted,
      leadsSaved: leadResult.leadsSaved,
      emailsSent: emailResult.sentNow,
      draftedForReview: emailResult.draftedForReview,
      whatsappColdSent,
      whatsappFollowupsSent,
      finishedAt,
    },
  })

  return {
    skipped: false,
    lastAutopilotAt: finishedAt,
    leadFinder: {
      queriesExecuted: leadResult.queriesExecuted,
      placesFound: leadResult.placesFound,
      leadsSaved: leadResult.leadsSaved,
    },
    emailCampaign: {
      sentNow: emailResult.sentNow,
      draftedForReview: emailResult.draftedForReview,
      reviewBeforeSend: emailResult.reviewBeforeSend,
      autoAttachProforma: emailResult.autoAttachProforma,
    },
    whatsapp: {
      configured: hasWhatsAppCloud,
      coldTemplatesSent: whatsappColdSent,
      followupsSent: whatsappFollowupsSent,
    },
  }
}

export async function GET(req: Request) {
  const auth = verifyCronOrAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await executeAutopilotCycle({ actor: auth.actor || 'cron' })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Autopilot cycle failed' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = verifyCronOrAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const result = await executeAutopilotCycle({
      actor: body.trigger || auth.actor || 'admin',
      force: Boolean(body.force || auth.actor === 'admin'),
      customQuery:
        typeof body.query === 'string' && body.query.trim() ? body.query.trim() : undefined,
      maxLeads: typeof body.maxLeads === 'number' ? body.maxLeads : undefined,
      maxEmails: typeof body.maxEmails === 'number' ? body.maxEmails : undefined,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Autopilot cycle failed' },
      { status: 500 }
    )
  }
}
