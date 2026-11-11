import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { checkWahaNumberExists, sendWahaText } from '@/lib/waha'
import { isSuppressed } from '@/lib/outreach/compliance'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import { recordOutboundWahaMessage, wahaErrorResponse } from '@/lib/outreach/waha-admin'
import { MANUAL_DAILY_CAP, MANUAL_MIN_GAP_SECONDS, claimSendSlot } from '@/lib/outreach/waha-queue'
import { toWhatsAppDigits } from '@/lib/outreach/whatsapp-transport'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** POST { phone, text } — send a test message from the linked WhatsApp number. */
export async function POST(req: NextRequest) {
  const session = getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const digits = toWhatsAppDigits(typeof body?.phone === 'string' ? body.phone : '')
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 4000) : ''
  if (!digits) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'Message text is required' }, { status: 400 })

  const phoneE164 = `+${digits}`
  const supabase = createOutreachAdminClient()
  try {
    if (await isSuppressed(supabase, { phoneE164 })) {
      return NextResponse.json({ error: 'This number has opted out and cannot be messaged.' }, { status: 403 })
    }
    const slot = await claimSendSlot(supabase, 'manual', MANUAL_MIN_GAP_SECONDS, MANUAL_DAILY_CAP)
    if (!slot.allowed) {
      return NextResponse.json(
        { error: 'Sending too fast — try again in a moment.', retryAfterSeconds: slot.retryAfterSeconds },
        { status: 429 }
      )
    }
    const check = await checkWahaNumberExists(digits)
    if (!check.exists) {
      return NextResponse.json({ error: `${phoneE164} is not on WhatsApp.` }, { status: 400 })
    }
    const chatId = check.chatId || `${digits}@c.us`
    const { messageId } = await sendWahaText({ chatId, text })
    const stored = await recordOutboundWahaMessage({
      phoneE164,
      chatId,
      body: text,
      waMessageId: messageId,
      adminEmail: session.email,
      takeover: false,
    })
    return NextResponse.json({ success: true, messageId, conversationId: stored.conversationId })
  } catch (err) {
    return wahaErrorResponse(err, 'Test message failed')
  }
}
