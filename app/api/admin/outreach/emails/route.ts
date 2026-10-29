import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import {
  approveAndSendEmailDraft,
  runDailyEmailCampaignJob,
} from '@/lib/outreach/email-campaign'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const action = String(body.action || '')

    if (action === 'approve_and_send') {
      const emailId = String(body.emailId || '').trim()
      if (!emailId) {
        return NextResponse.json({ error: 'emailId is required' }, { status: 400 })
      }
      const res = await approveAndSendEmailDraft({
        emailId,
        reviewerEmail: session.email,
        updatedSubject: typeof body.subject === 'string' ? body.subject : undefined,
        updatedBodyText: typeof body.bodyText === 'string' ? body.bodyText : undefined,
      })
      return NextResponse.json({ success: true, ...res })
    }

    if (action === 'approve_all_pending') {
      const supabase = createOutreachAdminClient()
      const nowIso = new Date().toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_emails') as any)
        .update({
          status: 'approved',
          reviewed_by: session.email,
          reviewed_at: nowIso,
        })
        .eq('status', 'pending_review')

      const runRes = await runDailyEmailCampaignJob({ forceSendApprovedOnly: true })
      return NextResponse.json({ success: true, ...runRes })
    }

    if (action === 'reject') {
      const emailId = String(body.emailId || '').trim()
      if (!emailId) {
        return NextResponse.json({ error: 'emailId is required' }, { status: 400 })
      }
      const supabase = createOutreachAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('outreach_emails') as any)
        .update({
          status: 'rejected',
          reviewed_by: session.email,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', emailId)

      return NextResponse.json({ success: true, status: 'rejected' })
    }

    return NextResponse.json({ error: 'Unsupported email action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Email action failed' },
      { status: 500 }
    )
  }
}
