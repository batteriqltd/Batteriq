import { NextResponse } from 'next/server'
import { verifyCronOrAdminAuth } from '@/lib/outreach/compliance'
import { sendNextWhatsAppColdQueueMessage } from '@/lib/outreach/whatsapp'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = verifyCronOrAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendNextWhatsAppColdQueueMessage()
    return NextResponse.json({ success: true, actor: auth.actor, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'WhatsApp queue dispatch failed'
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
    const result = await sendNextWhatsAppColdQueueMessage({
      templateName: typeof body.templateName === 'string' ? body.templateName : undefined,
    })
    return NextResponse.json({ success: true, actor: auth.actor, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'WhatsApp queue dispatch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
