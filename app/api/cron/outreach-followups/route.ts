import { NextResponse } from 'next/server'
import { verifyCronOrAdminAuth } from '@/lib/outreach/compliance'
import { runWebsiteFollowupsJob } from '@/lib/outreach/followups'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = verifyCronOrAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runWebsiteFollowupsJob()
    return NextResponse.json({ success: true, actor: auth.actor, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Website follow-ups job failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
