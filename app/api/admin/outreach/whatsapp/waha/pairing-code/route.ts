import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { requestWahaPairingCode } from '@/lib/waha'
import { wahaErrorResponse } from '@/lib/outreach/waha-admin'
import { toWhatsAppDigits } from '@/lib/outreach/whatsapp-transport'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** POST { phone } — code to enter in WhatsApp → Linked devices → Link with phone number instead. */
export async function POST(req: NextRequest) {
  if (!getAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const digits = toWhatsAppDigits(typeof body?.phone === 'string' ? body.phone : '')
  if (!digits) {
    return NextResponse.json({ error: 'Enter the WhatsApp number to link, e.g. 0712 345 678' }, { status: 400 })
  }
  try {
    const code = await requestWahaPairingCode(digits)
    return NextResponse.json({ success: true, code })
  } catch (err) {
    return wahaErrorResponse(err, 'Could not get pairing code')
  }
}
