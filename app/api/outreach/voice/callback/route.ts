import { NextRequest } from 'next/server'
import { buildAfricasTalkingVoiceXml } from '@/lib/outreach/calling-stub'
import { recordPermanentOptOut } from '@/lib/outreach/compliance'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import { normalizeKenyanPhone } from '@/lib/outreach/validators'

export const dynamic = 'force-dynamic'

/**
 * POST /api/outreach/voice/callback
 * Phase 2 Stub webhook for Africa's Talking Voice callbacks.
 * - Always opens with mandatory AI disclosure (<Say>...</Say>).
 * - Pressing DTMF '9' permanently opts the caller out in compliance with Kenya's Data Protection Act.
 * - Pressing DTMF '1' transfers / escalates to Batteriq human sales desk.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''
  let callerNumber = ''
  let dtmfDigits = ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData().catch(() => null)
    callerNumber = String(form?.get('callerNumber') || form?.get('destinationNumber') || '')
    dtmfDigits = String(form?.get('dtmfDigits') || '')
  } else {
    const body = await req.json().catch(() => ({}))
    callerNumber = String(body.callerNumber || body.destinationNumber || '')
    dtmfDigits = String(body.dtmfDigits || '')
  }

  const normalizedPhone = normalizeKenyanPhone(callerNumber, { source: 'form_or_whatsapp' })

  if (dtmfDigits === '9' && normalizedPhone) {
    const supabase = createOutreachAdminClient()
    await recordPermanentOptOut(supabase, {
      phoneE164: normalizedPhone,
      reason: 'voice_dtmf_opt_out',
      channel: 'all',
      source: 'africas_talking_voice_callback',
    })

    const optOutXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say playBeep="false">You have been permanently opted out from Batteriq automated calls. Goodbye.</Say>
</Response>`
    return new Response(optOutXml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    })
  }

  if (dtmfDigits === '1') {
    const transferNumber = process.env.OUTREACH_HUMAN_TRANSFER_PHONE || '+254716822014'
    const transferXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say playBeep="false">Connecting you to a Batteriq Kenya human specialist now.</Say>
  <Dial phoneNumbers="${transferNumber}" />
</Response>`
    return new Response(transferXml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    })
  }

  const xml = buildAfricasTalkingVoiceXml({})
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  })
}
