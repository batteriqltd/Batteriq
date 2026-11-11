import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getVoiceReadiness, requestWebrtcCapabilityToken } from '@/lib/outreach/voice'

export const dynamic = 'force-dynamic'

/**
 * Issues a short-lived WebRTC capability token for the logged-in admin's
 * browser softphone. The Africa's Talking API key never reaches the
 * client — only this derived, scoped token does.
 */
export async function POST() {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const readiness = getVoiceReadiness()
  if (!readiness.configured) {
    return NextResponse.json(
      { error: 'not_configured', message: 'Africa’s Talking voice is not configured yet.' },
      { status: 503 }
    )
  }

  try {
    const { token, clientName } = await requestWebrtcCapabilityToken(session.id)
    return NextResponse.json({ token, clientName })
  } catch (err) {
    console.error('[voice/token] failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not get a voice token' },
      { status: 500 }
    )
  }
}
