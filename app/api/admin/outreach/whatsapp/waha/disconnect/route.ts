import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { logoutWahaSession, stopWahaSession } from '@/lib/waha'
import { logOutreachEvent } from '@/lib/outreach/logger'
import { wahaErrorResponse } from '@/lib/outreach/waha-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** POST { action: 'stop' | 'logout' } — stop keeps the phone linked; logout unlinks it. */
export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const action = body?.action === 'logout' ? 'logout' : 'stop'
  try {
    if (action === 'logout') await logoutWahaSession()
    else await stopWahaSession()
    await logOutreachEvent({
      module: 'whatsapp',
      level: 'info',
      event: `waha_${action}`,
      message: `WhatsApp session ${action} by ${session.email}`,
    })
    return NextResponse.json({ success: true, action })
  } catch (err) {
    return wahaErrorResponse(err, `Could not ${action} WhatsApp session`)
  }
}
