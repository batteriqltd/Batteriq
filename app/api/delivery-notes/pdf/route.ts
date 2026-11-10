import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateDeliveryNotePDF, type DeliveryNoteRecord } from '@/lib/delivery-note-pdf'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const docParam = searchParams.get('doc')
  if (!docParam) {
    return NextResponse.json({ error: 'Missing doc number' }, { status: 400 })
  }

  const token = docParam.startsWith('dn:') ? docParam : `dn:${docParam}`
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('ai_chat_sessions') as any)
    .select('*')
    .eq('session_token', token)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const arr = Array.isArray(data.messages) ? data.messages : [data.messages]
  const note = arr[0] as DeliveryNoteRecord | undefined
  if (!note) {
    return NextResponse.json({ error: 'Invalid document data' }, { status: 404 })
  }

  const pdfBase64 = await generateDeliveryNotePDF(note)
  const pdfBuffer = Buffer.from(pdfBase64, 'base64')
  const label = note.docType === 'installation' ? 'Installation-Completion-Note' : 'Delivery-Note'
  const filename = `Batteriq-${label}-${note.docNumber}.pdf`

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
