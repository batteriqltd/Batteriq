import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'
import { createOutreachAdminClient, hasOutreachSupabaseConfig } from '@/lib/outreach/supabase'

// PATCH — update a contact submission's status (new | read | replied)
export async function PATCH(req: Request) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, status } = await req.json()

    if (!id || !['new', 'read', 'replied'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const nowIso = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedSubmission, error } = await (supabase.from('contact_submissions') as any)
      .update(
        status === 'replied'
          ? { status, human_contacted_at: nowIso }
          : { status }
      )
      .eq('id', id)
      .select('email, phone')
      .maybeSingle()

    if (error) {
      // Fallback if human_contacted_at column is not on Store Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const retry = await (supabase.from('contact_submissions') as any)
        .update({ status })
        .eq('id', id)
        .select('email, phone')
        .maybeSingle()
      if (retry.error) {
        console.error('[ADMIN MESSAGES] Update error:', retry.error)
        return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
      }
      if (status === 'replied' && retry.data?.phone && hasOutreachSupabaseConfig()) {
        const outreachDb = createOutreachAdminClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(outreachDb.from('outreach_leads') as any)
          .update({ human_contacted_at: nowIso })
          .eq('phone_e164', retry.data.phone)
          .then(() => {})
          .catch(() => {})
      }
    } else if (status === 'replied' && updatedSubmission?.phone && hasOutreachSupabaseConfig()) {
      const outreachDb = createOutreachAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(outreachDb.from('outreach_leads') as any)
        .update({ human_contacted_at: nowIso })
        .eq('phone_e164', updatedSubmission.phone)
        .then(() => {})
        .catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN MESSAGES] Exception:', error)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}

// DELETE — permanently remove a contact submission (e.g. spam)
export async function DELETE(req: Request) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('contact_submissions') as any)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[ADMIN MESSAGES] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN MESSAGES] Exception:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
