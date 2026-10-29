import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getOutreachSettings } from '@/lib/outreach/compliance'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createOutreachAdminClient()
    const settings = await getOutreachSettings(supabase)

    // East Africa Time (UTC+3) start of today
    const now = new Date()
    const eatOffsetMs = 3 * 60 * 60 * 1000
    const eatDate = new Date(now.getTime() + eatOffsetMs)
    eatDate.setUTCHours(0, 0, 0, 0)
    const startOfTodayIso = new Date(eatDate.getTime() - eatOffsetMs).toISOString()

    const statusFilter = req.nextUrl.searchParams.get('status') || ''
    const categoryFilter = req.nextUrl.searchParams.get('category') || ''
    const searchQ = req.nextUrl.searchParams.get('q')?.trim() || ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let leadsQuery = (supabase.from('outreach_leads') as any)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(120)

    if (statusFilter && statusFilter !== 'all') {
      leadsQuery = leadsQuery.eq('status', statusFilter)
    }
    if (categoryFilter && categoryFilter !== 'all') {
      leadsQuery = leadsQuery.eq('category', categoryFilter)
    }
    if (searchQ) {
      const safe = searchQ.replace(/[%_]/g, '')
      leadsQuery = leadsQuery.or(
        `business_name.ilike.%${safe}%,email.ilike.%${safe}%,city.ilike.%${safe}%,phone_e164.ilike.%${safe}%`
      )
    }

    const [
      sentTodayRes,
      pendingReviewRes,
      totalLeadsRes,
      repliesRes,
      hotLeadsRes,
      suppressionRes,
      errorsTodayRes,
      pendingHumanRes,
      leadsRes,
      emailsRes,
      logsRes,
      callsRes,
    ] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_emails') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', startOfTodayIso),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_emails') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_leads') as any).select('id', { count: 'exact', head: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_leads') as any)
        .select('id', { count: 'exact', head: true })
        .in('status', ['replied', 'interested', 'hot', 'customer']),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_leads') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'hot'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_suppression_list') as any).select('id', {
        count: 'exact',
        head: true,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_logs') as any)
        .select('id', { count: 'exact', head: true })
        .eq('level', 'error')
        .gte('created_at', startOfTodayIso),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_conversations') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_human'),
      leadsQuery,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_emails') as any)
        .select('*, outreach_leads(business_name, category, city, status)')
        .order('created_at', { ascending: false })
        .limit(80),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_logs') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('outreach_call_logs') as any)
        .select('*, outreach_leads(business_name, category, city, status)')
        .order('created_at', { ascending: false })
        .limit(40),
    ])

    return NextResponse.json({
      admin: { email: session.email, role: session.role },
      settings,
      metrics: {
        emailsSentToday: sentTodayRes.count ?? 0,
        dailyTarget: settings.daily_email_limit,
        pendingReviewEmails: pendingReviewRes.count ?? 0,
        totalLeads: totalLeadsRes.count ?? 0,
        repliesCount: repliesRes.count ?? 0,
        hotLeadsCount: hotLeadsRes.count ?? 0,
        optOutsCount: suppressionRes.count ?? 0,
        errorsTodayCount: errorsTodayRes.count ?? 0,
        pendingHumanCount: pendingHumanRes.count ?? 0,
      },
      leads: leadsRes.data ?? [],
      emails: emailsRes.data ?? [],
      logs: logsRes.data ?? [],
      calls: callsRes.data ?? [],
    })
  } catch (err) {
    console.error('[OUTREACH OVERVIEW] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load outreach overview' },
      { status: 500 }
    )
  }
}
