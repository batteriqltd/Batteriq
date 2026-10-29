import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import {
  getAfricasTalkingStubReadiness,
  queueStubVoiceCall,
  VoiceCallComplianceError,
} from '@/lib/outreach/calling-stub'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createOutreachAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('outreach_call_logs') as any)
    .select('*, outreach_leads(business_name, category, city, status)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    provider: 'africas_talking_stub',
    phase: 2,
    readiness: getAfricasTalkingStubReadiness(),
    calls: data ?? [],
  })
}

export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const leadId = String(body.leadId || '').trim()
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const callLog = await queueStubVoiceCall({
      leadId,
      requestedBy: session.email,
    })

    return NextResponse.json({
      success: true,
      stubbed: true,
      callLog,
    })
  } catch (err) {
    if (err instanceof VoiceCallComplianceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to queue stub call' },
      { status: 500 }
    )
  }
}
