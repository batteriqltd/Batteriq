import { NextRequest, NextResponse } from 'next/server'
import { generateOutreachProformaPdfBase64, type OutreachProformaPackage } from '@/lib/outreach/proforma'
import { createOutreachAdminClient } from '@/lib/outreach/supabase'
import { verifyProformaLinkSignature } from '@/lib/outreach/whatsapp-proforma'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Public, signed download of a proforma that was sent to a client on WhatsApp.
 * Only works with the HMAC signature that was included in the WhatsApp message.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  const sig = req.nextUrl.searchParams.get('s')
  if (!UUID_RE.test(id) || !verifyProformaLinkSignature(id, sig)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const supabase = createOutreachAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('outreach_messages') as any)
      .select('ai_metadata, template_name')
      .eq('id', id)
      .maybeSingle()
    const proforma = data?.ai_metadata?.proforma as OutreachProformaPackage | undefined
    if (!data || data.template_name !== 'proforma_pdf' || !proforma?.items?.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const pdf = Buffer.from(await generateOutreachProformaPdfBase64(proforma), 'base64')
    const filename = `Batteriq-Proforma-${String(proforma.proformaNumber).replace(/[^\w-]/g, '')}.pdf`
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Could not generate the proforma' }, { status: 500 })
  }
}
