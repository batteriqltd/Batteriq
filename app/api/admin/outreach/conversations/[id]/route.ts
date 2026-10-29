import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createOutreachAdminClient()

  // Clear unread counter when admin opens thread
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('outreach_conversations') as any)
    .update({ unread_count: 0 })
    .eq('id', params.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages, error } = await (supabase.from('outreach_messages') as any)
    .select('*')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: messages ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if (body.mode === 'ai' || body.mode === 'human') {
      updates.mode = body.mode
      if (body.mode === 'ai') {
        updates.status = 'open'
        updates.escalated_reason = null
      }
    }
    if (
      typeof body.status === 'string' &&
      ['open', 'pending_human', 'closed'].includes(body.status)
    ) {
      updates.status = body.status
    }

    const supabase = createOutreachAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('outreach_conversations') as any)
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logOutreachEvent({
      module: 'ai_takeover',
      level: 'info',
      event: 'conversation_mode_switched',
      message: `Conversation ${params.id} switched to ${updates.mode || updates.status} by ${session.email}`,
      metadata: { conversationId: params.id, updates },
    })

    return NextResponse.json({ success: true, conversation: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update conversation' },
      { status: 500 }
    )
  }
}
