import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { isSuppressed, recordPermanentOptOut } from '@/lib/outreach/compliance'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import { LEAD_CATEGORIES, LEAD_STATUSES, type LeadCategory, type LeadStatus } from '@/lib/outreach/types'
import { extractDomain, normalizeKenyanPhone } from '@/lib/outreach/validators'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const businessName = String(body.business_name || '').trim()
    if (!businessName) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }

    const rawCategory = String(body.category || 'other').trim() as LeadCategory
    const category: LeadCategory = (LEAD_CATEGORIES as readonly string[]).includes(rawCategory)
      ? rawCategory
      : 'other'

    const email = typeof body.email === 'string' && body.email.trim()
      ? body.email.trim().toLowerCase()
      : null
    const phoneE164 = typeof body.phone === 'string' && body.phone.trim()
      ? normalizeKenyanPhone(body.phone, { source: 'form_or_whatsapp' })
      : null

    if (body.phone && !phoneE164) {
      return NextResponse.json(
        { error: 'Phone number must be a valid Kenyan (+254) number' },
        { status: 400 }
      )
    }

    if (!email && !phoneE164) {
      return NextResponse.json(
        { error: 'Provide at least a business email or Kenyan +254 phone number' },
        { status: 400 }
      )
    }

    const websiteUrl = typeof body.website_url === 'string' && body.website_url.trim()
      ? body.website_url.trim()
      : null
    const domain = extractDomain(websiteUrl)

    const supabase = createOutreachAdminClient()
    if (await isSuppressed(supabase, { email, phoneE164, domain })) {
      return NextResponse.json(
        { error: 'This contact is on the permanent Kenya DPA opt-out suppression list' },
        { status: 409 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('outreach_leads') as any)
      .insert({
        business_name: businessName,
        category,
        city: typeof body.city === 'string' ? body.city.trim() || null : null,
        address: typeof body.address === 'string' ? body.address.trim() || null : null,
        website_url: websiteUrl,
        domain,
        email,
        phone_e164: phoneE164,
        source: 'manual',
        source_details: { added_by: session.email },
        status: 'new',
        business_summary:
          typeof body.business_summary === 'string' ? body.business_summary.trim() || null : null,
        whatsapp_opted_in: Boolean(body.whatsapp_opted_in),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, lead: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create lead' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const leadId = String(body.id || '').trim()
    if (!leadId) {
      return NextResponse.json({ error: 'Lead id is required' }, { status: 400 })
    }

    const supabase = createOutreachAdminClient()

    if (body.status === 'opted_out') {
      await recordPermanentOptOut(supabase, {
        leadId,
        reason: 'admin_manual_opt_out',
        channel: 'all',
        source: `admin:${session.email}`,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('outreach_leads') as any)
        .select('*')
        .eq('id', leadId)
        .single()
      return NextResponse.json({ success: true, lead: data })
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.status === 'string' && (LEAD_STATUSES as readonly string[]).includes(body.status)) {
      updates.status = body.status as LeadStatus
    }
    if (typeof body.notes === 'string') {
      updates.notes = body.notes
    }
    if (body.mark_human_contacted === true) {
      updates.human_contacted_at = new Date().toISOString()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('outreach_leads') as any)
      .update(updates)
      .eq('id', leadId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, lead: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update lead' },
      { status: 500 }
    )
  }
}
