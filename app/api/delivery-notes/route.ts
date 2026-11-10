import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'
import {
  generateDeliveryNotePDF,
  genDocNumber,
  type DeliveryNoteRecord,
  type NoteDocType,
} from '@/lib/delivery-note-pdf'

export const dynamic = 'force-dynamic'

const TOKEN_PREFIX = 'dn:'

function unpackRow(row: {
  id: string
  session_token: string
  guest_name: string | null
  messages: unknown
  started_at: string
  last_active: string
}): DeliveryNoteRecord | null {
  const arr = Array.isArray(row.messages) ? row.messages : [row.messages]
  const payload = arr[0] as Partial<DeliveryNoteRecord> | undefined
  if (!payload || typeof payload !== 'object') return null
  const docType: NoteDocType = payload.docType === 'installation' ? 'installation' : 'delivery'
  const docNumber = payload.docNumber || row.session_token.replace(/^dn:/, '')
  return {
    id: row.id,
    docNumber,
    docType,
    lpoReference: payload.lpoReference ?? '',
    date: payload.date ?? new Date(row.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    customerName: payload.customerName ?? row.guest_name ?? '',
    customerPhone: payload.customerPhone ?? '',
    deliverySite: payload.deliverySite ?? '',
    contactPerson: payload.contactPerson ?? '',
    items: Array.isArray(payload.items) && payload.items.length > 0
      ? payload.items
      : [{ description: '', subtext: '', qtySent: '1', qtyReceived: '1' }],
    workDescription: payload.workDescription ?? '',
    worksCompleted: payload.worksCompleted ?? '',
    checks: payload.checks ?? {
      visuallyInspected: true,
      functionalChecks: true,
      customerHandover: true,
    },
    remarks: payload.remarks ?? '',
    batteriqPersonName: payload.batteriqPersonName ?? '',
    batteriqSignature: payload.batteriqSignature ?? '',
    batteriqDateTime: payload.batteriqDateTime ?? '',
    receiverName: payload.receiverName ?? '',
    receiverSignature: payload.receiverSignature ?? '',
    receiverDateTime: payload.receiverDateTime ?? '',
    status: payload.status ?? (payload.receiverSignature ? 'signed' : 'draft'),
    createdAt: payload.createdAt ?? row.started_at,
    updatedAt: payload.updatedAt ?? row.last_active,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const docParam = searchParams.get('doc') || searchParams.get('id')
  const supabase = createAdminClient()

  try {
    if (docParam) {
      const token = docParam.startsWith(TOKEN_PREFIX) ? docParam : `${TOKEN_PREFIX}${docParam}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('ai_chat_sessions') as any)
        .select('*')
        .eq('session_token', token)
        .maybeSingle()
      if (!data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      const note = unpackRow(data)
      return NextResponse.json({ note })
    }

    if (!getAdminSession()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('ai_chat_sessions') as any)
      .select('*')
      .like('session_token', `${TOKEN_PREFIX}%`)
      .order('last_active', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ notes: [], error: error.message })
    const notes = ((data ?? []) as Array<Parameters<typeof unpackRow>[0]>)
      .map(unpackRow)
      .filter((n): n is DeliveryNoteRecord => Boolean(n))

    return NextResponse.json({ notes })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load notes', notes: [] },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<DeliveryNoteRecord> & { createBoth?: boolean }
    const docType: NoteDocType = body.docType === 'installation' ? 'installation' : 'delivery'
    const nowIso = new Date().toISOString()
    const todayFormatted = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const nowDateTimeFormatted = new Date().toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const suffix = String(Math.floor(1000 + Math.random() * 9000))
    const docNumber = (body.docNumber && body.docNumber.trim()) || genDocNumber(docType, suffix)

    const buildRecord = (type: NoteDocType, num: string): DeliveryNoteRecord => ({
      id: body.id || num,
      docNumber: num,
      docType: type,
      lpoReference: (body.lpoReference ?? '').trim(),
      date: (body.date ?? '').trim() || todayFormatted,
      customerName: (body.customerName ?? '').trim() || (body.receiverName ?? '').trim() || 'Client',
      customerPhone: (body.customerPhone ?? '').trim(),
      deliverySite: (body.deliverySite ?? '').trim(),
      contactPerson: (body.contactPerson ?? '').trim() || (body.receiverName ?? '').trim(),
      items: Array.isArray(body.items) && body.items.length > 0
        ? body.items.map((it) => ({
            description: String(it.description ?? '').trim(),
            subtext: String(it.subtext ?? '').trim(),
            qtySent: String(it.qtySent ?? '1').trim(),
            qtyReceived: String(it.qtyReceived ?? it.qtySent ?? '1').trim(),
          }))
        : [{ description: '', subtext: '', qtySent: '1', qtyReceived: '1' }],
      workDescription: (body.workDescription ?? '').trim(),
      worksCompleted: (body.worksCompleted ?? '').trim(),
      checks: {
        visuallyInspected: body.checks?.visuallyInspected ?? true,
        functionalChecks: body.checks?.functionalChecks ?? true,
        customerHandover: body.checks?.customerHandover ?? true,
      },
      remarks: (body.remarks ?? '').trim(),
      batteriqPersonName: (body.batteriqPersonName ?? '').trim(),
      batteriqSignature: (body.batteriqSignature ?? '').trim(),
      batteriqDateTime: (body.batteriqDateTime ?? '').trim() || (body.batteriqPersonName ? nowDateTimeFormatted : ''),
      receiverName: (body.receiverName ?? '').trim(),
      receiverSignature: body.receiverSignature ?? '',
      receiverDateTime: (body.receiverDateTime ?? '').trim() || (body.receiverSignature || body.receiverName ? nowDateTimeFormatted : ''),
      status: body.receiverSignature || body.status === 'signed' ? 'signed' : 'draft',
      createdAt: body.createdAt || nowIso,
      updatedAt: nowIso,
    })

    const supabase = createAdminClient()
    const primaryRecord = buildRecord(docType, docNumber)

    const saveRecord = async (rec: DeliveryNoteRecord) => {
      const token = `${TOKEN_PREFIX}${rec.docNumber}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from('ai_chat_sessions') as any)
        .select('id')
        .eq('session_token', token)
        .maybeSingle()

      if (existing?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('ai_chat_sessions') as any)
          .update({
            guest_name: rec.customerName || rec.receiverName || 'Client',
            messages: [rec],
            last_active: nowIso,
          })
          .eq('id', existing.id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('ai_chat_sessions') as any).insert({
          session_token: token,
          guest_name: rec.customerName || rec.receiverName || 'Client',
          messages: [rec],
          started_at: nowIso,
          last_active: nowIso,
        })
      }
    }

    await saveRecord(primaryRecord)

    // When a client submits from the receiver form (createBoth = true),
    // automatically generate BOTH the Delivery Note and Installation Completion Note
    // with the same criteria so both are ready to download in Admin!
    let companionNote: DeliveryNoteRecord | null = null
    let companionPdf: string | null = null
    if (body.createBoth) {
      const otherType: NoteDocType = docType === 'delivery' ? 'installation' : 'delivery'
      const otherNum = genDocNumber(otherType, suffix)
      companionNote = buildRecord(otherType, otherNum)
      await saveRecord(companionNote)
      companionPdf = await generateDeliveryNotePDF(companionNote)
    }

    const pdfBase64 = await generateDeliveryNotePDF(primaryRecord)
    const label = docType === 'installation' ? 'Installation-Completion-Note' : 'Delivery-Note'

    return NextResponse.json({
      success: true,
      note: primaryRecord,
      pdf: pdfBase64,
      filename: `Batteriq-${label}-${primaryRecord.docNumber}.pdf`,
      companionNote,
      companionPdf,
      companionFilename: companionNote
        ? `Batteriq-${companionNote.docType === 'installation' ? 'Installation-Completion-Note' : 'Delivery-Note'}-${companionNote.docNumber}.pdf`
        : null,
    })
  } catch (err) {
    console.error('[delivery-notes] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save note' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  if (!getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const docParam = searchParams.get('doc')
  if (!docParam) return NextResponse.json({ error: 'Missing doc parameter' }, { status: 400 })
  const token = docParam.startsWith(TOKEN_PREFIX) ? docParam : `${TOKEN_PREFIX}${docParam}`
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('ai_chat_sessions') as any).delete().eq('session_token', token)
  return NextResponse.json({ success: true })
}
