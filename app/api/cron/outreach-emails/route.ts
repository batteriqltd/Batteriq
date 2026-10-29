import { NextResponse } from 'next/server'
import { verifyCronOrAdminAuth } from '@/lib/outreach/compliance'
import { runDailyEmailCampaignJob } from '@/lib/outreach/email-campaign'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = verifyCronOrAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runDailyEmailCampaignJob()
    return NextResponse.json({ success: true, actor: auth.actor, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Daily email campaign failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = verifyCronOrAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const result = await runDailyEmailCampaignJob({
      maxToProcess: typeof body.maxToProcess === 'number' ? body.maxToProcess : undefined,
      forceSendApprovedOnly: Boolean(body.forceSendApprovedOnly),
    })
    return NextResponse.json({ success: true, actor: auth.actor, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Daily email campaign failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
