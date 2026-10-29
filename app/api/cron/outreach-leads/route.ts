import { NextResponse } from 'next/server'
import { verifyCronOrAdminAuth } from '@/lib/outreach/compliance'
import { runLeadFinderJob } from '@/lib/outreach/lead-finder'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = verifyCronOrAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runLeadFinderJob()
    return NextResponse.json({ success: true, actor: auth.actor, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lead finder job failed'
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
    const result = await runLeadFinderJob({
      customQuery: typeof body.query === 'string' && body.query.trim() ? body.query.trim() : undefined,
      customCity: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : undefined,
      customCategory: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : undefined,
      queriesPerRun: typeof body.queriesPerRun === 'number' ? body.queriesPerRun : undefined,
      maxPlacesPerQuery: typeof body.maxPlacesPerQuery === 'number' ? body.maxPlacesPerQuery : undefined,
    })
    return NextResponse.json({ success: true, actor: auth.actor, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lead finder job failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
